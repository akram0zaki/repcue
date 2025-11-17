// Media types for exercise demo videos (Phase 0 + R2 Migration)
// These complement the core Exercise model. Media metadata is optional and loaded at runtime.
// Security: JSON only; no dynamic code execution.

// Video format type - supported codecs
export type VideoFormat = 'webm' | 'mp4';

// Video aspect ratio identifier
export type VideoAspect = 'square' | 'portrait' | 'landscape';

// Video resolution identifier (numeric for scaling flexibility)
export type VideoResolution = '720' | '1080' | '1440' | '2160';

// Video variant metadata for a specific aspect/resolution/format combination
export type VideoVariantMeta = {
  url: string; // /media/<hash>.webm or legacy /videos/<file>.webm
  sha256?: string; // Optional full SHA256 hash for integrity verification
};

// Resolution map: resolution -> format -> variant metadata
export type ResolutionVariants = {
  [res in VideoResolution]?: {
    [format in VideoFormat]?: VideoVariantMeta;
  };
};

// Aspect map: aspect -> resolution variants
export type AspectVariants = {
  [aspect in VideoAspect]?: ResolutionVariants;
};

// Default variant descriptor (guides initial selection)
export type DefaultVariant = {
  aspect: VideoAspect;
  res: VideoResolution;
};

// Extended ExerciseMedia supporting both legacy and R2 variants
export type ExerciseMedia = {
  id: string; // matches Exercise.id
  repsPerLoop: 1 | 2; // number of reps visually represented per video loop (future-proof)
  fps: 24 | 30; // frames per second of source encode
  duration?: number; // accurate duration in seconds from video metadata (optional for backward compatibility)
  
  // Legacy video paths (backward compatibility - will be deprecated)
  video?: {
    square?: string; // /videos/<file>.mp4 1:1
    portrait?: string; // 9:16 or 3:4 asset
    landscape?: string; // 16:9 or 4:3 asset
  };
  
  // New R2-based variant structure
  variants?: AspectVariants;
  
  // Default variant recommendation
  default?: DefaultVariant;
};

export type ExerciseMediaIndex = Record<string, ExerciseMedia>;
