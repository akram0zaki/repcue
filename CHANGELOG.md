# RepCue - Fitness Tracking App Changelog

## [Unreleased] - PM2 Production Deployment Support

### Added
- **Express Server**: Custom Express server (`server.js`) for production deployment
- **PM2 Integration**: Complete PM2 ecosystem configuration for Raspberry Pi 5
- **Health Monitoring**: `/health` endpoint for application monitoring
- **Security Headers**: Enhanced security headers for production environment
- **Compression**: Gzip compression middleware for better performance
- **Graceful Shutdown**: Proper signal handling for clean application shutdown
- **NPM Scripts**: Added PM2 management scripts (`pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`)
- **Nginx Configuration**: Production-ready nginx configuration with proxy setup
- **Cloudflare Tunnel**: Complete setup guide for `repcue.azprojects.net` deployment
- **Performance Optimization**: Pi-specific memory limits and restart policies

### Changed
- **Package.json**: Added Express and compression dependencies
- **Documentation**: Comprehensive PM2 deployment section in README
- **Gitignore**: Added PM2 and coverage-related ignores

### Technical Details
- Express server listens on port 3001
- Optimized for single-instance deployment on Raspberry Pi
- 512MB memory limit with automatic restart
- Daily restart at 4 AM for maintenance
- Comprehensive logging with timestamps
- Static file caching (1 day) for performance

## [2025-06-29] - Initial commit

### Fixed


### Added
- Created application skeleton and navigation logic.
- Created full implementation of the Timer and Settings pages.
- Optimized for mobile viewing.
