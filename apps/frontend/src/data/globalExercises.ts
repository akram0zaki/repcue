import type { GlobalExercise } from '../types';
import { ExerciseType } from '../types';

/**
 * Global Exercise Repository
 * 
 * This file contains all unique exercises in a catalog-agnostic format.
 * Exercises are linked to catalogs via the CatalogMembership records.
 * 
 * Total exercises: 87
 * 
 * Migration notes:
 * - Migrated from 5 catalog-specific files
 * - 7 duplicate exercises resolved (General Fitness version used as canonical)
 * - catalogId field removed (exercises are now global)
 * - tags split into base_tags (universal) and catalog_tags (in memberships)
 * 
 * Canonical duplicates (General Fitness version):
 * - glute-bridges, lunges, calf-raises, cat-cow
 * - butt-kicks, high-knees, single-leg-stand
 */

/**
 * Helper function to create a global exercise with default sync metadata
 */
function createGlobalExercise(
  exerciseData: Omit<
    GlobalExercise,
    'updated_at' | 'created_at' | 'deleted' | 'version' | 'dirty' | 'op' | 'synced_at' | 'owner_id'
  > & { id: string }
): GlobalExercise {
  return {
    ...exerciseData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: undefined,
    synced_at: undefined,
    owner_id: undefined
  };
}

/**
 * All global exercises
 */
export const GLOBAL_EXERCISES: GlobalExercise[] = [
createGlobalExercise({
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line, supported by forearms and toes',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Beginner-friendly: 30 seconds (research shows 20-60s range)
    is_favorite: false,
    has_video: true,
    muscle_groups: ['core', 'abs', 'shoulders'],
    base_tags: ['isometric', 'stability'],
    benefits: 'Strengthens core muscles (abs, obliques, etc.), helping to protect the spine and improve posture. Also convenient with no equipment needed, and builds stability for everyday movements.',
    limitations: 'Isometric holds beyond ~2 minutes yield diminishing returns. Poor form (sagging hips or shoulders) can cause pain. People with high blood pressure should avoid very long plank holds as they can raise blood pressure. Modify if you have wrist or shoulder issues (drop to knees or use an incline).',
    best_timing: 'Can be done at the end of a workout or as a quick core routine. Planking 2–4 times a week is effective. Also useful as a core activation during warm-ups or even daily during breaks:.',
    suggested_combinations: ['side-plank', 'dead-bug'],
    notes: 'Maintain a straight line from head to heels (no sagging hips). Breathe steadily and engage your abs and glutes throughout. Start with shorter holds (e.g., 20–30 seconds) and increase gradually.',
    exercise_references: ['Cleveland Clinic – Plank Benefits; https://health.clevelandclinic.org/plank-exercise-benefits', 'Harvard Health – Plank Exercise Tips; https://www.health.harvard.edu/blog/straight-talk-on-planking-2019111318304']
  }),

createGlobalExercise({
    id: 'side-plank',
    name: 'Side Plank',
    description: 'Hold your body sideways, supported by one forearm',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20, // Harder than regular plank, shorter duration
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core', 'obliques', 'shoulders'],
    base_tags: ['isometric', 'obliques'],
    benefits: 'Emphasizes the oblique muscles and lateral core stability. Helps stabilize the spine and address side-to-side muscle imbalances. Also improves shoulder and hip endurance on each side.',
    limitations: 'Puts more pressure on one shoulder – if you have shoulder pain, start on your knees or avoid. Keep hips from dropping; a weak core may make it hard to hold, so build up gradually. Avoid if you feel sharp shoulder or arm pain.',
    best_timing: 'Include in core workouts after mastering the basic plank. Often done after regular planks to further engage the obliques. It can be added to a yoga or Pilates routine as well.',
    suggested_combinations: ['plank', 'dead-bug'],
    notes: 'Keep body in one line without leaning forward or back. You can drop the bottom knee for a simpler modification. Press the forearm firmly into the floor and don’t let the supporting shoulder collapse.',
    exercise_references: ['Cleveland Clinic – Side Plank Benefits; https://health.clevelandclinic.org/plank-exercise-benefits', 'Healthline – Side Plank Safety; https://www.healthline.com/health/side-plank']
  }),

createGlobalExercise({
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    description: 'Alternate bringing knees to chest in plank position',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // High intensity cardio movement
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core', 'shoulders', 'legs', 'cardio'],
    base_tags: ['dynamic', 'cardio'],
    benefits: 'Full-body movement that elevates your heart rate, improving cardiovascular fitness. Strengthens core and shoulders (holding plank position) and legs (due to rapid knee drives). Regular practice can enhance agility and coordination.',
    limitations: 'High-impact on wrists and toes – use a mat or incline if wrists hurt. Keep back flat; if hips pike up or sag, slow down. Avoid if you have uncontrolled lower back or shoulder pain. Those with knee issues should step instead of jump to reduce impact.',
    best_timing: 'Great in HIIT or circuit training as a cardio interval. Often used in warm-ups to raise body temperature or as part of a core/conditioning circuit. Try doing them for 20–30 second bursts with short rests.',
    suggested_combinations: ['burpees', 'jumping-jacks'],
    notes: 'Maintain a plank-like form while driving knees. Do not bounce your upper body; use your core to pull knees in. Beginners can go slower or do one leg at a time. Breathe continuously rather than holding your breath.',
    exercise_references: ['Healthline – Mountain Climbers Benefits; https://www.healthline.com/health/fitness/what-do-mountain-climbers-work', 'Verywell Fit – Mountain Climbers Precautions; https://www.verywellfit.com/mountain-climbers-exercise-3966947']
  }),

createGlobalExercise({
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Alternate elbow to opposite knee in cycling motion',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 15, // Standard rep range for ab exercises
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 1.1, // Slightly slower controlled reps
    muscle_groups: ['core', 'abs', 'obliques'],
    base_tags: ['dynamic', 'obliques'],
    benefits: 'One of the most effective abdominal exercises – it ranks top for activating the rectus abdominis and obliques. Builds core strength and stability, and improves coordination with its cross-body motion. Also helps train the muscles for rotational movements, benefiting functional core use.',
    limitations: 'Can strain the neck if done improperly (avoid pulling on your neck). Keep lower back pressed to the floor; if it arches, slow down or shorten range. Individuals with lower back issues should proceed with caution or opt for gentler core moves.',
    best_timing: 'Do in the middle or end of an ab workout. Often paired with static core exercises (like planks) to comprehensively train the core. Because it can be intense, it’s usually done after a warm-up when muscles are ready.',
    suggested_combinations: ['plank', 'russian-twists'],
    notes: 'Perform slowly and deliberately for best results – quality over speed. Focus on bringing your shoulder toward the opposite knee (not just elbow), and extend the opposite leg fully each rep. Exhale as you twist to engage deeper abs.',
    exercise_references: ['Bicycling – Bicycle Crunch Effectiveness; https://www.bicycling.com/training/a60659922/bicycle-crunches/', 'Bicycling – Bicycle Crunch Form Tips; https://www.bicycling.com/training/a60659922/bicycle-crunches/']
  }),

createGlobalExercise({
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms in prone position',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 8, // Beginner to intermediate range (research shows 8-15 for strength)
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 2.86,
    muscle_groups: ['chest', 'shoulders', 'triceps', 'core'],
    base_tags: ['upper-body', 'chest', 'arms'],
    benefits: 'Strengthens the chest, shoulders, and triceps, while engaging the core for stability. It’s a foundational upper-body exercise that also improves functional strength for pushing motions. Can even support heart health – higher push-up capacity has been linked to lower cardiac risk:.',
    limitations: 'Doing too many without variation can lead to a plateau in strength gains. Poor form (such as flared elbows or sagging hips) can strain shoulders or lower back. If you experience wrist pain, use push-up bars or do them on your knuckles. Individuals with shoulder injuries should use a reduced range or skip if painful.',
    best_timing: 'Usually done early in an upper-body workout when your arms are fresh. They can also be done daily in moderation as part of a morning routine or strength circuit, but allow rest days for recovery. Push-ups make a great warm-up for the upper body too, performed with modified intensity.',
    suggested_combinations: ['squats', 'lunges'],
    notes: 'Keep your body straight and core engaged throughout. Lower until your chest is near the floor (or as far as comfortable) and press up without locking elbows. Inhale on the way down, exhale as you push up. Start on your knees or against a wall if a full push-up is too challenging.',
    exercise_references: ['Healthline – Benefits of Push-ups; https://www.healthline.com/health/fitness-exercise/pushups-everyday', 'MedicalNewsToday – Push-up Risks; https://www.medicalnewstoday.com/articles/326149']
  }),

createGlobalExercise({
    id: 'squats',
    name: 'Squats',
    description: 'Lower body by bending knees, then return to standing',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 12, // Classic strength training rep range
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['quads', 'glutes', 'hamstrings', 'core'],
    base_tags: ['lower-body', 'glutes', 'legs'],
    benefits: 'Engages most major leg muscles (glutes, quadriceps, hamstrings) and core, making it a highly functional exercise. Helps build lower-body strength for daily activities like lifting or climbing stairs. Also improves balance and flexibility when done through a full range of motion, and can boost calorie burn due to using large muscle groups:.',
    limitations: 'Proper form is crucial – knees should track over toes, not cave inward, and heels stay down. Going too heavy or too deep without flexibility can strain knees or back. Those with knee or back issues should squat to a comfortable depth (or use a chair as a guide) and keep the back neutral. If any sharp pain occurs, stop and check your form or consult a trainer.',
    best_timing: 'Often placed at the beginning of a leg workout since it’s a compound movement requiring full strength. Can be done with just body weight as a warm-up or mobility exercise, or weighted for strength early on. In general fitness routines, squats pair well with upper-body exercises in circuits.',
    suggested_combinations: ['lunges', 'wall-sit'],
    notes: 'Keep your chest up and core braced. Aim to squat until thighs are parallel to the ground (or as far as comfortable) while keeping knees behind toes and weight in your heels. Drive through the heels to stand and squeeze your glutes at the top. Ensure you maintain a neutral spine throughout.',
    exercise_references: ['Healthline – Squat Benefits; https://www.healthline.com/health/fitness-exercise/squats-benefits', 'Healthline – Squat Safety Tips; https://www.healthline.com/health/fitness-exercise/squats-benefits']
  }),

createGlobalExercise({
    id: 'lunges',
    name: 'Lunges',
    description: 'Step forward and lower body, alternating legs',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10, // Per leg, so 20 total alternating
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['quads', 'glutes', 'hamstrings', 'calves'],
    base_tags: ['lower-body', 'glutes', 'legs', 'balance'],
    benefits: 'Works all major muscles of the legs (glutes, quads, hamstrings) and improves balance through its unilateral nature. Lunges help correct strength imbalances between legs and enhance hip mobility. They also engage core and stabilizer muscles to keep you upright, benefiting overall stability and coordination.',
    limitations: 'Ensure your front knee does not extend beyond your toes to protect the joint. People with knee problems might find forward lunges difficult – they can try reverse lunges which are easier on the knees. Keep your torso upright and avoid leaning forward excessively. If balance is an issue, perform lunges next to a wall or hold onto something for support initially.',
    best_timing: 'Include lunges in leg workouts after heavier lifts like squats, or in circuits. They are also great after a warm-up to activate glutes and legs, or as part of a dynamic warm-up for running. Because they can induce soreness, doing them 2–3 times a week with rest days in between is sufficient for most.',
    suggested_combinations: ['squats', 'calf-raises'],
    notes: 'Step far enough so that your front knee stays roughly above the ankle (not too far forward). Lower straight down by bending both knees, and avoid touching the back knee hard on the ground. Push through the heel of the front foot to rise back up. Keep your core engaged and torso vertical for balance.',
    exercise_references: ['Healthline – Benefits of Lunges; https://www.healthline.com/health/fitness-exercise/lunges-benefits', 'Healthline – Lunge Variations (Reverse Lunge); https://www.healthline.com/health/fitness-exercise/lunges-benefits']
  }),

createGlobalExercise({
    id: 'wall-sit',
    name: 'Wall Sit',
    description: 'Slide down wall until thighs parallel, hold position',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Beginner-friendly isometric hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['quads', 'glutes', 'calves', 'core'],
    base_tags: ['isometric', 'lower-body', 'quads'],
    benefits: 'Isometric exercise that builds endurance in the quadriceps, glutes, and calves. Great for strengthening the legs without movement, and it also engages the core and lower back for stabilization. Wall sits can improve muscular stamina useful for skiing or hiking, and have been shown to help lower blood pressure when practiced regularly:.',
    limitations: 'If you have knee pain, start with a higher “seat” (less bend) or shorter hold. Do not drop below a 90° knee angle, as that increases knee stress. Ensure your lower back is against the wall to avoid strain. People with uncontrolled hypertension should still be cautious (don’t hold your breath) despite long-term benefits; exhale slowly while holding.',
    best_timing: 'Use as a finisher in leg workouts or during circuit training. For example, after doing dynamic exercises like squats or lunges, a wall sit can safely fatigue the muscles. Can also be done in daily routines (e.g., during a break) to build leg endurance:.',
    suggested_combinations: ['squats', 'lunges'],
    notes: 'Slide down until your thighs are parallel to the floor and knees are above ankles (knees about 90°). Keep your heels down and weight in them. Do not rest your hands on your thighs (let your legs do the work). Maintain normal breathing – avoid holding breath which can spike blood pressure.',
    exercise_references: ['Cleveland Clinic – Wall Sit Benefits; https://health.clevelandclinic.org/wall-sits', 'Cleveland Clinic – Wall Sit Form; https://health.clevelandclinic.org/wall-sits']
  }),

createGlobalExercise({
    id: 'burpees',
    name: 'Burpees',
    description: 'Squat, jump back to plank, push-up, jump feet back, jump up',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 5, // Very demanding exercise, lower rep count
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 4.2, // Slightly longer due to complexity
    muscle_groups: ['full-body', 'chest', 'shoulders', 'legs', 'core', 'cardio'],
    base_tags: ['full-body', 'cardio', 'explosive'],
    benefits: 'A vigorous full-body exercise that combines strength and cardio. Burpees work your legs, core, chest, and shoulders, and they rapidly increase heart rate to improve cardiovascular endurance. They burn a lot of calories and can enhance explosive power (through the jump) and overall agility.',
    limitations: 'Burpees are very intense; beginners should start with fewer reps or step-back variations to avoid injury. They can put stress on wrists, shoulders, and knees due to the quick transitions. Maintain a controlled pace to ensure good form – sloppy burpees can strain the lower back or shoulders. If you have joint issues, consider modifying (e.g., no jump, or step instead of jump back).',
    best_timing: 'Often done at the end of a workout or in HIIT sessions as a high-intensity interval. Because they are fatiguing, using them in short bursts (like 10-15 reps or 30 seconds) with rest is common. They are also popular in bootcamp or CrossFit-style workouts for conditioning.',
    suggested_combinations: ['mountain-climbers', 'jumping-jacks'],
    notes: 'Keep a steady rhythm: squat, kick back to a firm plank, perform a push-up with a tight core, return feet under you, then jump up. Land softly on the jump to protect your knees. Breathing is important – exhale when jumping back and when jumping up. Quality over quantity: it’s better to do fewer burpees with good form than many with poor form.',
    exercise_references: ['Healthline – Burpee Benefits; https://www.healthline.com/health/fitness-exercise/how-to-do-a-burpee', 'Healthline – Burpee Safety Tips; https://www.healthline.com/health/fitness-exercise/how-to-do-a-burpee']
  }),

createGlobalExercise({
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    description: 'Jump feet apart while raising arms, then jump back together',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard cardio interval
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 1.5,
    muscle_groups: ['cardio', 'legs', 'shoulders'],
    base_tags: ['full-body', 'coordination'],
    benefits: 'Simple but effective full-body cardio exercise. Jumping jacks raise your heart rate, burn calories, and can improve aerobic endurance. They engage the legs (calves, thighs) and shoulders, and over time can even help bone density due to the impact from jumping. They also boost coordination by moving arms and legs together.',
    limitations: 'As a high-impact move, they may aggravate knee or ankle issues if done excessively or on a hard surface. If you have joint pain, do a lower impact version by stepping side to side instead of jumping. Wear supportive shoes and exercise on a shock-absorbing surface to protect your joints. Those with very low fitness should start with short sets since jacks can be surprisingly strenuous.',
    best_timing: 'Great as a warm-up exercise to get blood flowing or as part of a cardio circuit. They can be done in short bursts (e.g., sets of 30 seconds) between strength exercises to keep heart rate up. Also useful as quick activity breaks during the day to energize yourself.',
    suggested_combinations: ['high-knees', 'butt-kicks'],
    notes: 'Stay light on your feet – land on the balls of your feet to reduce impact. Keep your knees slightly bent when you land to act as shock absorbers. Aim for a consistent rhythm and full range of motion (hands touching overhead, feet wide apart on each jump). Breathe steadily; exhale when legs and arms spread apart.',
    exercise_references: ['Healthline – Benefits of Jumping Jacks; https://www.healthline.com/health/fitness-exercise/jumping-jacks', 'Healthline – Jumping Jacks Risks; https://www.healthline.com/health/fitness-exercise/jumping-jacks']
  }),

createGlobalExercise({
    id: 'high-knees',
    name: 'High Knees',
    description: 'Run in place bringing knees up to chest level',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // High intensity, shorter duration
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'legs', 'core'],
    base_tags: ['lower-body', 'explosive'],
    benefits: 'A quick-paced cardio drill that elevates heart rate and improves lower-body power. High knees engage the hip flexors, quadriceps, hamstrings, calves, and glutes, building muscular endurance and coordination in these areas. They also strengthen the core (keeping you upright) and can enhance running speed and form by training an exaggerated knee lift.',
    limitations: 'This exercise is high-impact (essentially running in place), so it can strain ankles or shins if done on a very hard surface. Wear supportive footwear and choose softer ground if possible. If you have balance issues or are very new to exercise, start with a marching-in-place to build up. As always, maintain good posture; do not lean back, which could strain the lower back.',
    best_timing: 'Often used in warm-ups for sports or runs to prime the legs, or inserted as a cardio burst in circuit training. You can perform high knees for set times (e.g., 30 seconds) or distances (if moving forward). They fit well into HIIT workouts (e.g., Tabata intervals) due to the high intensity.',
    suggested_combinations: ['butt-kicks', 'jumping-jacks'],
    notes: 'Keep your back straight and core engaged while driving the knees up to waist height or higher each time. Pump your arms in sync with your leg motion (opposite arm to leg). Aim for a springy, quick cadence, landing on the balls of your feet. Start slower and then pick up speed as you get more comfortable.',
    exercise_references: ['Healthline – High Knees Benefits; https://www.healthline.com/health/fitness/high-knees-benefits', 'Healthline – When to Do High Knees; https://www.healthline.com/health/fitness/high-knees-benefits']
  }),

createGlobalExercise({
    id: 'butt-kicks',
    name: 'Butt Kicks',
    description: 'Run in place kicking heels up toward glutes',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Consistent with other high-intensity cardio
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'hamstrings', 'calves'],
    base_tags: ['lower-body', 'hamstrings'],
    benefits: 'Focuses on the hamstrings by having you kick your heels up. Butt kicks serve as a dynamic stretch for the quadriceps and an activation for the hamstrings, improving their flexibility and strength. Like high knees, it’s also a cardio move that will raise your heart rate and warm up the body. Regular practice can aid running form by encouraging a quicker heel recovery under the body.',
    limitations: 'Maintain an upright posture; avoid leaning too far forward, which can strain the lower back. If you have knee issues, perform the movement gently (don’t force your heel to hit your butt). People with very tight quads should ease into it to prevent muscle pulls. As a lower-impact drill, it is generally safe, but if balance is a concern, do it marching in place rather than fast jumping.',
    best_timing: 'Commonly included in warm-up routines for running or sports, after high knees or in alternating sets. It also fits into cardio circuits. For example, you might do 30 seconds of butt kicks between strength exercises to keep your heart rate up. It’s effective to do butt kicks after high knees to target opposite muscle groups.',
    suggested_combinations: ['high-knees', 'jumping-jacks'],
    notes: 'Try to kick your heels all the way to your glutes (or as close as flexibility allows) in a smooth motion. Keep knees pointing down toward the ground (not forward) to emphasize the hamstrings. Swing your arms naturally at your sides to help maintain rhythm. Breathe steadily and find a cadence that you can control without stumbling.',
    exercise_references: ['MasterClass – Butt Kicks Benefits; https://www.masterclass.com/articles/butt-kicks-guide', 'Spotebi – Butt Kicks Warm-Up; https://www.spotebi.com/exercise-guide/butt-kicks/']
  }),

createGlobalExercise({
    id: 'downward-dog',
    name: 'Downward Dog',
    description: 'Form inverted V-shape with hands and feet on ground',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard yoga pose hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'hamstrings', 'shoulders', 'back'],
    base_tags: ['yoga', 'stretch', 'shoulders', 'hamstrings'],
    benefits: 'A staple yoga pose that stretches the entire back side of your body. Downward Dog lengthens the hamstrings and calves, opens the shoulders and chest, and traction on the spine helps relieve back tension. It also builds strength in the arms and shoulders by supporting part of your body weight, and improves blood circulation with the head lowered slightly (mild inversion):.',
    limitations: 'Those with very tight hamstrings or shoulders might find it challenging – it’s okay to bend your knees and elbows slightly to maintain a straight back. If you have wrist issues, you can do the pose on your forearms (Dolphin pose) or prop your hands on blocks. Individuals with uncontrolled high blood pressure or glaucoma should be cautious with any inverted position. Come out of the pose if you feel any dizziness or sharp pain.',
    best_timing: 'Often used in yoga sequences as a transitional pose or a resting pose between flows. In general fitness, it can be used in cool-down stretching routines to lengthen the posterior chain. It’s beneficial in the morning to stretch out stiffness, or after workouts involving the legs or back.',
    suggested_combinations: ['child-pose', 'forward-fold'],
    notes: 'Press your palms firmly into the ground, fingers spread, to distribute weight and relieve wrists. Lift your hips up and back, and try to push your heels toward the floor (it’s okay if they don’t touch). Keep your head between your arms and your spine straight by tilting your pelvis up. Focus on deep, calm breathing while holding the pose.',
    exercise_references: ['Yoga Journal – Downward Dog Benefits; https://www.yogajournal.com/poses/downward-facing-dog/', 'Yoga15 – Downward Dog Benefits; https://yoga15.com/poses/downward-dog/']
  }),

createGlobalExercise({
    id: 'child-pose',
    name: "Child's Pose",
    description: 'Kneel and sit back on heels, extend arms forward on ground',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 45, // Relaxation pose, longer hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'back', 'hips'],
    base_tags: ['yoga', 'stretch', 'relaxation', 'back'],
    benefits: 'A gentle, restorative pose that stretches the lower back, hips, thighs, and ankles. It helps to relax both the body and mind by activating the parasympathetic nervous system (promoting stress relief and better sleep). Child’s Pose can alleviate lower back pressure by elongating the spine and is often used as a resting or calming posture in yoga.',
    limitations: 'If you have knee problems, widen your knees or place a cushion under your hips to reduce pressure. Those with very limited ankle mobility might feel discomfort – a rolled towel under the ankles can help. Pregnant women or people with a large midsection should take a wider stance with the knees to avoid compression on the abdomen. Otherwise, it’s generally safe; just avoid forcing your buttocks all the way to the heels if it causes pain.',
    best_timing: 'Used frequently as a recovery pose during yoga sessions (e.g., between challenging sequences). Also great after exercise or before bed to relax the back and hips. You can include it at the end of a workout during cooldown or anytime you need to gently stretch and decompress the spine.',
    suggested_combinations: ['downward-dog', 'cat-cow'],
    notes: 'Let your forehead rest on the ground (or a cushion) and breathe deeply into your belly. You can extend arms forward for a shoulder stretch or keep them by your sides for a more relaxed position. With each exhale, imagine your torso sinking closer to the floor, releasing tension. Stay in the pose as long as needed – it’s about relaxation, so there is no strict time limit.',
    exercise_references: ['Cleveland Clinic – Child’s Pose Benefits; https://health.clevelandclinic.org/childs-pose', 'Verywell Health – Child’s Pose for Back Pain; https://www.verywellhealth.com/childs-pose-for-low-back-pain-2564776']
  }),

createGlobalExercise({
    id: 'cat-cow',
    name: 'Cat-Cow Stretch',
    description: 'Alternate arching and rounding spine on hands and knees',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 2,
    default_reps: 8, // Gentle mobility movement
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['flexibility', 'back', 'core'],
    base_tags: ['yoga', 'stretch', 'spine', 'mobility'],
    benefits: 'Gently mobilizes the spine, increasing flexibility and relieving tension in the back and neck. Cat-Cow helps you become more aware of spinal movement and can improve posture by training each vertebra to move. It also promotes blood flow to the spinal muscles and engages the core in a mild, controlled way. Often used to ease stiffness in the morning or before more strenuous activity.',
    limitations: 'This is a very low-risk movement. However, if you have a spinal injury or severe pain, move within a pain-free range only. It’s safe to let the back round fully in Cat and arch in Cow, but do not force any position. People with wrist discomfort can perform it on fists or with wrists slightly ahead of shoulders. Remember to move slowly and breathe; rushing through can reduce the effectiveness of the stretch:.',
    best_timing: 'Excellent as part of a warm-up (to loosen back and neck) or a cool-down to relax. You can do Cat-Cow first thing in the morning to gently get your spine moving, or during breaks from prolonged sitting. It’s also a staple in yoga sequences, usually performed at the beginning to warm up the spine.',
    suggested_combinations: ['child-pose', 'downward-dog'],
    notes: 'Coordinate with your breath: typically you inhale during Cow (arching, looking up) and exhale during Cat (rounding, tucking chin). Go slowly and try to articulate each segment of your spine in sequence. Spread your fingers and press through your hands to activate shoulder stabilizers. This exercise is about quality of motion, not intensity, so focus on feeling a nice stretch and flex through your back.',
    exercise_references: ['Men’s Health – Cat-Cow Benefits; https://www.menshealth.com/fitness/a39438579/cat-cow/', 'Yoga Journal – Cat-Cow Pose; https://www.yogajournal.com/poses/cow-cat/']
  }),

createGlobalExercise({
    id: 'single-leg-stand',
    name: 'Single Leg Stand',
    description: 'Stand on one leg, hold for time, then switch',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Per leg
    is_favorite: false,
    has_video: false,
    muscle_groups: ['balance', 'legs', 'core'],
    base_tags: ['stability', 'proprioception'],
    benefits: 'A fundamental balance exercise that improves proprioception and ankle stability. Regular practice can enhance your overall balance and reduce the risk of falls by strengthening the muscles around the ankles, knees, and hips that keep you upright. It engages the core as well, since you must stabilize your trunk on one leg. There’s even research suggesting that better one-leg balance is correlated with longer life expectancy: (likely reflecting overall health).',
    limitations: 'For safety, stand near a support (wall or chair) when you first try it, in case you lose balance. If you have significant balance issues or neurological conditions affecting balance, consult a professional for guidance. It’s a gentle exercise, but avoid doing it with eyes closed or on unstable surfaces until you have mastered a stable stance. Always practice on both legs to ensure balanced development.',
    best_timing: 'Can be done daily as part of a balance or rehab routine – for example, while brushing your teeth or waiting for something. In workouts, it can be part of a warm-up (to activate stabilizers) or integrated into circuits. Many physical therapy programs include it for older adults to maintain steadiness.',
    suggested_combinations: ['tree-pose', 'warrior-3'],
    notes: 'Focus on a fixed point in front of you (a drishti) to help maintain balance. Keep a slight bend in the standing knee and engage your core. Try not to let your arch collapse; grip the floor slightly with your toes. As you improve, you can progress by balancing for longer, or by moving your free leg/arms around to challenge yourself further.',
    exercise_references: ['Cleveland Clinic – Balance Exercise Importance; https://health.clevelandclinic.org/balance-exercises', 'PubMed – Single Leg Balance Training Review; https://pubmed.ncbi.nlm.nih.gov/34045951/']
  }),

createGlobalExercise({
    id: 'tree-pose',
    name: 'Tree Pose',
    description: 'Stand on one leg with other foot on inner thigh',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard yoga balance pose
    is_favorite: false,
    has_video: false,
    muscle_groups: ['balance', 'legs', 'core', 'hips'],
    base_tags: ['yoga', 'stability', 'focus'],
    benefits: 'Classic yoga balance pose that develops single-leg stability and focus. Tree Pose strengthens the standing leg (ankle, calf, thigh) and the core and hip stabilizers that keep you upright. The lifted leg also opens the hip of that side, improving hip flexibility. Mentally, it builds concentration and a sense of grounding as you practice steadying yourself.',
    limitations: 'Avoid pressing the foot against the knee joint of the standing leg – place it either below or above the knee to prevent strain. If you have trouble balancing, start with your foot lower (ankle or calf) and/or do it near a wall for support. People with ankle instability should be cautious; they can do a modified version with toes of the raised foot touching the ground. As with any balance pose, step out of it slowly if you start to fall to avoid injury.',
    best_timing: 'Typically done in the middle of a yoga routine among other standing poses. It’s useful after warming up, when muscles are loose but not too fatigued. You can also use it outside of yoga – say, after a run or leg workout – to work on balance and hip opening as part of a cool-down.',
    suggested_combinations: ['single-leg-stand', 'warrior-3'],
    notes: 'Actively press your raised foot into your standing leg and vice versa to create stability. Keep your standing leg straight but not locked. Find a focal point to gaze at. You can place hands at your chest (prayer position) or raise them overhead once stable. Breathe deeply; balance improves when you stay calm and breathe rather than holding your breath.',
    exercise_references: ['Yoga15 – Tree Pose Benefits; https://yoga15.com/poses/tree-pose/', 'Sri Sri Yoga – Tree Pose Benefits; https://srisrischoolofyoga.org/blog/tree-pose-vrksasana']
  }),

createGlobalExercise({
    id: 'warrior-3',
    name: 'Warrior III',
    description: 'Balance on one leg with other leg extended behind',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20, // More challenging, shorter hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['balance', 'legs', 'glutes', 'back', 'core'],
    base_tags: ['yoga', 'strength', 'core'],
    benefits: 'Advanced balance pose that strengthens the entire posterior chain (back, glutes, hamstrings) as well as the core and shoulders. Warrior III greatly improves balance and coordination, making you stabilize with one leg and torso parallel to the ground. It stretches the hamstring of the standing leg and requires engagement of the back muscles to keep your chest lifted. Overall, it builds core strength and back-body engagement while honing focus.',
    limitations: 'This pose is challenging; beginners should use a wall or blocks under the hands for support while learning the balance. Maintain a neutral neck (don’t crane upward) to avoid neck strain. If you have lower back problems, be cautious with the forward-leaning position – ensure you engage your core to avoid sagging. It’s okay to keep a slight bend in the standing knee to ease hamstring tension. Come out of the pose if you feel your form collapsing, as continuing while unstable might lead to a fall.',
    best_timing: 'Commonly part of yoga flows after poses like Warrior I or II, when the legs are warmed up. It’s best done when you’re not overly fatigued, so perhaps earlier in a session to really challenge your balance while fresh. In a general fitness context, you might include it after some simpler balance moves (like Tree Pose) as a peak balance challenge.',
    suggested_combinations: ['single-leg-stand', 'tree-pose'],
    notes: 'Keep your hips level – avoid opening the hip of the lifted leg upward. Point the toes of your raised leg toward the floor and actively reach back through your heel. Extend your arms forward (or keep them by your sides) in line with your torso for balance. Imagine making a straight line from fingertips (or head) to your heel. It’s normal to wobble; just reset and try again, focusing on engaging your core and leg muscles.',
    exercise_references: ['Yoga Journal – Warrior III Benefits; https://www.yogajournal.com/poses/warrior-iii-pose/', 'Hugger Mugger – Warrior III Core Strength; https://www.huggermugger.com/blog/warrior-iii-balance']
  }),

createGlobalExercise({
    id: 'dead-bug',
    name: 'Dead Bug',
    description: 'Lie on back, alternate extending opposite arm and leg',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 6, // Per side, 12 total alternating
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['core', 'abs'],
    base_tags: ['stability', 'coordination'],
    benefits: 'Highly effective for core stabilization. The dead bug teaches you to keep your ribcage down and lower back flat while moving your arms and legs – strengthening the deep core muscles that protect your spine. It improves coordination between opposite limbs (neuromuscular control) and can help alleviate lower back discomfort by training proper spinal alignment during movement. Overall, it builds a strong, stable core foundation for other exercises.',
    limitations: 'It’s generally very safe. The main error is letting your lower back arch off the floor – if you can’t keep it down, limit your range of motion or bend your knees more. If you feel neck strain, support your head on a small pillow or towel. People with severe lower back pain should start with caution and perhaps with one limb at a time until the core is stronger.',
    best_timing: 'Use it early in a core workout or as part of a warm-up to activate the core before heavier exercises. It’s also often included in physical therapy or beginner routines because of its safety and effectiveness. Doing 2-3 sets of dead bugs a few times a week can greatly improve core stability over time.',
    suggested_combinations: ['plank', 'glute-bridges'],
    notes: 'Focus on pressing your lower back into the ground throughout the exercise. Move slowly – extend opposite arm and leg outward until just before your back wants to arch, then return to center and switch. Breathe out as you extend to help engage the deep abs. Starting with shorter ranges and gradually increasing as you get stronger will ensure you’re doing it correctly.',
    exercise_references: ['Healthline – Dead Bug for Core Stability; https://www.healthline.com/health/dead-bug-exercise', 'Nike – Dead Bug Purpose; https://www.nike.com/a/dead-bug-exercise']
  }),

createGlobalExercise({
    id: 'glute-bridges',
    name: 'Glute Bridges',
    description: 'Lie on back, lift hips by squeezing glutes',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 12, // Standard strength training range
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['glutes', 'hamstrings', 'core'],
    base_tags: ['glutes', 'lower-body', 'posterior-chain'],
    benefits: 'Isolates and strengthens the gluteal muscles, which are often underused due to sitting. Strong glutes contribute to better pelvic alignment and can help alleviate lower back pain by taking strain off the spine. Glute bridges also engage the hamstrings and core, making them a great posterior-chain exercise. They improve hip extension, which can enhance posture and athletic movements (like jumping and running).',
    limitations: 'If you hyperextend (arch) your lower back at the top, you may feel discomfort – focus on squeezing the glutes, not arching the spine. People with very tight hip flexors might find it hard to lift hips high; a gentle stretch of hip flexors beforehand can help. Generally low-impact, but those with certain spine conditions should ensure they don’t push through pain. Also, avoid pushing your head into the ground; the force should be through shoulders and feet.',
    best_timing: 'Often used towards the end of a leg workout or within a core routine. They make a good warm-up for glute-engaged exercises (like squats or running) by activating the glutes. In rehab or beginner workouts, they can be a primary exercise done 3-4 times a week, whereas in strength programs they might appear 1-2 times a week as accessory work.',
    suggested_combinations: ['dead-bug', 'lunges'],
    notes: 'Feet placement affects emphasis: closer to butt targets glutes more, further out involves hamstrings more. Keep your knees about hip-width apart and don’t let them flare outward or collapse inward. Pause for a second at the top of the bridge to maximize glute contraction, then lower slowly. Ensure you are pushing through your heels – you can even lift your toes slightly to emphasize heel drive.',
    exercise_references: ['Elite Chiro Sport – Glute Bridge Benefits; https://elitechirosport.com/home-rehab-glute-bridge', 'Coast Performance – Calf Raises & Posterior Chain; https://coastperformancerehab.com/calf-exercises-save-feet-ankles/']
  }),

createGlobalExercise({
    id: 'finger-roll',
    name: 'Finger Roll',
    description: 'Roll fingers from fist to full extension, working each finger individually',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard mobility/warmup duration
    is_favorite: false,
    has_video: false,
    muscle_groups: ['hands', 'mobility'],
    base_tags: ['hands', 'fingers', 'warmup', 'mobility', 'dexterity'],
    benefits: 'Increases flexibility and blood circulation in the fingers and hands. Finger rolls help maintain range of motion in the finger joints and can improve dexterity and coordination of the fingers. Useful for warming up the hands before fine motor tasks or relieving stiffness after long periods of computer use. Over time, such exercises can help keep your hands nimble and may reduce risk of issues like tendonitis by gently working the tendons through their motion.',
    limitations: 'Virtually no risk when done gently. Avoid aggressive or fast snapping movements – the exercise should be smooth. If you have arthritis or very stiff fingers, do the motion slowly and in warm water to further ease joint movement. Stop if you feel any sharp pain in a particular finger joint.',
    best_timing: 'Great as a daily routine for hand health – for example, in the morning or during breaks from work. Also perform before activities that need finger flexibility (like typing, playing an instrument, climbing, etc.). It fits well at the start of an upper-body warm-up or at the end of a workout as a cooldown for the hands.',
    suggested_combinations: [],
    notes: 'Perform slowly: start with a closed fist, then gradually unfurl one finger at a time until the hand is fully open, stretching the fingers apart, then roll back to a fist. You can change the order of finger extension each time. Breathe normally and try to relax the hand as you move. This is also a good opportunity to practice mindfulness – focus on the sensations in your hand as each finger moves.',
    exercise_references: ['WebMD – Hand and Finger Exercise Benefits; https://www.webmd.com/osteoarthritis/ss/slideshow-hand-finger-exercises', 'USC Verdugo – Hand Exercises for Flexibility; https://uscvhh.org/5-hand-exercises-to-help-you-maintain-your-dexterity-flexibility/']
  }),

createGlobalExercise({
    id: 'tricep-dips',
    name: 'Tricep Dips',
    description: 'Lower and raise body using arm strength while seated on edge',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 8, // Challenging upper body exercise
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['triceps', 'shoulders', 'chest'],
    base_tags: ['upper-body', 'triceps', 'arms', 'bodyweight'],
    benefits: 'Primarily targets the triceps on the back of the upper arm, contributing to stronger, toned arms. Dips also involve the chest and anterior shoulders as secondary muscles. They can help improve upper-body pushing strength and can be done almost anywhere with a sturdy chair or bench. Over time, dips can lead to better arm definition and functional strength for pushing motions (like getting up from a seated position).',
    limitations: 'Bench dips can put significant stress on the shoulder joints due to the position of the arms behind the body. It’s important not to dip too low – lower until your elbows are about 90 degrees to reduce risk of shoulder injury. If you feel anterior shoulder pain, shorten the range or discontinue. Also keep your shoulders down (do not shrug) and close to your body during the dip. Those with previous shoulder issues should be cautious or opt for a different triceps exercise.',
    best_timing: 'Often included after compound chest exercises (like push-ups or bench press) to further work the triceps. They can also be part of a bodyweight circuit. Because they can fatigue the arms quickly, doing them earlier in an upper-body workout is common, but ensure you are warmed up. Avoid doing heavy dips after your shoulders are already exhausted to maintain good form.',
    suggested_combinations: ['push-ups', 'plank'],
    notes: 'Place your hands on the edge of the bench or chair, fingers forward, and keep your hips close to the bench as you dip (this reduces shoulder strain). Keep your elbows pointing backward (not flared out). Inhale as you lower, exhale as you push up. To make it easier, bend your knees and keep feet closer; to make it harder, straighten your legs or elevate your feet.',
    exercise_references: ['Verywell Fit – Triceps Dips Precautions; https://www.verywellfit.com/how-to-do-triceps-dips-3498339', 'American Council on Exercise – Triceps Dips Muscles; https://www.acefitness.org/education-and-resources/lifestyle/exercise-library/44/triceps-dips/']
  }),

createGlobalExercise({
    id: 'calf-raises',
    name: 'Calf Raises',
    description: 'Rise up onto toes, hold briefly, then lower back down',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 15, // Higher reps for smaller muscle group
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['calves'],
    base_tags: ['lower-body', 'calves', 'balance'],
    benefits: 'Strengthens the calf muscles (gastrocnemius and soleus) which power plantarflexion (rising on toes). Strong calves improve ankle stability and balance, reducing the risk of ankle sprains. They also contribute to better push-off in walking, running, and jumping. Regular calf raises can enhance muscle endurance in the lower legs and may help prevent Achilles tendon injuries by conditioning the tendon and muscles.',
    limitations: 'It’s generally a safe low-impact exercise. However, bouncing at the bottom or doing very fast reps might strain the Achilles tendon – perform raises in a controlled manner. People with tight calves should include stretching as well, as strengthening without stretching could increase tightness. If you feel a calf cramp, pause and gently stretch before continuing. Those with Achilles tendonitis should start with caution (maybe focusing on slow eccentric lowers).',
    best_timing: 'Calf raises can be done at the end of a leg workout or on their own a few times a week. They’re easy to incorporate – for instance, doing sets while holding onto a countertop. Runners or cyclists often do them in cooldowns to strengthen the calves. Doing them every other day is usually fine since calves recover quickly, but adjust frequency if you experience soreness.',
    suggested_combinations: ['squats', 'lunges'],
    notes: 'Perform with full range: raise your heels as high as possible, pause briefly at the top, then lower your heels down until you feel a stretch in your calves. Keep the movement smooth – no bouncing at the bottom. For better balance, you can lightly touch a wall or hold a chair back. As you get stronger, you can try single-leg calf raises or hold weights for more resistance.',
    exercise_references: ['Women’s Health – Calf Raises & Balance; https://www.womenshealthmag.com/fitness/a19985985/calf-raises-benefits/', 'American Sports & Fitness – Calf Raises Benefits; https://www.americansportandfitness.com/blogs/fitness-blog/benefits-of-calf-raises']
  }),

createGlobalExercise({
    id: 'russian-twists',
    name: 'Russian Twists',
    description: 'Sit with feet elevated, rotate torso side to side',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 16, // 8 per side
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    muscle_groups: ['core', 'obliques', 'abs'],
    base_tags: ['obliques', 'rotation'],
    benefits: 'Targets the oblique muscles strongly, helping to tone the sides of your abdomen and improve rotational strength. Russian twists also engage the transverse abdominis and lower back to stabilize the spine as you rotate, contributing to a stronger core. Athletes benefit from this exercise due to its sports-specific rotational training (think swinging a bat or golf club). When done with control, it can enhance spinal mobility and core endurance.',
    limitations: 'Twisting with a rounded lower back or too heavy a weight can strain the lumbar spine or discs. It’s critical to keep your back at a 45° angle and chest up while performing the twist. If you have a history of lower back issues, consider avoiding weighted twists and keep the motion small and slow. Some trainers caution against this move for those with osteoporosis or disc problems due to the rotational stress. Always move deliberately – avoid sudden jerks.',
    best_timing: 'Include as part of an abdominal workout or circuit, typically after foundational exercises like planks or crunches. Because it involves rotation, it can be done after the core is warmed up. It’s often placed toward the end of a workout as a burnout for the abs. Avoid doing it when your lower back is already very fatigued (like after heavy deadlifts) to maintain proper form.',
    suggested_combinations: ['bicycle-crunches', 'plank'],
    notes: 'Keep your core braced and move in a controlled manner – tap hands or a weight from one side to the other without letting momentum take over. For added stability, you can keep your heels on the floor (especially if you’re a beginner). Exhale during each twist. Remember, the quality of movement is key; a slower, controlled Russian twist is more effective and safer than rushing through many reps.',
    exercise_references: ['Men’s Health – Russian Twist Benefits; https://www.menshealth.com/fitness/a19548239/russian-twist/', 'Les Mills – Russian Twist Caution; https://www.lesmills.com/nordic/fitness-knowledge/are-russian-twists-bad-for-you/']
  }),

createGlobalExercise({
    id: 'bear-crawl',
    name: 'Bear Crawl',
    description: 'Crawl forward on hands and feet, keeping knees off ground',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Full-body stability exercise
    is_favorite: false,
    has_video: true,
    muscle_groups: ['full-body', 'core', 'shoulders', 'legs'],
    base_tags: ['full-body', 'stability', 'cardio'],
    benefits: 'A compound exercise that develops total-body strength and cardio. Bear crawls strengthen the shoulders and arms (as they support your body), core (as you stabilize your trunk in motion), and legs – all while training coordination and agility. It’s essentially a moving plank, forcing your core to work hard to prevent rotation as you move, and it raises your heart rate, improving endurance. It’s also great for building shoulder stability and improving hip and ankle mobility when done with proper form.',
    limitations: 'Can be tiring quickly – maintain form even when fatigued. If your knees start touching the ground or hips sag, take a break to avoid strain on the lower back. Those with wrist pain might need to crawl on fists or parallel bars to keep wrists neutral. Ensure a flat back; don’t let your head drop (to avoid neck strain). As it involves being bent over, individuals with high blood pressure or glaucoma should monitor for dizziness due to head position (though it’s not a full inversion).',
    best_timing: 'Often included in high-intensity circuits or functional training sessions. For example, you might do a bear crawl up and back a room as part of a bootcamp workout. It can serve as a cardio/conditioning drill near the end of a workout, or as part of a warm-up to activate multiple muscle groups. It’s versatile – use short distances (e.g., 10-20 meters) or time intervals (20-30 seconds) with rests as needed.',
    suggested_combinations: ['mountain-climbers', 'burpees'],
    notes: 'Keep your knees close to the ground (a few inches off) and your back flat. Move opposite arm and opposite leg together, keeping movements controlled. Try not to sway side-to-side – engage your abs to keep the torso stable. Eyes looking slightly forward will help maintain a neutral neck. Breathe continuously; people often hold their breath when crawling, so remind yourself to inhale and exhale regularly.',
    exercise_references: ['BarBend – Bear Crawl Core Benefits; https://barbend.com/bear-crawl-exercise/', 'Les Mills – Bear Crawl Benefits; https://www.lesmills.com/fit-business/fitness-management/add-bear-crawls-to-training/']
  }),

createGlobalExercise({
    id: 'forward-fold',
    name: 'Forward Fold',
    description: 'Stand and bend forward, reaching toward toes',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard stretch hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'hamstrings', 'back'],
    base_tags: ['yoga', 'hamstrings', 'back', 'stretch'],
    benefits: 'A soothing stretch for the posterior chain. Standing Forward Fold deeply stretches the hamstrings, calves, and lower back. It gently decompresses the spine and can help relieve tension in the back and neck. Forward bends also have a calming effect on the nervous system – they often reduce stress and anxiety, leaving you feeling grounded and relaxed. Additionally, the slight inversion (head below heart) can improve circulation to the brain and face.',
    limitations: 'Avoid bouncing in the stretch – a static or slow dynamic approach is safer. People with tight hamstrings should bend their knees slightly to prevent strain or rounding of the lower back. If you have lower back issues or disc problems, hinge at the hips with a flat back until you feel a stretch, rather than fully collapsing forward. Those with very high blood pressure or glaucoma should rise back up slowly to prevent head rush or pressure spikes. Pregnant individuals should widen their stance to make space for the belly and not compress it.',
    best_timing: 'Excellent at the end of a workout during cooldown to stretch out the back and legs. It’s also useful on rest days or before bed to release tension. In yoga, Uttanasana is often done at the beginning (to assess how the body feels) and end (to relax) of practice. Even a short forward fold break during work can help reset your spine and calm your mind.',
    suggested_combinations: ['downward-dog', 'child-pose'],
    notes: 'Relax your neck completely and let your head hang heavy when folded. Distribute weight towards the balls of your feet (not just the heels) to get a better hamstring stretch. You can hold opposite elbows and gently sway side to side to release additional tension. Breathe slowly and deeply; with each exhale see if you can let your torso sink a little closer to your thighs. To come up, engage your core and roll up slowly, one vertebra at a time, to avoid dizziness.',
    exercise_references: ['Rishikulyogshala – Forward Fold Benefits; https://www.rishikulyogshala.org/top-7-health-benefits-of-uttanasana-standing-forward-bend-pose/', 'YogaDownload – Benefits of Forward Folds; https://www.yogadownload.com/Blog/TabId/424/PostId/1106/physical-psychological-benefits-of-forward-folds.aspx']
  }),

createGlobalExercise({
    id: 'chair-squat',
    name: 'Chair Squat',
    description: 'Sit-to-stand using a chair.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 12, // within 10–15
    rep_duration_seconds: 6,
    is_favorite: false,
    has_video: true,
    muscle_groups: ['quads', 'glutes', 'hamstrings', 'core'],
    base_tags: ['lower-body', 'quads', 'glutes'],
    benefits: 'Strengthens thighs, hips, glutes; may support bone density.',
    limitations: 'Avoid with severe knee pain.',
    best_timing: 'Morning or during work breaks.',
    suggested_combinations: ['wall-push-up', 'glute-bridge'],
    notes: 'Supports bone health focus during menopause.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'wall-push-up',
    name: 'Wall Push-Up',
    description: 'Standing push-up against a wall.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10, // 10–12
    rep_duration_seconds: 5,
    is_favorite: false,
    has_video: true,
    muscle_groups: ['chest', 'shoulders', 'triceps', 'core'],
    base_tags: ['upper-body', 'chest', 'arms'],
    benefits: 'Strengthens chest, shoulders, and arms.',
    limitations: 'Avoid with shoulder injuries.',
    best_timing: 'Anytime, even post-meal.',
    suggested_combinations: ['chair-squat', 'desk-plank'],
    notes: 'Gentle option for postpartum women.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'desk-plank',
    name: 'Desk Plank',
    description: 'Forearms on desk; hold body in a straight line.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // hold 20–40s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core', 'abs', 'shoulders'],
    base_tags: ['shoulders', 'anti-extension'],
    benefits: 'Strengthens core and shoulders.',
    limitations: 'Avoid with wrist/shoulder pain.',
    best_timing: 'Midday break.',
    suggested_combinations: ['wall-push-up', 'bird-dog'],
    notes: 'Safe for most life stages.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'bird-dog',
    name: 'Bird-Dog',
    description: 'On hands/knees, extend opposite arm and leg.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 8, // per side
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: true,
    muscle_groups: ['core', 'back', 'glutes', 'shoulders'],
    base_tags: ['back', 'balance'],
    benefits: 'Improves balance; strengthens back and abs.',
    limitations: 'Avoid with wrist injury.',
    best_timing: 'Morning.',
    suggested_combinations: ['glute-bridge', 'cat-cow-stretch'],
    notes: 'Gentle core work for postpartum recovery.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'modified-push-up',
    name: 'Modified Push-Up',
    description: 'Knees down; push-up pattern.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 2,
    default_reps: 10, // 8–10
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['chest', 'shoulders', 'triceps', 'core'],
    base_tags: ['upper-body', 'chest', 'arms'],
    benefits: 'Strengthens chest and arms.',
    limitations: 'Avoid with wrist pain.',
    best_timing: 'Anytime.',
    suggested_combinations: ['chair-squat', 'glute-bridge'],
    notes: 'Gentler than full push-ups; postpartum-friendly.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'arm-circles',
    name: 'Arm Circles',
    description: 'Circle arms forward and back.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25, // 20–30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['shoulders', 'mobility'],
    base_tags: ['shoulder-mobility', 'warm-up'],
    benefits: 'Improves shoulder mobility; warms muscles.',
    limitations: 'Avoid with shoulder pain.',
    best_timing: 'Warm-up or micro-break.',
    suggested_combinations: ['shoulder-rolls', 'wall-push-up'],
    notes: 'Useful for premenstrual tension relief.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'step-up-stair',
    name: 'Step-Up (Stair)',
    description: 'Step onto a stair; alternate legs.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10, // per leg
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['quads', 'glutes', 'hamstrings'],
    base_tags: ['quads', 'glutes', 'functional'],
    benefits: 'Strengthens quads and glutes.',
    limitations: 'Avoid with knee issues.',
    best_timing: 'Morning or afternoon.',
    suggested_combinations: ['chair-squat', 'calf-raise'],
    notes: 'Great daily functional move for older women.',
    exercise_references: ['NHS Fitness Studio Exercises'],
  }),

createGlobalExercise({
    id: 'neck-rolls',
    name: 'Neck Rolls',
    description: 'Gentle circular neck movement.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 1,
    default_reps: 8, // 5–10 circles
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'mobility'],
    base_tags: ['neck', 'mobility', 'tension-relief'],
    benefits: 'Relieves stiffness.',
    limitations: 'Avoid with neck injury.',
    best_timing: 'Morning or after work.',
    suggested_combinations: ['shoulder-rolls', 'seated-spinal-twist'],
    notes: 'Useful for desk workers.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'shoulder-rolls',
    name: 'Shoulder Rolls',
    description: 'Circle shoulders forward and back.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 1,
    default_reps: 12, // 10–15
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['shoulders', 'mobility'],
    base_tags: ['shoulders', 'mobility', 'tension-relief'],
    benefits: 'Relieves tension; improves shoulder mobility.',
    limitations: 'Avoid with shoulder inflammation.',
    best_timing: 'Anytime.',
    suggested_combinations: ['neck-rolls', 'cat-cow-stretch'],
    notes: 'Supports posture habits.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'seated-spinal-twist',
    name: 'Seated Spinal Twist',
    description: 'Seated, gently twist torso.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20, // 20s hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'core', 'obliques', 'back'],
    base_tags: ['spine', 'rotation', 'mobility'],
    benefits: 'Improves spine flexibility.',
    limitations: 'Avoid with back problems.',
    best_timing: 'Evening stretch.',
    suggested_combinations: ['neck-rolls', 'shoulder-rolls'],
    notes: 'May relieve bloating during menstruation.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'hamstring-stretch',
    name: 'Hamstring Stretch',
    description: 'Extend leg and hinge forward to stretch hamstrings.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25, // 20–30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'hamstrings', 'back'],
    base_tags: ['hamstrings', 'posterior-chain', 'mobility'],
    benefits: 'Stretches hamstrings and back.',
    limitations: 'Avoid with acute hamstring injury.',
    best_timing: 'Morning or post-workout.',
    suggested_combinations: ['calf-stretch', 'quad-stretch'],
    notes: 'Supports mobility for older women.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'calf-stretch',
    name: 'Calf Stretch',
    description: 'Push against wall with heel down.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25, // 20–30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'calves'],
    base_tags: ['calves', 'ankle-mobility'],
    benefits: 'Stretches calf; improves ankle mobility.',
    limitations: 'Avoid with Achilles issues.',
    best_timing: 'Anytime.',
    suggested_combinations: ['hamstring-stretch', 'quad-stretch'],
    notes: 'Helpful after long standing.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'quad-stretch',
    name: 'Quad Stretch',
    description: 'Stand and pull ankle to glutes; keep knees together.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25, // 20–30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'quads', 'balance'],
    base_tags: ['quads', 'balance', 'mobility'],
    benefits: 'Stretches quadriceps; challenges balance.',
    limitations: 'Avoid with knee issues.',
    best_timing: 'Post-workout.',
    suggested_combinations: ['hamstring-stretch', 'calf-stretch'],
    notes: 'Supports knee health.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'hip-opener',
    name: 'Hip Opener (Butterfly)',
    description: 'Seated butterfly stretch; soles together; knees open.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25, // 20–30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'hips'],
    base_tags: ['hips', 'inner-thighs', 'mobility'],
    benefits: 'Stretches hips and inner thighs.',
    limitations: 'Avoid with hip pain.',
    best_timing: 'Evening relaxation.',
    suggested_combinations: ['cat-cow-stretch', 'glute-bridge'],
    notes: 'Reduces menstrual tension.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'chest-opener',
    name: 'Chest Opener',
    description: 'Clasp hands behind back and open chest.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'chest', 'shoulders'],
    base_tags: ['chest', 'posture'],
    benefits: 'Improves posture; stretches chest.',
    limitations: 'Avoid with shoulder pain.',
    best_timing: 'Morning breaks.',
    suggested_combinations: ['shoulder-rolls', 'arm-circles'],
    notes: 'Good for desk posture.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'side-stretch',
    name: 'Side Stretch',
    description: 'Reach arm overhead and bend to the side.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20, // 20s hold
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'obliques', 'back'],
    base_tags: ['lats', 'obliques', 'spine'],
    benefits: 'Stretches side body and spine.',
    limitations: 'Avoid with back pain.',
    best_timing: 'Morning or evening.',
    suggested_combinations: ['seated-spinal-twist', 'cat-cow-stretch'],
    notes: 'Relieves cramps and bloating.',
    exercise_references: ['Mayo Clinic – Healthy Lifestyle: Fitness'],
  }),

createGlobalExercise({
    id: 'marching-in-place',
    name: 'Marching in Place',
    description: 'March on the spot; lift knees.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60, // 1–2 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'legs'],
    base_tags: ['low-impact', 'warm-up', 'circulation'],
    benefits: 'Improves circulation; raises heart rate.',
    limitations: 'Avoid with hip/knee pain.',
    best_timing: 'Morning warm-up.',
    suggested_combinations: ['arm-circles', 'step-touch'],
    notes: 'Boosts energy during PMS fatigue.',
    exercise_references: ['WHO Physical Activity Guidelines'],
  }),

createGlobalExercise({
    id: 'step-touch',
    name: 'Step Touch',
    description: 'Step side-to-side; light touch.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60, // 1–2 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'legs'],
    base_tags: ['coordination', 'low-impact'],
    benefits: 'Improves coordination; mild cardio.',
    limitations: 'Avoid with severe joint pain.',
    best_timing: 'Anytime.',
    suggested_combinations: ['marching-in-place', 'arm-circles'],
    notes: 'Low impact cardio suitable for most women.',
    exercise_references: ['WHO Physical Activity Guidelines'],
  }),

createGlobalExercise({
    id: 'jumping-jacks-modified',
    name: 'Jumping Jacks (Modified)',
    description: 'Step side and raise arms (no jump).',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // 30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'legs', 'shoulders'],
    base_tags: ['low-impact', 'arms', 'legs'],
    benefits: 'Cardio; strengthens legs and arms.',
    limitations: 'Avoid with joint pain.',
    best_timing: 'Morning or midday.',
    suggested_combinations: ['marching-in-place', 'step-touch'],
    notes: 'Low-impact version for seniors.',
    exercise_references: ['WHO Physical Activity Guidelines'],
  }),

createGlobalExercise({
    id: 'side-steps-cardio',
    name: 'Side Steps',
    description: 'Rhythmic side-to-side stepping.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60, // 1–2 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'glutes', 'legs'],
    base_tags: ['glutes', 'coordination', 'low-impact'],
    benefits: 'Cardio with coordination; targets glute medius.',
    limitations: 'Avoid with hip/knee issues.',
    best_timing: 'Warm-up or cool-down.',
    suggested_combinations: ['marching-in-place', 'step-touch'],
    notes: 'Great for seniors.',
    exercise_references: ['WHO Physical Activity Guidelines'],
  }),

createGlobalExercise({
    id: 'seated-cardio-arm-pumps',
    name: 'Seated Cardio (Arm Pumps)',
    description: 'Seated marching with arm pumps.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60, // 1 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'shoulders'],
    base_tags: ['seated', 'low-impact', 'accessible'],
    benefits: 'Raises heart rate while seated.',
    limitations: 'Avoid with severe mobility issues.',
    best_timing: 'Office or flights.',
    suggested_combinations: ['seated-twists', 'ankle-circles'], // ankle-circles not listed elsewhere; you may add later if desired
    notes: 'Excellent for older women and some post-op scenarios.',
    exercise_references: ['WHO Physical Activity Guidelines'],
  }),

createGlobalExercise({
    id: 'dance-moves-basic',
    name: 'Dance Moves (Basic)',
    description: 'Simple rhythmic steps to music.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 90, // 1–2 min freestyle
    is_favorite: false,
    has_video: false,
    muscle_groups: ['cardio', 'full-body', 'flexibility'],
    base_tags: ['dance', 'mood', 'cardio'],
    benefits: 'Improves mood, cardio, and flexibility.',
    limitations: 'Avoid with dizziness.',
    best_timing: 'Evening, with music.',
    suggested_combinations: ['arm-circles', 'side-steps-cardio'],
    notes: 'Supports mood swings during PMS/menopause.',
    exercise_references: ['WHO Physical Activity Guidelines'],
  }),

createGlobalExercise({
    id: 'heel-to-toe-walk',
    name: 'Heel-to-Toe Walk',
    description: 'Walk in a straight line, heel to toe.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 2,
    default_reps: 12, // 10–15 steps
    rep_duration_seconds: 1.2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['balance', 'legs', 'core'],
    base_tags: ['coordination'],
    benefits: 'Improves coordination and balance.',
    limitations: 'Avoid with dizziness.',
    best_timing: 'Morning walk.',
    suggested_combinations: ['single-leg-stand', 'calf-raise'],
    notes: 'Helps prevent falls in seniors.',
    exercise_references: ['Mayo Clinic – Balance Training'],
  }),

createGlobalExercise({
    id: 'balance-hold-arm-raise',
    name: 'Balance Hold with Arm Raise',
    description: 'Single-leg balance while raising arms overhead.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 18, // 15–20s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['balance', 'legs', 'core', 'shoulders'],
    base_tags: ['posture', 'strength'],
    benefits: 'Improves balance, posture, and strength.',
    limitations: 'Avoid with shoulder pain.',
    best_timing: 'Anytime.',
    suggested_combinations: ['calf-raise', 'arm-circles'],
    notes: 'Enhances posture for office workers.',
    exercise_references: ['Mayo Clinic – Balance Training'],
  }),

createGlobalExercise({
    id: 'seated-twists',
    name: 'Seated Twists',
    description: 'Seated; gently twist torso side to side.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10,
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'core', 'obliques', 'back'],
    base_tags: ['mobility', 'posture', 'spine'],
    benefits: 'Improves spine mobility and posture.',
    limitations: 'Avoid with severe back pain.',
    best_timing: 'Office break.',
    suggested_combinations: ['shoulder-rolls', 'side-stretch'],
    notes: 'Supports digestion during PMS.',
    exercise_references: ['Mayo Clinic – Balance Training'],
  }),

createGlobalExercise({
    id: 'tandem-balance',
    name: 'Tandem Balance',
    description: 'Stand heel-to-toe and hold balance.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 25, // 20–30s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['balance', 'legs', 'core'],
    base_tags: ['focus', 'stability'],
    benefits: 'Improves balance and focus.',
    limitations: 'Avoid with dizziness.',
    best_timing: 'Morning focus practice.',
    suggested_combinations: ['single-leg-stand', 'heel-to-toe-walk'],
    notes: 'Great fall-prevention drill for seniors.',
    exercise_references: ['Mayo Clinic – Balance Training'],
  }),

createGlobalExercise({
    id: 'chair-posture-hold',
    name: 'Chair Posture Hold',
    description: 'Sit upright with neutral spine; hold posture.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 45, // 30–60s
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core', 'back'],
    base_tags: ['posture', 'core', 'awareness'],
    benefits: 'Improves posture awareness and core endurance.',
    limitations: 'Avoid with acute back pain.',
    best_timing: 'Anytime (office friendly).',
    suggested_combinations: ['seated-twists', 'shoulder-rolls'],
    notes: 'Good habit during menopause/posture changes.',
    exercise_references: ['Mayo Clinic – Balance Training'],
  }),

createGlobalExercise({
    id: 'pelvic-tilts',
    name: 'Pelvic Tilts',
    description: 'Lie on back; gently tilt pelvis upward.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 12, // 10–15
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core', 'back'],
    base_tags: ['pelvic-floor', 'low-back'],
    benefits: 'Strengthens lower back and core.',
    limitations: 'Avoid during back pain flare.',
    best_timing: 'Morning or evening.',
    suggested_combinations: ['glute-bridge', 'cat-cow-stretch'],
    notes: 'Great for postpartum recovery.',
    exercise_references: ['NHS Women\'s Health'],
  }),

createGlobalExercise({
    id: 'kegel-exercise',
    name: 'Kegel Exercise',
    description: 'Contract and relax pelvic floor muscles.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10,
    rep_duration_seconds: 1.5,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core'],
    base_tags: ['pelvic-floor', 'bladder-control'],
    benefits: 'Strengthens pelvic floor.',
    limitations: 'Avoid with urinary infection.',
    best_timing: 'Anytime.',
    suggested_combinations: ['pelvic-tilts', 'glute-bridge'],
    notes: 'Supports bladder health postpartum and during menopause.',
    exercise_references: ['NHS Women\'s Health'],
  }),

createGlobalExercise({
    id: 'gentle-yoga-menstrual',
    name: 'Gentle Yoga Flow (Menstrual)',
    description: 'Light sequence of relaxing yoga poses.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 8 * 60, // 5–10 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'core', 'back'],
    base_tags: ['relaxation', 'cramp-relief', 'yoga'],
    benefits: 'Relieves cramps and promotes relaxation.',
    limitations: 'Avoid if pain is severe; consult clinician.',
    best_timing: 'During menstruation.',
    suggested_combinations: ['cat-cow-stretch', 'seated-spinal-twist'],
    notes: 'Period pain relief focus.',
    exercise_references: ['WHO Women\'s Health'],
  }),

createGlobalExercise({
    id: 'breathing-exercise',
    name: 'Breathing Exercise',
    description: 'Slow deep belly breathing.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 150, // 2–3 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core'],
    base_tags: ['relaxation', 'stress'],
    benefits: 'Reduces stress; improves oxygenation.',
    limitations: 'Stop if dizziness occurs.',
    best_timing: 'Morning and evening.',
    suggested_combinations: ['gentle-yoga-menstrual', 'seated-twists'],
    notes: 'Helps relieve menopause-related anxiety.',
    exercise_references: ['WHO Women\'s Health'],
  }),

createGlobalExercise({
    id: 'prenatal-stretch',
    name: 'Prenatal Stretch',
    description: 'Gentle hip/leg stretches suitable for pregnancy.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 8 * 60, // 5–10 min
    is_favorite: false,
    has_video: false,
    muscle_groups: ['flexibility', 'hips', 'legs', 'back'],
    base_tags: ['prenatal', 'hips', 'legs'],
    benefits: 'Relieves common pregnancy discomforts.',
    limitations: 'Only with clinician approval.',
    best_timing: 'Anytime when cleared.',
    suggested_combinations: ['pelvic-tilts', 'breathing-exercise'],
    notes: 'For pregnant women only.',
    exercise_references: ['NHS Pregnancy Health'],
  }),

createGlobalExercise({
    id: 'postnatal-core',
    name: 'Postnatal Core',
    description: 'Gentle core re-activation sequence.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10,
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    muscle_groups: ['core', 'back'],
    base_tags: ['postnatal', 'recovery'],
    benefits: 'Helps restore core strength postpartum.',
    limitations: 'Avoid too soon after birth; seek clearance.',
    best_timing: 'After medical clearance.',
    suggested_combinations: ['pelvic-tilts', 'glute-bridge'],
    notes: 'Supports gradual postpartum recovery.',
    exercise_references: ['NHS Pregnancy Health'],
  }),

createGlobalExercise({
    id: 'ukemi-basics',
    name: 'Ukemi Basics (Mae/Ushiro)',
    description: 'Forward/backward breakfalls and safe rolling fundamentals.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 10,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido', 'ukemi'],
    benefits: 'Builds confidence, safety, and body coordination.',
    limitations: 'Avoid if you have acute neck, shoulder, or back injuries.',
    best_timing: 'Warm-up at the start of class.',
    suggested_combinations: ['tai-sabaki','shikko'],
    notes: 'Focus on soft landings, chin tucked, smooth breathing.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'tai-sabaki',
    name: 'Tai Sabaki (Irimi/Tenkan)',
    description: 'Stepping body movement drills: irimi (entering) and tenkan (turning).',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 60,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido', 'footwork'],
    benefits: 'Improves positioning, timing, and balance.',
    limitations: 'Mind knee alignment; avoid twisting on a sticky mat.',
    best_timing: 'Early in practice to set movement quality.',
    suggested_combinations: ['ukemi-basics','ikkyo-omote'],
    notes: 'Emphasize hip/center movement, not just feet.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'shikko',
    name: 'Shikkō (Knee-walking)',
    description: 'Suwari-waza locomotion for hip/leg conditioning and posture.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 45,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido', 'conditioning'],
    benefits: 'Strengthens hips/posture and develops center movement.',
    limitations: 'Use knee pads if needed; avoid pain on kneecaps.',
    best_timing: 'After warm-up, before suwari-waza techniques.',
    suggested_combinations: ['ikkyo-omote'],
    notes: 'Stay tall; move from the hips, not shoulders.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'ikkyo-omote',
    name: 'Ikkyo (Omote) - Shōmen-uchi',
    description: 'First control, entering form, from frontal strike.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Kuzushi, posture control, and basic pin transitions.',
    limitations: 'Maintain shoulder safety for both nage and uke.',
    best_timing: 'After tai sabaki drills.',
    suggested_combinations: ['ikkyo-ura','nikyo-omote'],
    notes: 'Keep elbows heavy; control line through uke’s center.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'ikkyo-ura',
    name: 'Ikkyo (Ura) - Shōmen-uchi',
    description: 'First control, turning form, from frontal strike.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Blending and off-axis control with tenkan.',
    limitations: 'Avoid cranking uke’s shoulder; move their whole frame.',
    best_timing: 'Paired with omote version for contrast.',
    suggested_combinations: ['tai-sabaki','ikkyo-omote'],
    notes: 'Lead with hips; hand path traces uke’s line.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'nikyo-omote',
    name: 'Nikyo (Omote) - Katate-dori',
    description: 'Second control wrist rotation from same-side wrist grab.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Wrist spiral control, connection, and off-balance.',
    limitations: 'Be gentle on wrists; tap early.',
    best_timing: 'After ikkyo to build control progression.',
    suggested_combinations: ['nikyo-ura','sankyo-omote'],
    notes: 'Keep forearms connected; rotate through center.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'sankyo-omote',
    name: 'Sankyo (Omote) - Katate-dori',
    description: 'Third control spiraling up and in from same-side wrist grab.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Forearm rotation, posture control, pin transition.',
    limitations: 'Mind uke’s elbow/shoulder line; avoid compression.',
    best_timing: 'With nikyo to compare spiral directions.',
    suggested_combinations: ['yonkyo-omote','kotegaeshi'],
    notes: 'Lead with center, keep structure.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'yonkyo-omote',
    name: 'Yonkyo (Omote) - Katate-dori',
    description: 'Fourth control with forearm pressure point control.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Precision control, pain compliance, posture breaking.',
    limitations: 'High sensitivity—train slowly; watch for numbness.',
    best_timing: 'After sankyo; same entry, different finish.',
    suggested_combinations: ['sankyo-omote'],
    notes: 'Placement over radial nerve; keep forearm alignment.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'kotegaeshi',
    name: 'Kotegaeshi - Katate-dori',
    description: 'Wrist turn-out throw from wrist grab.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Rotation, timing, and safe projection mechanics.',
    limitations: 'Control uke’s fall path; protect their elbow/shoulder.',
    best_timing: 'Pair with nikyo to compare inside/outside spirals.',
    suggested_combinations: ['nikyo-omote'],
    notes: 'Keep elbow down; throw through the line, not the hand.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'shihonage',
    name: 'Shihōnage - Ryōte-dori',
    description: 'Four-direction throw from two-hand grab.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Axis control, shoulder line management, safe projection.',
    limitations: 'Respect uke’s shoulder; avoid hyperextension.',
    best_timing: 'Mid-class after sufficient warm-up.',
    suggested_combinations: ['iriminage','tenchinage'],
    notes: 'Turn around your center; don’t muscle the arms.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'iriminage',
    name: 'Iriminage - Yokomen-uchi',
    description: 'Entering throw from diagonal strike.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Blending on the blind side; posture take.',
    limitations: 'Neck safety for uke; align head control gently.',
    best_timing: 'With shihonage for contrast of lines.',
    suggested_combinations: ['shihonage'],
    notes: 'Cut the line with your center; keep spine tall.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'tenchinage',
    name: 'Tenchinage - Katate-dori',
    description: 'Heaven-earth throw splitting uke’s structure.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 6,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Vertical separation, timing, and whole-body movement.',
    limitations: 'Watch lower back; use legs, not arms.',
    best_timing: 'With iriminage to study vertical vs. horizontal lines.',
    suggested_combinations: ['iriminage'],
    notes: 'Hands separate from the center, not the shoulders.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'kokyunage',
    name: 'Kokyunage - Various grips',
    description: 'Breath-power throws emphasizing timing and connection.',
    exercise_type: ExerciseType.REPETITION_BASED,
    default_reps: 8,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Develops relaxed power and responsive blending.',
    limitations: 'High variance—choose safe fall options.',
    best_timing: 'Late class once bodies are warm.',
    suggested_combinations: ['iriminage','tenchinage'],
    notes: 'Lead with connection, not force.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'jiyuwaza-2',
    name: 'Jiyū-waza (Free practice) - Level 2',
    description: 'Light, controlled free-form application of studied techniques.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 120,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Integration, timing, and adaptive footwork.',
    limitations: 'Keep intensity appropriate; focus on safety.',
    best_timing: 'End of class as integration.',
    suggested_combinations: ['kokyunage'],
    notes: 'Agree intensity with partner before starting.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'kaeshiwaza-intro',
    name: 'Kaeshi-waza (Counters) - Intro',
    description: 'Foundational counters to common entries (safely explored).',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 120,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Awareness of vulnerabilities and recovery options.',
    limitations: 'Keep control; counters escalate risk quickly.',
    best_timing: 'Only with experienced partners; end of session.',
    suggested_combinations: ['iriminage','shihonage'],
    notes: 'Agree on frames to stop/reverse; prioritize ukemi.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'jiyuwaza-1',
    name: 'Jiyū-waza (Free practice) - Level 1',
    description: 'Structured free practice with predefined attacks/entries.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 180,
    is_favorite: false,
    has_video: false,
    base_tags: ['aikido'],
    benefits: 'Stress-tests timing, distance, and composure.',
    limitations: 'Fatigue management; reduce intensity if form degrades.',
    best_timing: 'Capstone segment at the end of class.',
    suggested_combinations: ['kaeshiwaza-intro'],
    notes: 'Rotate partners to vary rhythm and size.',
    exercise_references: []
  }),

createGlobalExercise({
    id: 'commencing-form',
    name: 'Commencing Form',
    description: 'Start position with feet shoulder-width apart, arms slowly raising and lowering.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['tai-chi', 'breathing']
  }),

createGlobalExercise({
    id: 'parting-wild-horses-mane',
    name: "Parting the Wild Horse’s Mane",
    description: 'Step forward with arms moving in flowing diagonal motions.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['tai-chi', 'mobility', 'grace']
  }),

createGlobalExercise({
    id: 'white-crane-spreads-wings',
    name: 'White Crane Spreads Its Wings',
    description: 'Shift weight and raise arms in a wing-like motion.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['tai-chi', 'posture', 'upper-body']
  }),

createGlobalExercise({
    id: 'brush-knee',
    name: 'Brush Knee and Push',
    description: 'Step forward, one hand pushes forward while the other brushes past the knee.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['tai-chi', 'coordination', 'lower-body']
  }),

createGlobalExercise({
    id: 'wave-hands-clouds',
    name: 'Wave Hands Like Clouds',
    description: 'Side step while arms make circular cloud-like motions.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 45,
    is_favorite: false,
    has_video: false,
    base_tags: ['tai-chi', 'flow', 'mobility']
  }),

createGlobalExercise({
    id: 'golden-rooster-stand',
    name: 'Golden Rooster Stands on One Leg',
    description: 'Stand on one leg while lifting the opposite knee and arm.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20,
    is_favorite: false,
    has_video: false,
    base_tags: ['tai-chi', 'focus']
  }),

createGlobalExercise({
    id: 'basic-merengue',
    name: 'Basic Merengue Step',
    description: 'March in place with hip movement and arm swings to music.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['zumba', 'latin']
  }),

createGlobalExercise({
    id: 'salsa-step',
    name: 'Salsa Step',
    description: 'Step forward and back or side-to-side with rhythmic hip motion.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['zumba', 'salsa']
  }),

createGlobalExercise({
    id: 'cumbia-step',
    name: 'Cumbia Step',
    description: 'Step behind with one foot, alternating sides with hip sway.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['zumba', 'latin', 'coordination']
  }),

createGlobalExercise({
    id: 'reggaeton-stomp',
    name: 'Reggaeton Stomp',
    description: 'Strong stomping and upper-body movements to urban beats.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['zumba', 'reggaeton', 'hip-hop']
  }),

createGlobalExercise({
    id: 'bachata-step',
    name: 'Bachata Step',
    description: 'Side steps with hip sway and a tap on every fourth beat.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    base_tags: ['zumba', 'bachata', 'latin']
  }),

createGlobalExercise({
    id: 'cooldown-latin',
    name: 'Latin Dance Cooldown',
    description: 'Gentle side-to-side steps with arm stretches and breathing.',
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 45,
    is_favorite: false,
    has_video: false,
    base_tags: ['zumba', 'stretch', 'cooldown']
  })
];

/**
 * Get a global exercise by ID
 */
export function getGlobalExerciseById(id: string): GlobalExercise | undefined {
  return GLOBAL_EXERCISES.find(ex => ex.id === id);
}

/**
 * Get all global exercises
 */
export function getAllGlobalExercises(): GlobalExercise[] {
  return GLOBAL_EXERCISES;
}
