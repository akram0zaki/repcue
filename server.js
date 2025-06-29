import express from 'express';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Cloudflare tunnel
app.set('trust proxy', true);

// Compression for better Pi performance
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static files with caching for Pi optimization
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true
}));

// Handle React Router (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('RepCue Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏋️‍♀️ RepCue running on http://localhost:${PORT}`);
  console.log(`📱 Access from network: http://YOUR_PI_IP:${PORT}`);
  console.log(`🌐 Public access: https://repcue.azprojects.net`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 RepCue shutting down gracefully...');
  server.close(() => {
    console.log('✅ RepCue server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 RepCue shutting down gracefully...');
  server.close(() => {
    console.log('✅ RepCue server closed');
    process.exit(0);
  });
});

export default app; 