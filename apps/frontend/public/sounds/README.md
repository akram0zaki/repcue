# Celebration Sound Files

This directory should contain celebration sound files for the gamification features.

## Required Files

The following sound files are referenced by the `microInteractions.ts` utility:

### 1. `achievement.mp3`
- **Used For**: Personal records, badge unlocks
- **Duration**: 1-2 seconds
- **Style**: Triumphant, celebratory (e.g., fanfare, chime)
- **Volume**: Should be normalized to moderate level

### 2. `milestone.mp3`
- **Used For**: Streak milestones (5-day, 10-day, 30-day)
- **Duration**: 1-2 seconds
- **Style**: Uplifting, motivational (e.g., ascending tones, success jingle)
- **Volume**: Should be normalized to moderate level

### 3. `complete.mp3`
- **Used For**: Workout completion
- **Duration**: 1-2 seconds
- **Style**: Satisfying, completion sound (e.g., success chime, positive tone)
- **Volume**: Should be normalized to moderate level

## Implementation Status

⚠️ **PLACEHOLDER**: These sound files are not yet implemented. The app will work without them, but celebration sounds will not play even if enabled in settings.

## Audio Requirements

- **Format**: MP3 (for broad browser compatibility)
- **Sample Rate**: 44.1 kHz recommended
- **Bit Rate**: 128 kbps minimum
- **Channels**: Stereo or mono
- **Max File Size**: < 50 KB per file (keep them lightweight)

## Free Sound Resources

You can find free celebration sounds at:
- **Freesound.org**: https://freesound.org/
- **Zapsplat**: https://www.zapsplat.com/
- **Mixkit**: https://mixkit.co/free-sound-effects/

## Testing

After adding sound files:
1. Enable "Celebration Sounds" in Settings → AI Coach
2. Complete a workout to hear `complete.mp3`
3. Beat a personal record to hear `achievement.mp3`
4. Reach a streak milestone to hear `milestone.mp3`

## Technical Details

Sound playback is controlled by:
- **Utility**: `apps/frontend/src/utils/microInteractions.ts`
- **Function**: `playSound(type: SoundCueType, enabled: boolean)`
- **Volume**: Plays at 50% (0.5) volume by default
- **Caching**: Sounds are preloaded and cached for better performance
- **Accessibility**: Respects user's "Celebration Sounds" setting
