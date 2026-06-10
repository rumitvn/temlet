//! Secret + config storage backed by the OS keychain (macOS Keychain / Windows
//! Credential Manager) via the `keyring` crate.
//!
//! Replaces hand-editing the plaintext `temlet.env` file: the Settings UI calls
//! the Tauri commands here, and the desktop shell loads these values into the
//! embedded server's environment on startup (see `lib.rs`).

use std::collections::HashMap;

use keyring::Entry;

/// Keychain service name (namespaces our entries).
const SERVICE: &str = "com.rumitx.temlet";

/// Config keys the desktop app manages. Stored in the keychain and injected into
/// the embedded server's environment on startup. `WORKING_DIRECTORY` is a path
/// (not strictly secret) but is managed here for a single source of config.
pub const MANAGED_KEYS: &[&str] = &[
    "OPENAI_API_KEY",
    "GROK_API_KEY",
    "NEXRENDER_SERVER_URL",
    "NEXRENDER_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REDIRECT",
    "YOUTUBE_TOKEN_JSON",
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "TIKTOK_REDIRECT_URI",
    "WORKING_DIRECTORY",
];

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

/// Read a stored value, or None if unset / unavailable.
pub fn read(key: &str) -> Option<String> {
    entry(key).ok().and_then(|e| match e.get_password() {
        Ok(value) => Some(value),
        Err(_) => None,
    })
}

/// Store a value; an empty string clears the entry.
pub fn write(key: &str, value: &str) -> Result<(), String> {
    let entry = entry(key)?;
    if value.is_empty() {
        // Treat clearing as success whether or not an entry existed.
        let _ = entry.delete_credential();
        return Ok(());
    }
    entry.set_password(value).map_err(|e| e.to_string())
}

/// The per-install cron secret, generated and persisted on first use so it is
/// never a shared hardcoded value. Only used by the release backend.
#[cfg_attr(debug_assertions, allow(dead_code))]
pub fn cron_secret() -> String {
    if let Some(existing) = read("CRON_SECRET").filter(|v| !v.is_empty()) {
        return existing;
    }
    let generated = uuid::Uuid::new_v4().to_string();
    let _ = write("CRON_SECRET", &generated);
    generated
}

// --- Tauri commands (invoked from the Settings UI) ---

#[tauri::command]
pub fn get_secret(key: String) -> String {
    read(&key).unwrap_or_default()
}

#[tauri::command]
pub fn set_secret(key: String, value: String) -> Result<(), String> {
    write(&key, &value)
}

/// Return every managed key that currently has a value (used to pre-fill the
/// Settings form). Secret values are returned to the local webview only.
#[tauri::command]
pub fn get_managed_config() -> HashMap<String, String> {
    MANAGED_KEYS
        .iter()
        .filter_map(|key| read(key).map(|value| (key.to_string(), value)))
        .collect()
}

#[tauri::command]
pub fn list_managed_keys() -> Vec<String> {
    MANAGED_KEYS.iter().map(|key| key.to_string()).collect()
}
