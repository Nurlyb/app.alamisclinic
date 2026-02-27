module.exports = {
  apps: [
    {
      name: 'alamis-clinic',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/app.alamisclinic',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
