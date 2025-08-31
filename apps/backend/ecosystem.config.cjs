module.exports = {
  apps: [{
    name: "repcue",
  // Ensure PM2 runs from the backend folder so script paths resolve correctly on deploy hosts
  cwd: __dirname,
  script: "./server.js",
    instances: 1, // Single instance for Pi 5
    autorestart: true,
    watch: false,
    max_memory_restart: "512M", // Conservative for Pi
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    env_development: {
      NODE_ENV: "development",
      PORT: 3002
    },
    // Pi-optimized settings
    node_args: "--max-old-space-size=512",
    time: true,
    // Health monitoring
    health_check_url: "http://localhost:3001/health",
    // Optional: restart during low usage hours
    cron_restart: "0 4 * * *" // 4 AM daily restart
  }]
};
