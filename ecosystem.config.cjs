module.exports = {
  apps: [{
    name: 'repcue',
    script: 'server.js',
    instances: 1, // Single instance for Pi 5
    autorestart: true,
    watch: false,
    max_memory_restart: '512M', // Conservative for Pi
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    // Pi-optimized settings
    node_args: '--max-old-space-size=512',
    log_file: '/var/log/pm2/repcue.log',
    error_file: '/var/log/pm2/repcue-error.log',
    out_file: '/var/log/pm2/repcue-out.log',
    time: true,
    // Health monitoring
    health_check_url: 'http://localhost:3001/health',
    // Optional: restart during low usage hours
    cron_restart: '0 4 * * *' // 4 AM daily restart
  }]
}; 