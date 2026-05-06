module.exports = {
  apps: [
    {
      name: 'deploy-watch',
      script: 'bash',
      args: 'deploy.sh',
      cwd: '/root/dynamic-rendering-ultra-generation__vite-react',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 10000,
      restart_delay: 5000,
      kill_timeout: 30000,
      env: {
        NODE_ENV: 'production',
        NVM_DIR: '/root/.nvm',
      },
      error_file: './logs/deploy-watch-error.log',
      out_file: './logs/deploy-watch-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
