use std::process::Child;
use std::sync::Mutex;

use tauri::{Manager, RunEvent};

mod secrets;

/// Restart the whole app. Used by the Settings UI to apply config changes — the
/// embedded server reads secrets/config from the keychain at startup.
#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

/// Holds the spawned backend process so it can be terminated when the app exits.
struct Backend(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            restart_app,
            secrets::get_secret,
            secrets::set_secret,
            secrets::get_managed_config,
            secrets::list_managed_keys,
        ])
        .manage(Backend(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // In development the window points at `next dev` (see `devUrl` in
            // tauri.conf.json), so no embedded server is needed. In release we
            // boot the bundled standalone server and navigate to it once ready.
            #[cfg(not(debug_assertions))]
            if let Err(error) = backend::start(app.handle()) {
                log::error!("failed to start embedded backend: {error}");
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                if let Some(backend) = app_handle.try_state::<Backend>() {
                    if let Ok(mut guard) = backend.0.lock() {
                        if let Some(child) = guard.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}

#[cfg(not(debug_assertions))]
mod backend {
    use super::Backend;
    use std::fs;
    use std::net::TcpStream;
    use std::path::PathBuf;
    use std::process::Command;
    use std::time::{Duration, Instant};

    use tauri::{AppHandle, Manager};

    /// Fixed loopback port the embedded Next.js server listens on.
    const SERVER_PORT: u16 = 38211;

    /// Boot the bundled Next.js standalone server, seeding the SQLite database on
    /// first run, then navigate the main window to it once the port is open.
    pub fn start(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let resource_dir = app.path().resource_dir()?;
        let server_dir = resource_dir.join("server");
        let seed_db = resource_dir.join("seed").join("temlet.db");

        let app_data = app.path().app_data_dir()?;
        fs::create_dir_all(&app_data)?;

        // First run: copy the migrated, empty SQLite file into a writable path.
        let db_path = app_data.join("temlet.db");
        if !db_path.exists() && seed_db.exists() {
            fs::copy(&seed_db, &db_path)?;
        }

        // Default location for rendered assets (overridable via user config).
        let working_dir = app_data.join("working");
        fs::create_dir_all(&working_dir)?;

        let mut command = Command::new(resolve_node(&resource_dir));
        command
            .arg("server.js")
            .current_dir(&server_dir)
            .env("NODE_ENV", "production")
            .env("PORT", SERVER_PORT.to_string())
            .env("HOSTNAME", "127.0.0.1")
            .env("DATABASE_URL", format!("file:{}", db_path.display()))
            .env("WORKING_DIRECTORY", working_dir.display().to_string())
            // Upgrade the existing DB in place on startup (see instrumentation.ts).
            .env("TEMLET_APPLY_MIGRATIONS", "1")
            .env(
                "TEMLET_MIGRATIONS_DIR",
                server_dir.join("prisma").join("migrations"),
            )
            // Drive the render monitor in-process (see instrumentation.ts).
            .env("TEMLET_RUN_MONITOR", "1")
            // Per-install cron secret (generated + persisted in the keychain).
            .env("CRON_SECRET", super::secrets::cron_secret());

        // Layer in user config: the legacy temlet.env file first, then the
        // keychain (which the Settings UI writes), so the keychain is authoritative.
        apply_user_env(app, &mut command);
        apply_keychain_env(&mut command);

        // Point the crawler at the bundled Chromium and the YouTube thumbnail
        // extractor at the bundled ffmpeg, so both work without separate installs.
        let chromium_dir = resource_dir.join("chromium");
        if let Ok(relative) = fs::read_to_string(chromium_dir.join("executable.txt")) {
            let exe = chromium_dir.join(relative.trim());
            if exe.exists() {
                command.env("PUPPETEER_EXECUTABLE_PATH", exe);
            }
        }
        let ffmpeg = server_dir
            .join("node_modules")
            .join("ffmpeg-static")
            .join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" });
        if ffmpeg.exists() {
            command.env("FFMPEG_PATH", ffmpeg);
        }

        let child = command.spawn()?;
        if let Some(backend) = app.try_state::<Backend>() {
            if let Ok(mut guard) = backend.0.lock() {
                *guard = Some(child);
            }
        }

        // Wait for the server off the main thread, then point the window at it.
        let handle = app.clone();
        std::thread::spawn(move || {
            if wait_for_port(SERVER_PORT, Duration::from_secs(60)) {
                if let Some(window) = handle.get_webview_window("main") {
                    if let Ok(url) = format!("http://127.0.0.1:{SERVER_PORT}/").parse() {
                        let _ = window.navigate(url);
                    }
                }
            } else {
                log::error!("embedded server did not become ready within 60s");
            }
        });

        Ok(())
    }

    /// Resolve a `node` executable. Prefer the Node runtime bundled with the app
    /// (so it runs on a machine with no Node installed and regardless of PATH),
    /// then an override env var, common install locations, and finally PATH.
    fn resolve_node(resource_dir: &std::path::Path) -> PathBuf {
        let exe = if cfg!(windows) { "node.exe" } else { "node" };
        let bundled = resource_dir.join("runtime").join(exe);
        if bundled.exists() {
            return bundled;
        }

        if let Ok(path) = std::env::var("TEMLET_NODE_PATH") {
            let candidate = PathBuf::from(path);
            if candidate.exists() {
                return candidate;
            }
        }

        for candidate in [
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node",
        ] {
            let path = PathBuf::from(candidate);
            if path.exists() {
                return path;
            }
        }

        PathBuf::from("node")
    }

    /// Merge `KEY=VALUE` lines from `<app-config>/temlet.env` into the child
    /// process environment. Lines that are blank or start with `#` are ignored.
    fn apply_user_env(app: &AppHandle, command: &mut Command) {
        let Ok(config_dir) = app.path().app_config_dir() else {
            return;
        };
        let Ok(contents) = fs::read_to_string(config_dir.join("temlet.env")) else {
            return;
        };

        for line in contents.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, value)) = line.split_once('=') {
                let key = key.trim();
                if !key.is_empty() {
                    command.env(key, value.trim().trim_matches('"'));
                }
            }
        }
    }

    /// Inject keychain-stored config (API keys, OAuth creds, working dir) into
    /// the server environment. Overrides the legacy temlet.env file.
    fn apply_keychain_env(command: &mut Command) {
        for key in super::secrets::MANAGED_KEYS {
            if let Some(value) = super::secrets::read(key).filter(|v| !v.is_empty()) {
                command.env(key, value);
            }
        }
    }

    /// Poll a loopback port until it accepts connections or the timeout elapses.
    fn wait_for_port(port: u16, timeout: Duration) -> bool {
        let addr = format!("127.0.0.1:{port}");
        let start = Instant::now();
        while start.elapsed() < timeout {
            if TcpStream::connect(&addr).is_ok() {
                return true;
            }
            std::thread::sleep(Duration::from_millis(250));
        }
        false
    }
}
