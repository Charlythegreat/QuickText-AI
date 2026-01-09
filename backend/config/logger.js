/**
 * Winston Logger Configuration
 * 
 * Provides structured logging with different transports based on environment.
 * 
 * @module config/logger
 */

const winston = require('winston');
const config = require('./index');

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.env === 'production' ? jsonFormat : customFormat,
  defaultMeta: { service: 'quicktext-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.env === 'production' 
        ? jsonFormat 
        : winston.format.combine(
            winston.format.colorize(),
            customFormat
          )
    })
  ]
});

// Add file transports in production
if (config.env === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Add HTTP level for request logging
logger.http = (message, meta) => {
  logger.log('http', message, meta);
};

module.exports = logger;
