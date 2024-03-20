import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.json(),
  defaultMeta: { service: 'backend-integration' },
  transports: [new transports.Console()],
});
