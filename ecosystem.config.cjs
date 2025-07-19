module.exports = {
  apps : [
    {
      name: "nexrender-server",
      script: "D:/development/nexrender-server-win64.exe",
      cwd: "C:/Users/youruser/Documents/minimate/nexrender-manager",
      interpreter: "none",
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "nexrender-worker-1",
      script: "D:/development/nexrender-worker-win64.exe",
      cwd: "C:/Users/youruser/Documents/minimate/nexrender-manager",
      interpreter: "none",
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "nexrender-worker-2",
      script: "D:/development/nexrender-worker-win64.exe",
      cwd: "C:/Users/youruser/Documents/minimate/nexrender-manager",
      interpreter: "none",
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "nextjs-dev",
      script: "start-nextjs.js",
      cwd: "C:/Users/youruser/Documents/minimate/nexrender-manager",
      interpreter: "node",
      watch: true,
      ignore_watch: ["node_modules", ".next"],
      env: {
        NODE_ENV: "development",
        PORT: "3001"
      }
    },
    {
      name: "monitor-script",
      script: "scripts/monitor.js",
      cwd: "C:/Users/youruser/Documents/minimate/nexrender-manager",
      interpreter: "node",
      watch: false,
      ignore_watch: ["node_modules"],
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};