import { DEBUG } from '../config/features'

type LogFn = (...args: unknown[]) => void

export interface Logger {
  log: LogFn
  info: LogFn
  debug: LogFn
  warn: LogFn
  error: LogFn
}

const logger: Logger = {
  log: (...args) => {
    if (DEBUG) console.log(...args)
  },
  info: (...args) => {
    if (DEBUG) console.info(...args)
  },
  debug: (...args) => {
    if (DEBUG) console.debug(...args)
  },
  warn: (...args) => {
    if (DEBUG) console.warn(...args)
  },
  error: (...args) => {
    // Always log errors; avoid sensitive data in production
    console.error(...args)
  },
}

export default logger
