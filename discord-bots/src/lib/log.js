export function createLogger(scope) {
  const line = (level, args) => console[level](`[${new Date().toISOString()}] [${scope}]`, ...args);
  return {
    info: (...args) => line('log', args),
    warn: (...args) => line('warn', args),
    error: (...args) => line('error', args),
  };
}
