/**
 * QuickText AI Backend Server
 * 
 * Express server providing AI text generation API for the QuickText browser extension.
 * 
 * @module server
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./config/logger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// =============================================================================
// App Initialization
// =============================================================================

const app = express();

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// =============================================================================
// Request Parsing
// =============================================================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// =============================================================================
// Request Logging
// =============================================================================

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// =============================================================================
// Health Check
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env
  });
});

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/v1', routes);

// =============================================================================
// Error Handling
// =============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

const PORT = config.port;
const HOST = config.host;

const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 QuickText AI Backend running on http://${HOST}:${PORT}`);
  logger.info(`📝 Environment: ${config.env}`);
  logger.info(`🤖 LLM Provider: ${config.llm.provider}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
