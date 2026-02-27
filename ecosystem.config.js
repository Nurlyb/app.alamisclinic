module.exports = {
  apps: [
    {
      name: 'alamis-clinic',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/app.alamisclinic',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/app.alamisclinic/logs/error.log',
      out_file: '/var/www/app.alamisclinic/logs/out.log',
      log_file: '/var/www/app.alamisclinic/logs/combined.log',
      time: true,
    },
  ],
};
