// Media types for exercise demo videos (Phase 0)
// These complement the core Exercise model. Media metadata is optional and loaded at runtime.
// Security: JSON only; no dynamic code execution.
export type ExerciseMedia = {
  id: string; // matches Exercise.id
  repsPerLoop: 1 | 2; // number of reps visually represented per video loop (future-proof)
  fps: 24 | 30; // frames per second of source encode
  video: {
    square?: string; // /videos/<file>.mp4 1:1
    portrait?: string; // 9:16 or 3:4 asset
    landscape?: string; // 16:9 or 4:3 asset
  };
};

export type ExerciseMediaIndex = Record<string, ExerciseMedia>;
