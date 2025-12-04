import logger from '../utils/logger'
import { 
  isNativePlatform, 
  triggerHaptic, 
  triggerNotificationHaptic, 
  triggerImpactHaptic 
} from '../utils/nativeCapabilities';

/**
 * Audio and haptic feedback service for exercise intervals
 * Handles beeps, vibrations, and accessibility announcements
 * 
 * Enhanced for iOS native app with Capacitor Haptics plugin
 */
export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  private constructor() {
    // Initialize audio context on first user interaction
    this.initializeOnUserInteraction();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Initialize audio context after user interaction (required by browsers)
   */
  private initializeOnUserInteraction(): void {
    const initAudio = () => {
      if (!this.isInitialized) {
        this.initializeAudioContext();
        this.isInitialized = true;
        // Remove listeners after first initialization
        document.removeEventListener('click', initAudio);
        document.removeEventListener('touchstart', initAudio);
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (error) {
  logger.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Play interval beep sound
   */
  public async playIntervalBeep(volume: number = 0.45): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.audioContext) {
      this.createBeepSound(800, 0.2, volume); // 800Hz, 200ms duration, 50% louder default volume
    }
  }

  /**
   * Play start sound (different from interval beep)
   */
  public async playStartSound(): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.audioContext) {
      // Two-tone start sound: high then low
      this.createBeepSound(1000, 0.2, 0.15);
      setTimeout(() => {
        this.createBeepSound(600, 0.2, 0.15);
      }, 250);
    }
  }

  /**
   * Play stop/finish sound
   */
  public async playStopSound(): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.audioContext) {
      // Three-tone finish sound: low, mid, high
      this.createBeepSound(400, 0.15, 0.12);
      setTimeout(() => {
        this.createBeepSound(600, 0.15, 0.12);
      }, 180);
      setTimeout(() => {
        this.createBeepSound(800, 0.3, 0.12);
      }, 360);
    }
  }

  /**
   * Create beep sound using Web Audio API
   */
  private createBeepSound(frequency: number, duration: number, volume: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Smooth volume envelope to avoid clicks
    const now = this.audioContext.currentTime;
    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Trigger vibration if supported
   * Enhanced for iOS with native haptics via Capacitor
   */
  public vibrate(pattern: number | number[] = 200): void {
    // Use native haptics on iOS for better feel
    if (isNativePlatform()) {
      // Convert pattern to appropriate haptic type
      const intensity = Array.isArray(pattern) 
        ? pattern.reduce((a, b) => a + b, 0) 
        : pattern;
      
      if (intensity > 150) {
        triggerImpactHaptic('heavy').catch(() => {});
      } else if (intensity > 50) {
        triggerImpactHaptic('medium').catch(() => {});
      } else {
        triggerImpactHaptic('light').catch(() => {});
      }
      return;
    }

    // Fallback to web vibration API
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        logger.warn('Vibration not supported or failed:', error);
      }
    }
  }

  /**
   * Play interval feedback (sound + vibration)
   * Enhanced for iOS with native haptics
   */
  public async playIntervalFeedback(soundEnabled: boolean, vibrationEnabled: boolean, volume: number = 0.45): Promise<void> {
    const promises: Promise<void>[] = [];

    if (soundEnabled) {
      promises.push(this.playIntervalBeep(volume));
    }

    if (vibrationEnabled) {
      if (isNativePlatform()) {
        // Use native haptic for crisp feedback on iOS
        promises.push(triggerHaptic('medium'));
      } else {
        this.vibrate(100); // Short vibration for web
      }
    }

    await Promise.all(promises);
  }

  /**
   * Play start feedback (sound + vibration)
   * Enhanced for iOS with success haptic
   */
  public async playStartFeedback(soundEnabled: boolean, vibrationEnabled: boolean): Promise<void> {
    const promises: Promise<void>[] = [];

    if (soundEnabled) {
      promises.push(this.playStartSound());
    }

    if (vibrationEnabled) {
      if (isNativePlatform()) {
        // Use success haptic for workout start on iOS
        promises.push(triggerNotificationHaptic('success'));
      } else {
        this.vibrate([100, 50, 100]); // Double vibration for web
      }
    }

    await Promise.all(promises);
  }

  /**
   * Play stop feedback (sound + vibration)
   * Enhanced for iOS with success haptic
   */
  public async playStopFeedback(soundEnabled: boolean, vibrationEnabled: boolean): Promise<void> {
    const promises: Promise<void>[] = [];

    if (soundEnabled) {
      promises.push(this.playStopSound());
    }

    if (vibrationEnabled) {
      if (isNativePlatform()) {
        // Use success haptic for workout completion on iOS
        promises.push(triggerNotificationHaptic('success'));
      } else {
        this.vibrate([100, 100, 100, 100, 200]); // Finish vibration pattern for web
      }
    }

    await Promise.all(promises);
  }

  /**
   * Play rest start feedback (different tone to indicate rest period)
   * Enhanced for iOS with warning haptic
   */
  public async playRestStartFeedback(soundEnabled: boolean, vibrationEnabled: boolean): Promise<void> {
    const promises: Promise<void>[] = [];

    if (soundEnabled) {
      promises.push(this.playRestStartSound());
    }

    if (vibrationEnabled) {
      if (isNativePlatform()) {
        // Use warning haptic to indicate rest period on iOS
        promises.push(triggerNotificationHaptic('warning'));
      } else {
        this.vibrate([200, 100, 200]); // Rest start vibration pattern for web
      }
    }

    await Promise.all(promises);
  }

  /**
   * Play rest end feedback (different tone to indicate rest ending)
   * Enhanced for iOS with success haptic
   */
  public async playRestEndFeedback(soundEnabled: boolean, vibrationEnabled: boolean): Promise<void> {
    const promises: Promise<void>[] = [];

    if (soundEnabled) {
      promises.push(this.playRestEndSound());
    }

    if (vibrationEnabled) {
      if (isNativePlatform()) {
        // Use success haptic for rest end on iOS (get ready!)
        promises.push(triggerNotificationHaptic('success'));
      } else {
        this.vibrate([100, 50, 100, 50, 300]); // Rest end vibration pattern for web
      }
    }

    await Promise.all(promises);
  }

  /**
   * Play rest start sound (low tone to indicate rest period)
   */
  public async playRestStartSound(): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.audioContext) {
      // Low tone for rest start (50% louder)
      this.createBeepSound(300, 0.4, 0.225);
    }
  }

  /**
   * Play rest end sound (ascending tones to indicate rest ending)
   */
  public async playRestEndSound(): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.audioContext) {
      // Ascending tones for rest end: low to high (50% louder)
      this.createBeepSound(500, 0.15, 0.18);
      setTimeout(() => {
        this.createBeepSound(700, 0.15, 0.18);
      }, 150);
      setTimeout(() => {
        this.createBeepSound(1000, 0.2, 0.225);
      }, 300);
    }
  }

  /**
   * Announce text for screen readers (accessibility)
   */
  public announceText(text: string): void {
    // Create a visually hidden element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    
    document.body.appendChild(announcement);
    announcement.textContent = text;

    // Remove after announcement (guard in JSDOM where body might be reset)
    setTimeout(() => {
      try {
        if (announcement.parentNode === document.body) {
          document.body.removeChild(announcement);
        } else {
          announcement.remove?.();
        }
      } catch {
        // ignore
      }
    }, 1000);
  }

  /**
   * Check if audio is supported
   */
  public isAudioSupported(): boolean {
    return !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  }

  /**
   * Check if vibration is supported
   * Enhanced to include native haptics support
   */
  public isVibrationSupported(): boolean {
    // Native platforms always support haptics via Capacitor
    if (isNativePlatform()) {
      return true;
    }
    return 'vibrate' in navigator;
  }

  /**
   * Get audio context state for debugging
   */
  public getAudioState(): string {
    return this.audioContext?.state || 'not-initialized';
  }

  /**
   * Cleanup audio context
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioService = AudioService.getInstance(); 