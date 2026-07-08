module.exports = {
  apps: [
    {
      name: "xpressprofx-api",
      script: "artifacts/api-server/dist/index.mjs",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      error_file: "/var/log/pm2/xpressprofx-error.log",
      out_file: "/var/log/pm2/xpressprofx-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
