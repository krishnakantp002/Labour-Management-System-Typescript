const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
};

function timestamp(): string {
  return new Date().toISOString();
}

const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`${colors.blue}[INFO]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`${colors.gray}[DEBUG] ${timestamp()} ${message}${colors.reset}`, ...args);
    }
  },

  success: (message: string, ...args: unknown[]) => {
    console.log(`${colors.green}[OK]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },
};

export default logger;
