module.exports = {
  apps: [{
    name: 'quicktext-api',
    script: 'server.js',
    cwd: '/app/backend',
    
    // Cluster mode for multi-core
    instances: 'max',
    exec_mode: 'cluster',
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    time: true,
    
    // Process management
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    
    // Watch (development only)
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    
    // Source maps
    source_map_support: true
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:Charlythegreat/QuickText-AI.git',
      path: '/var/www/quicktext',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
