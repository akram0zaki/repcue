# Exercise Video Specifications

**Version**: 1.0  
**Last Updated**: November 6, 2025  
**Purpose**: Technical specifications for 3D animated exercise demonstration videos

---

## Overview

The site requires high-quality 3D animated videos for all exercise demonstrations. These videos must work seamlessly across multiple devices and viewports while maintaining consistent quality and performance.

---

## 1. Video Format & Technical Specifications

### Container & Codec
- **Container Format**: MP4 (MPEG-4 Part 14)
- **Video Codec**: H.264 (AVC) - widely supported across all browsers and devices
- **Profile**: High Profile recommended for quality
- **Level**: 4.0 or higher

### Compression & Quality
- **Compression Method**: CRF (Constant Rate Factor) 23-28
- **Target File Size**: <5MB per video per resolution (important for mobile data usage)
- **Bitrate**: Variable bitrate (VBR) for optimal quality/size ratio
- **Quality Priority**: Balance between visual clarity and file size

### Frame Rate & Duration
- **Frame Rate**: 30 fps (frames per second) - consistent across all videos
- **Duration**: 3-5 seconds per complete exercise cycle
- **Timing**: Animation speed should match realistic exercise execution (not too fast, not too slow)
- **Loop Optimization**: First and last frames must be identical for seamless looping

### Audio
- **Audio Track**: None required (no audio)


---

## 2. Resolution Requirements

**All three resolutions are required for each exercise**. The same animation must be rendered in all three aspect ratios:

| Resolution | Aspect Ratio | Use Case | Priority |
|------------|--------------|----------|----------|
| 1080×1080 | 1:1 (Square) | Mobile portrait mode | High |
| 1080×1920 | 9:16 (Portrait) | Mobile full-screen | High |
| 1920×1080 | 16:9 (Landscape) | Desktop/tablet | Medium |

### Resolution Notes
- Videos are the **exact same animation** in different aspect ratios
- No content should be cropped - adjust framing to fit aspect ratio
- Character must be fully visible in all three versions

---

## 3. Composition & Framing

### Body Visibility
- **Full body must be visible** at all times (head to toe)
- Adequate padding from frame edges (10-15% margin on all sides)
- No body parts should be cut off or cropped at any point in the animation

### Character Positioning
- **Centered composition**: Character centered horizontally and vertically in frame
- **Consistent positioning**: Same relative position maintained across all resolutions
- **Z-axis depth**: Character should be at appropriate distance to show full body clearly

### Camera Requirements
- **Static camera position**: No camera movement whatsoever
- **No zoom**: Fixed focal length throughout
- **No pan/tilt**: Camera must remain stationary
- **Fixed angle**: Consistent camera angle throughout exercise

### Background
- **Clean and neutral**: Solid color or minimal studio setting
- **No distractions**: No busy patterns, objects, or clutter
- **Consistent across all videos**: Same background style for all exercises
- **High contrast**: Background must contrast well with character for visibility

### Lighting
- **Bright and even**: Well-lit scene with consistent lighting
- **No harsh shadows**: Minimize strong shadows on character or background
- **Consistent lighting**: Same lighting setup across all exercise videos
- **No flickering**: Stable lighting throughout the animation

---

## 4. Character Design & Appearance

### Character Consistency
- **Single 3D model**: Use the same character model for ALL exercises
- **Consistent design**: Character appearance must be identical across all videos
- **No variations**: Same body proportions, height, build throughout

### Body Type
- **Realistic proportions**: Anatomically correct human proportions
- **Fit and healthy**: Athletic but not exaggerated or overly muscular
- **Not skinny**: Avoid unrealistic thin body types
- **Natural build**: Representative of a healthy, active person

### Gender Specification
Preference for a female character but not mandatory.

---

## 5. Exercise Accuracy & Form

### Proper Form
- **Correct technique**: Each exercise must demonstrate proper, safe form
- **Industry standard**: Follow widely accepted fitness guidelines
- **No bad habits**: Avoid teaching incorrect or dangerous form

### Range of Motion
- **Full ROM**: Show complete range of motion for each exercise
- **Natural movement**: Joint angles should be realistic and safe
- **Appropriate depth**: 
  - Squats: Proper depth (thighs parallel to ground or as appropriate)
  - Push-ups: Full extension and descent
  - Etc.: Follow standard guidelines per exercise

### Movement Speed
- **Realistic timing**: Match typical exercise execution speed
- **Controlled movement**: Not rushed or unnaturally slow
- **Smooth animation**: Natural transitions between positions
- **Consistent tempo**: Maintain even speed throughout the rep

### Anatomical Correctness
- **Natural joint movement**: Joints should move in anatomically correct ways
- **Proper alignment**: Spine, knees, elbows aligned correctly
- **No unnatural angles**: Avoid impossible or painful-looking positions
- **Realistic flexibility**: Movement within normal human range

### Side-Specific Exercises
For exercises that have left/right variations (e.g., lunges, single-leg stand):
- **Specify which side to show** in the exercise list
- Default to showing the exercise from the perspective that best demonstrates form
- Consider whether both sides are needed or if one is sufficient

---

## 6. File Naming Convention

### Standard Format
```
[exercise-id]_v1_[resolution].mp4
```

### Examples
```
push-ups_v1_1080x1080.mp4
push-ups_v1_1080x1920.mp4
push-ups_v1_1920x1080.mp4

squats_v1_1080x1080.mp4
squats_v1_1080x1920.mp4
squats_v1_1920x1080.mp4
```

### Naming Rules
- **exercise-id**: Use kebab-case (lowercase with hyphens)
- **Version**: Start with `v1` (allows for future revisions)
- **Resolution**: Use exact pixel dimensions with 'x' separator
- **Extension**: Always `.mp4`
- **No spaces**: Use hyphens instead of spaces

---

## 7. Deliverables & Organization

### File Organization
```
exercise-videos/
├── 1080x1080/          # Square videos
│   ├── push-ups_v1_1080x1080.mp4
│   ├── squats_v1_1080x1080.mp4
│   └── ...
├── 1080x1920/          # Portrait videos
│   ├── push-ups_v1_1080x1920.mp4
│   ├── squats_v1_1080x1920.mp4
│   └── ...
├── 1920x1080/          # Landscape videos
│   ├── push-ups_v1_1920x1080.mp4
│   ├── squats_v1_1920x1080.mp4
│   └── ...
└── metadata.json       # Metadata manifest
```

### Delivery Requirements
1. **All video files** organized in folders by resolution
2. **Batch delivery** preference for incremental delivery to ensure timely feedback if needed

---

## 8. Quality Assurance & Testing

### Loop Testing
- **Seamless loop**: Video must play repeatedly without visible jump or stutter
- **Frame matching**: First and last frames must be identical
- **Smooth transition**: No jarring cuts when looping
- **Test duration**: Play each video in loop mode for at least 10 cycles

### Cross-Device Testing
- **Mobile testing**: Test on actual smartphones (iOS and Android)
- **Desktop testing**: Test on laptop/desktop browsers
- **Tablet testing**: Test on tablets if available
- **Browser compatibility**: Test in Chrome, Safari, Firefox, Edge

### Aspect Ratio Verification
- **No stretching**: Videos must not appear stretched or squashed
- **Correct proportions**: Character body proportions should look natural
- **Frame accuracy**: Video dimensions must match specified resolutions exactly

### Performance Testing
- **File size check**: Verify all files are under 5MB target
- **Load time**: Test loading speed on 3G/4G mobile connections
- **Playback smoothness**: Ensure 30fps playback without stuttering

---

## 9. Accessibility Considerations

### Visual Clarity
- **High contrast**: Character must stand out clearly from background
- **Clear movements**: Movements should be distinct and easy to follow
- **Edge definition**: Clear silhouette of character at all times

### Safety
- **No flashing**: Avoid rapid flashes or strobing effects (WCAG 2.1 compliance)
- **No rapid changes**: Smooth transitions, no jarring cuts
- **Photosensitivity**: Design with photosensitive epilepsy in mind

### Reduced Motion
- **Purpose**: Videos may be disabled by users with motion sensitivity preferences
- **Alternative**: App provides timer-based alternatives when videos are disabled
- **Design consideration**: Movements should be clear but not unnecessarily fast

---

## 10. Exercise List

The following exercises require videos. Each exercise needs all three resolutions (1080×1080, 1080×1920, 1920×1080).

---

### A) General Fitness Catalog (20 exercises)

**Core Exercises:**
1. plank
2. side-plank
3. mountain-climbers
4. bicycle-crunches
5. dead-bug
6. russian-twists
7. bear-crawl

**Strength Exercises:**
8. push-ups
9. squats
10. wall-sit
11. burpees
12. tricep-dips

**Cardio Exercises:**
13. jumping-jacks

**Flexibility Exercises:**
14. downward-dog
15. child-pose
16. forward-fold

**Balance Exercises:**
17. tree-pose
18. warrior-3

> **Note**: The following exercises from the General Fitness catalog also appear in the Women's Health catalog and are listed only in section B to avoid duplication:
> - bird-dog
> - glute-bridges (glute-bridge)
> - lunges (lunge)
> - calf-raises (calf-raise)
> - single-leg-stand
> - cat-cow (cat-cow-stretch)
> - high-knees (high-knees-cardio)
> - butt-kicks (butt-kicks-cardio)
>
> **Excluded**: finger-roll (hand warmup exercise - not prioritized for video production)

---

### B) Women's Health Catalog (40 exercises)

**Strength Exercises (NHS):**
1. chair-squat
2. wall-push-up
3. glute-bridge
4. desk-plank
5. bird-dog
6. lunge
7. calf-raise
8. modified-push-up
9. arm-circles
10. step-up-stair

**Flexibility & Mobility Exercises (Mayo Clinic):**
11. neck-rolls
12. shoulder-rolls
13. cat-cow-stretch
14. seated-spinal-twist
15. hamstring-stretch
16. calf-stretch
17. quad-stretch
18. hip-opener (butterfly)
19. chest-opener
20. side-stretch

**Cardio Exercises (WHO):**
21. marching-in-place
22. step-touch
23. jumping-jacks-modified
24. butt-kicks-cardio
25. high-knees-cardio
26. side-steps-cardio
27. seated-cardio-arm-pumps
28. dance-moves-basic

**Balance & Posture Exercises (Mayo Clinic):**
29. single-leg-stand
30. heel-to-toe-walk
31. balance-hold-arm-raise
32. seated-twists
33. tandem-balance
34. chair-posture-hold

**Special Women's Health Exercises (WHO & NHS):**
35. pelvic-tilts
36. kegel-exercise
37. gentle-yoga-menstrual (flow sequence)
38. breathing-exercise
39. prenatal-stretch
40. postnatal-core

---

### Summary Statistics
- **Total Unique Exercises**: 60 exercises (20 General Fitness + 40 Women's Health)
- **Total Videos Required**: 60 × 3 resolutions = **180 video files**
- **Estimated Total File Size**: ~600 MB (assuming ~3.3MB average per video)

### Notes on Exercise Selection
- **Duplicates handled**: 8 exercises that appear in both catalogs are listed only once in the Women's Health section to avoid redundancy
- **Excluded exercises**: 
  - `finger-roll` - Hand warmup exercise not prioritized for video production
- **Women's Health catalog specializations**:
  - Prenatal/postnatal care exercises
  - Menstrual discomfort relief movements
  - Pelvic floor strengthening
  - Menopause symptom management
  - Fall prevention for older women
  - Office-friendly exercises (seated, desk-based)
- **General Fitness catalog focus**: Core full-body training suitable for all fitness levels, with emphasis on strength, cardio, flexibility, and balance

---

## 11. Technical Validation Checklist

Before final delivery, each video must pass these checks:

- [ ] Format: MP4 with H.264 codec
- [ ] Frame rate: 30 fps
- [ ] Duration: 3-5 seconds
- [ ] File size: <5MB
- [ ] Resolution: Matches specification exactly
- [ ] No audio track present
- [ ] Full body visible at all times
- [ ] Character centered in frame
- [ ] Background is clean and neutral
- [ ] Lighting is bright and even
- [ ] First and last frames are identical
- [ ] Loops seamlessly without jump
- [ ] No camera movement
- [ ] Exercise form is correct
- [ ] Movement is smooth and natural
- [ ] File naming follows convention
- [ ] Metadata is accurate

---

## 12. Revision & Update Policy

### Version Numbering
- Initial videos: `v1`
- First revision: `v2`
- Major changes: Increment version number

### When Revisions Are Needed
- Incorrect exercise form
- Technical issues (stuttering, artifacts, etc.)
- File size exceeds limits
- Video doesn't loop properly
- Character visibility issues

### Revision Process
1. Identify specific issues
2. Document required changes
3. Re-render affected videos
4. Update version number
5. Update metadata.json

---

## 13. Reference Materials

### Existing Videos
Current video examples can be found at:
- `apps/frontend/public/videos/`
- Current format: WebM (will be replaced with MP4)

### Exercise Definitions
- **Source file**: `apps/frontend/src/data/exercises.ts`
- Contains: Exercise IDs, names, descriptions, instructions

### Media Index
- **Source file**: `apps/frontend/public/exercise_media.json`
- Contains: Current video metadata structure

### Technical Implementation
- **Video loader**: `apps/frontend/src/utils/loadExerciseMedia.ts`
- **Variant selector**: `apps/frontend/src/utils/selectVideoVariant.ts`
- **React hook**: `apps/frontend/src/hooks/useExerciseVideo.ts`

---

## 14. Questions & Clarifications

Before starting work, please clarify:

1. **Character gender preference**: Male, female, or both?
2. **Batch size**: Deliver all at once or in batches?
3. **Timeline**: Expected delivery date?
4. **Revisions**: How many revision rounds are included?
5. **Source files**: Are source project files included in delivery?
6. **Sample approval**: Which exercise should be done first for approval?

---

## 15. Contact & Support

For questions or clarifications regarding these specifications:
- Review this document thoroughly first
- Check existing videos in `apps/frontend/public/videos/` for reference
- Submit questions in a consolidated list for efficient communication

---

**End of Specifications**

*This document defines the technical requirements for RepCue exercise videos. Adherence to these specifications ensures consistent quality, performance, and user experience across all devices and platforms.*
