import winston from 'winston';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

const customFormat = printf(({ level, message, timestamp, service }) => {
  return `${timestamp} [${service}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'llm-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(json())
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(json())
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      customFormat
    )
  }));
} else {
  logger.add(new winston.transports.Console({
    format: combine(json())
  }));
}

export default logger;