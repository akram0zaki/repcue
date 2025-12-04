// Import DEBUG directly to avoid circular dependency with features.ts
// (features.ts -> nativeCapabilities.ts -> logger.ts -> features.ts)
// We inline the DEBUG value here to break the cycle
const DEBUG = import.meta.env.DEV || (typeof window !== 'undefined' && (window as Window & { __DEBUG__?: boolean }).__DEBUG__ === true);

type LogFn = (...args: unknown[]) => void

export interface Logger {
  log: LogFn
  info: LogFn
  debug: LogFn
  warn: LogFn
  error: LogFn
}

// List of log message patterns to suppress for reduced verbosity
const SUPPRESSED_PATTERNS = [
  // Video-related verbose logs
  /Query result:/,
  /Found video file with data:/,
  /Custom video URL resolved:/,
  /Successfully created blob URL/,
  /Video loaded successfully:/,
  /EnrichVideo.*Starting/,
  /EnrichVideo.*Found video files:/,
  /EnrichVideo.*Active video files/,
  /EnrichVideo.*Enriching exercise/,
  /EnrichVideo.*Enrichment complete/,
  /VideoFile.*Querying for video file/,
  /ResolveVideo.*Resolving blob/,
  /VideoThumbnail.*Resolving custom/,
  /VideoThumbnail.*Validating blob URL/,
  /Filter state saved:/,

  // Sync-related verbose logs
  /\[sync:v2\].*collectDirtyBatch/,
  /\[sync:v2\].*Converting File object/,
  /\[sync:v2\].*File converted to byte array/,
  /\[sync:v2\].*callEdge start batch/,
  /\[sync:v2\].*tables=/,
  /\[sync:v2\].*found \d+ dirty records/,
  /\[sync:v2\].*collectDirty done/,
  /\[sync:v2\].*Correlation ID:/,

  // Storage service verbose logs
  /\[VideoFile\].*Storing file directly/,
  /\[VideoFile\].*File details:/,
  /\[VideoFile\].*About to save video file/,
  /\[VideoFile\].*Table exists check:/,
  /\[VideoFile\].*Put operation result:/,
  /\[VideoFile\].*Verification query:/,
  /\[VideoFile\].*Video file saved to IndexedDB successfully/,
  /\[Debug\].*Database version:/,
  /\[Debug\].*Available tables:/,
  /\[Debug\].*Video files table schema:/,
  /\[Debug\].*Current video files count:/,

  // General repetitive logs
  /getInstance: Returning existing.*instance/,
  /Auth state changed: SIGNED_IN/,
  /Starting delayed post-authentication sync/,
  /Post-authentication sync completed/,
];

// Check if a log message should be suppressed
const shouldSuppressLog = (message: string): boolean => {
  return SUPPRESSED_PATTERNS.some(pattern => pattern.test(message));
};

const logger: Logger = {
  log: (...args) => {
    if (DEBUG) {
      const message = args.join(' ');
      if (!shouldSuppressLog(message)) {
        console.log(...args);
      }
    }
  },
  info: (...args) => {
    if (DEBUG) {
      const message = args.join(' ');
      if (!shouldSuppressLog(message)) {
        console.info(...args);
      }
    }
  },
  debug: (...args) => {
    if (DEBUG) {
      const message = args.join(' ');
      if (!shouldSuppressLog(message)) {
        console.debug(...args);
      }
    }
  },
  warn: (...args) => {
    // Always log warnings; they indicate recoverable issues that need attention
    console.warn(...args)
  },
  error: (...args) => {
    // Always log errors; avoid sensitive data in production
    console.error(...args)
  },
}

export default logger
