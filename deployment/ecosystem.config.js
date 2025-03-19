module.exports = {
  apps: [{
    name: 'backend',
    script: '/var/www/app/backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}; 