import type { Exercise } from '../../types';
import { ExerciseCategory, ExerciseType } from '../../types';

/**
 * Quick-and-dirty Aikido demo catalog (for trainer preview)
 * - Uses a single category (FULL_BODY) for all techniques to avoid enum edits.
 * - Differentiates Kyu via tags: "kyu:6" ... "kyu:1".
 * - Add richer metadata and a proper Syllabus layer over the weekend.
 *
 * IMPORTANT: This file is intentionally minimal to *work today*
 * without changing core types or localization keys.
 */

function createExercise(exerciseData: Omit<Exercise, 'updated_at' | 'created_at' | 'deleted' | 'version' | 'dirty'> & { id: string }): Exercise {
  return {
    ...exerciseData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0
  };
}

export const AIKIDO_EXERCISES: Exercise[] = [
  // --- KYU 6 (fundamentals) ---
  createExercise({
    id: 'ukemi-basics',
    name: 'Ukemi Basics (Mae/Ushiro)',
    description: 'Forward/backward breakfalls and safe rolling fundamentals.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 10,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:6','stance:tachi','ukemi'],
    benefits: 'Builds confidence, safety, and body coordination.',
    limitations: 'Avoid if you have acute neck, shoulder, or back injuries.',
    best_timing: 'Warm-up at the start of class.',
    suggested_combinations: ['ai-tai-sabaki','ai-shikko'],
    notes: 'Focus on soft landings, chin tucked, smooth breathing.',
    exercise_references: []
  }),
  createExercise({
    id: 'tai-sabaki',
    name: 'Tai Sabaki (Irimi/Tenkan)',
    description: 'Stepping body movement drills: irimi (entering) and tenkan (turning).',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'aikido',
    default_duration: 60,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:6','stance:tachi','footwork'],
    benefits: 'Improves positioning, timing, and balance.',
    limitations: 'Mind knee alignment; avoid twisting on a sticky mat.',
    best_timing: 'Early in practice to set movement quality.',
    suggested_combinations: ['ai-ukemi-basics','ai-ikkyo-omote'],
    notes: 'Emphasize hip/center movement, not just feet.',
    exercise_references: []
  }),
  createExercise({
    id: 'shikko',
    name: 'Shikkō (Knee-walking)',
    description: 'Suwari-waza locomotion for hip/leg conditioning and posture.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'aikido',
    default_duration: 45,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:6','stance:suwari','conditioning'],
    benefits: 'Strengthens hips/posture and develops center movement.',
    limitations: 'Use knee pads if needed; avoid pain on kneecaps.',
    best_timing: 'After warm-up, before suwari-waza techniques.',
    suggested_combinations: ['ai-ikkyo-omote'],
    notes: 'Stay tall; move from the hips, not shoulders.',
    exercise_references: []
  }),

  // --- KYU 5 ---
  createExercise({
    id: 'ikkyo-omote',
    name: 'Ikkyo (Omote) - Shōmen-uchi',
    description: 'First control, entering form, from frontal strike.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: true,
    tags: ['aikido','kyu:5','kyu:6','stance:tachi','attack:shomen-uchi','waza:tachi-waza','variant:omote'],
    benefits: 'Kuzushi, posture control, and basic pin transitions.',
    limitations: 'Maintain shoulder safety for both nage and uke.',
    best_timing: 'After tai sabaki drills.',
    suggested_combinations: ['ai-ikkyo-ura','ai-nikyo-omote'],
    notes: 'Keep elbows heavy; control line through uke’s center.',
    exercise_references: ['https://www.youtube.com/watch?v=p-vZmfcqFus']
  }),
  createExercise({
    id: 'ikkyo-ura',
    name: 'Ikkyo (Ura) - Shōmen-uchi',
    description: 'First control, turning form, from frontal strike.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: true,
    tags: ['aikido','kyu:5','stance:tachi','attack:shomen-uchi','variant:ura'],
    benefits: 'Blending and off-axis control with tenkan.',
    limitations: 'Avoid cranking uke’s shoulder; move their whole frame.',
    best_timing: 'Paired with omote version for contrast.',
    suggested_combinations: ['ai-tai-sabaki','ai-ikkyo-omote'],
    notes: 'Lead with hips; hand path traces uke’s line.',
    exercise_references: ['https://www.youtube.com/watch?v=cXDxOsopSzg']
  }),
  createExercise({
    id: 'nikyo-omote',
    name: 'Nikyo (Omote) - Katate-dori',
    description: 'Second control wrist rotation from same-side wrist grab.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:5','stance:tachi','attack:katate-dori','variant:omote'],
    benefits: 'Wrist spiral control, connection, and off-balance.',
    limitations: 'Be gentle on wrists; tap early.',
    best_timing: 'After ikkyo to build control progression.',
    suggested_combinations: ['ai-nikyo-ura','ai-sankyo-omote'],
    notes: 'Keep forearms connected; rotate through center.',
    exercise_references: []
  }),

  // --- KYU 4 ---
  createExercise({
    id: 'sankyo-omote',
    name: 'Sankyo (Omote) - Katate-dori',
    description: 'Third control spiraling up and in from same-side wrist grab.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:4','stance:tachi','attack:katate-dori','variant:omote'],
    benefits: 'Forearm rotation, posture control, pin transition.',
    limitations: 'Mind uke’s elbow/shoulder line; avoid compression.',
    best_timing: 'With nikyo to compare spiral directions.',
    suggested_combinations: ['ai-yonkyo-omote','ai-kotegaeshi'],
    notes: 'Lead with center, keep structure.',
    exercise_references: []
  }),
  createExercise({
    id: 'yonkyo-omote',
    name: 'Yonkyo (Omote) - Katate-dori',
    description: 'Fourth control with forearm pressure point control.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:4','stance:tachi','attack:katate-dori','variant:omote'],
    benefits: 'Precision control, pain compliance, posture breaking.',
    limitations: 'High sensitivity—train slowly; watch for numbness.',
    best_timing: 'After sankyo; same entry, different finish.',
    suggested_combinations: ['ai-sankyo-omote'],
    notes: 'Placement over radial nerve; keep forearm alignment.',
    exercise_references: []
  }),
  createExercise({
    id: 'kotegaeshi',
    name: 'Kotegaeshi - Katate-dori',
    description: 'Wrist turn-out throw from wrist grab.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:4','stance:tachi','attack:katate-dori'],
    benefits: 'Rotation, timing, and safe projection mechanics.',
    limitations: 'Control uke’s fall path; protect their elbow/shoulder.',
    best_timing: 'Pair with nikyo to compare inside/outside spirals.',
    suggested_combinations: ['ai-nikyo-omote'],
    notes: 'Keep elbow down; throw through the line, not the hand.',
    exercise_references: []
  }),

  // --- KYU 3 ---
  createExercise({
    id: 'shihonage',
    name: 'Shihōnage - Ryōte-dori',
    description: 'Four-direction throw from two-hand grab.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:3','stance:tachi','attack:ryote-dori'],
    benefits: 'Axis control, shoulder line management, safe projection.',
    limitations: 'Respect uke’s shoulder; avoid hyperextension.',
    best_timing: 'Mid-class after sufficient warm-up.',
    suggested_combinations: ['ai-iriminage','ai-tenchinage'],
    notes: 'Turn around your center; don’t muscle the arms.',
    exercise_references: []
  }),
  createExercise({
    id: 'iriminage',
    name: 'Iriminage - Yokomen-uchi',
    description: 'Entering throw from diagonal strike.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: true,
    tags: ['aikido','kyu:3','stance:tachi','attack:yokomen-uchi'],
    benefits: 'Blending on the blind side; posture take.',
    limitations: 'Neck safety for uke; align head control gently.',
    best_timing: 'With shihonage for contrast of lines.',
    suggested_combinations: ['ai-shihonage'],
    notes: 'Cut the line with your center; keep spine tall.',
    exercise_references: ['https://www.youtube.com/watch?v=ePgUUVuvdb4']
  }),
  createExercise({
    id: 'tenchinage',
    name: 'Tenchinage - Katate-dori',
    description: 'Heaven-earth throw splitting uke’s structure.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:3','stance:tachi','attack:katate-dori'],
    benefits: 'Vertical separation, timing, and whole-body movement.',
    limitations: 'Watch lower back; use legs, not arms.',
    best_timing: 'With iriminage to study vertical vs. horizontal lines.',
    suggested_combinations: ['ai-iriminage'],
    notes: 'Hands separate from the center, not the shoulders.',
    exercise_references: []
  }),

  // --- KYU 2 ---
  createExercise({
    id: 'kokyunage',
    name: 'Kokyunage - Various grips',
    description: 'Breath-power throws emphasizing timing and connection.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'aikido',
    default_reps: 8,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:2','stance:tachi','theme:timing'],
    benefits: 'Develops relaxed power and responsive blending.',
    limitations: 'High variance—choose safe fall options.',
    best_timing: 'Late class once bodies are warm.',
    suggested_combinations: ['ai-iriminage','ai-tenchinage'],
    notes: 'Lead with connection, not force.',
    exercise_references: []
  }),
  createExercise({
    id: 'jiyuwaza-2',
    name: 'Jiyū-waza (Free practice) - Level 2',
    description: 'Light, controlled free-form application of studied techniques.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'aikido',
    default_duration: 120,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:2','stance:mixed','sparring:light'],
    benefits: 'Integration, timing, and adaptive footwork.',
    limitations: 'Keep intensity appropriate; focus on safety.',
    best_timing: 'End of class as integration.',
    suggested_combinations: ['ai-kokyunage'],
    notes: 'Agree intensity with partner before starting.',
    exercise_references: []
  }),

  // --- KYU 1 ---
  createExercise({
    id: 'kaeshiwaza-intro',
    name: 'Kaeshi-waza (Counters) - Intro',
    description: 'Foundational counters to common entries (safely explored).',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'aikido',
    default_duration: 120,
    is_favorite: false,
    has_video: true,
    tags: ['aikido','kyu:1','stance:mixed','theme:counters'],
    benefits: 'Awareness of vulnerabilities and recovery options.',
    limitations: 'Keep control; counters escalate risk quickly.',
    best_timing: 'Only with experienced partners; end of session.',
    suggested_combinations: ['ai-iriminage','ai-shihonage'],
    notes: 'Agree on frames to stop/reverse; prioritize ukemi.',
    exercise_references: ['https://www.youtube.com/shorts/CUo0llixW1A']
  }),
  createExercise({
    id: 'jiyuwaza-1',
    name: 'Jiyū-waza (Free practice) - Level 1',
    description: 'Structured free practice with predefined attacks/entries.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'aikido',
    default_duration: 180,
    is_favorite: false,
    has_video: false,
    tags: ['aikido','kyu:1','stance:mixed','sparring:structured'],
    benefits: 'Stress-tests timing, distance, and composure.',
    limitations: 'Fatigue management; reduce intensity if form degrades.',
    best_timing: 'Capstone segment at the end of class.',
    suggested_combinations: ['ai-kaeshiwaza-intro'],
    notes: 'Rotate partners to vary rhythm and size.',
    exercise_references: []
  })
];
