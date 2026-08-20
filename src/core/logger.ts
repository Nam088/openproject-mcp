import pc from 'picocolors';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  raw(message: string, newline?: boolean): void;
}

function formatPrefix(level: string, colorFn: (s: string) => string): string {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  return `${pc.dim(timestamp)} ${colorFn(`[${level}]`)}`;
}

export const logger: Logger = {
  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      process.stderr.write(
        `${formatPrefix('DEBUG', pc.magenta)} ${message} ${args.length ? JSON.stringify(args) : ''}\n`
      );
    }
  },

  info(message: string, ...args: unknown[]): void {
    process.stderr.write(
      `${formatPrefix('INFO', pc.cyan)} ${message} ${args.length ? JSON.stringify(args) : ''}\n`
    );
  },

  success(message: string, ...args: unknown[]): void {
    process.stderr.write(
      `${formatPrefix('SUCCESS', pc.green)} ${message} ${args.length ? JSON.stringify(args) : ''}\n`
    );
  },

  warn(message: string, ...args: unknown[]): void {
    process.stderr.write(
      `${formatPrefix('WARN', pc.yellow)} ${message} ${args.length ? JSON.stringify(args) : ''}\n`
    );
  },

  error(message: string, ...args: unknown[]): void {
    process.stderr.write(
      `${formatPrefix('ERROR', pc.red)} ${message} ${args.length ? JSON.stringify(args) : ''}\n`
    );
  },

  raw(message: string, newline = true): void {
    process.stderr.write(`${message}${newline ? '\n' : ''}`);
  },
};
