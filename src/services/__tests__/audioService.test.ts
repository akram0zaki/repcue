import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AudioService } from '../audioService'

describe('AudioService', () => {
  let audioService: AudioService
  let mockAudioContext: any
  let mockOscillator: any
  let mockGainNode: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset the AudioService singleton
    // @ts-ignore - accessing private static property for testing
    AudioService.instance = undefined

    // Mock AudioContext and related objects
    mockOscillator = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine'
    }

    mockGainNode = {
      connect: vi.fn(),
      gain: {
        value: 0,
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    }

    mockAudioContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGainNode),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      destination: {},
      currentTime: 0,
      state: 'running'
    }

    // Mock global AudioContext
    global.AudioContext = vi.fn(() => mockAudioContext)
    
    // Ensure navigator.vibrate is properly mocked
    if (!navigator.vibrate) {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
        configurable: true
      })
    } else {
      // If already exists, just mock the implementation
      vi.mocked(navigator.vibrate).mockReturnValue(true)
    }

    audioService = AudioService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AudioService.getInstance()
      const instance2 = AudioService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('audio support detection', () => {
    it('should detect audio support when AudioContext is available', () => {
      expect(audioService.isAudioSupported()).toBe(true)
    })

    it('should handle missing AudioContext gracefully', () => {
      global.AudioContext = undefined as any
      const service = AudioService.getInstance()
      expect(service.isAudioSupported()).toBe(false)
    })
  })

  describe('vibration support detection', () => {
    it('should detect vibration support when available', () => {
      expect(audioService.isVibrationSupported()).toBe(true)
    })

    it('should handle missing vibration API', () => {
      // Mock navigator.vibrate as undefined 
      const originalVibrate = navigator.vibrate
      // @ts-ignore - temporarily remove vibrate
      delete navigator.vibrate
      
      // Reset singleton to pick up the change
      // @ts-ignore - accessing private static property for testing
      AudioService.instance = undefined
      
      // Create new instance to test without vibration
      const newService = AudioService.getInstance()
      expect(newService.isVibrationSupported()).toBe(false)
      
      // Restore original vibrate
      if (originalVibrate) {
        Object.defineProperty(navigator, 'vibrate', {
          value: originalVibrate,
          writable: true,
          configurable: true
        })
      }
    })
  })

  describe('playIntervalBeep', () => {
    it('should create oscillator with correct frequency', async () => {
      await audioService.playIntervalBeep()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(mockOscillator.frequency.value).toBe(800)
      expect(mockOscillator.type).toBe('sine')
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('should resume suspended audio context', async () => {
      // Set audio context to suspended state and reset singleton
      mockAudioContext.state = 'suspended'
      // @ts-ignore - accessing private static property for testing
      AudioService.instance = undefined
      
      const suspendedService = AudioService.getInstance()
      await suspendedService.playIntervalBeep()

      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should handle missing audio context gracefully', async () => {
      global.AudioContext = undefined as any
      
      await expect(audioService.playIntervalBeep()).resolves.not.toThrow()
    })
  })

  describe('playStartSound', () => {
    it('should create two-tone start sound', async () => {
      vi.spyOn(global, 'setTimeout')
      
      await audioService.playStartSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockOscillator.frequency.value).toBe(1000) // First tone
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 250)
    })
  })

  describe('playStopSound', () => {
    it('should create three-tone finish sound', async () => {
      vi.spyOn(global, 'setTimeout')
      
      await audioService.playStopSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockOscillator.frequency.value).toBe(400) // First tone
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 180)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 360)
    })
  })

  describe('vibrate', () => {
    it('should call navigator.vibrate with default pattern', () => {
      audioService.vibrate()
      
      expect(navigator.vibrate).toHaveBeenCalledWith(200)
    })

    it('should call navigator.vibrate with custom pattern', () => {
      const pattern = [100, 50, 100]
      audioService.vibrate(pattern)
      
      expect(navigator.vibrate).toHaveBeenCalledWith(pattern)
    })

    it('should handle vibration errors gracefully', () => {
      vi.mocked(navigator.vibrate).mockImplementation(() => {
        throw new Error('Vibration failed')
      })
      
      expect(() => audioService.vibrate()).not.toThrow()
    })
  })

  describe('playIntervalFeedback', () => {
    it('should play sound when sound is enabled', async () => {
      vi.spyOn(audioService, 'playIntervalBeep').mockResolvedValue()
      
      await audioService.playIntervalFeedback(true, false)
      
      expect(audioService.playIntervalBeep).toHaveBeenCalled()
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })

    it('should vibrate when vibration is enabled', async () => {
      vi.spyOn(audioService, 'playIntervalBeep').mockResolvedValue()
      
      await audioService.playIntervalFeedback(false, true)
      
      expect(audioService.playIntervalBeep).not.toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith(100)
    })

    it('should play both sound and vibration when both enabled', async () => {
      vi.spyOn(audioService, 'playIntervalBeep').mockResolvedValue()
      
      await audioService.playIntervalFeedback(true, true)
      
      expect(audioService.playIntervalBeep).toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith(100)
    })

    it('should do nothing when both disabled', async () => {
      vi.spyOn(audioService, 'playIntervalBeep').mockResolvedValue()
      
      await audioService.playIntervalFeedback(false, false)
      
      expect(audioService.playIntervalBeep).not.toHaveBeenCalled()
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })
  })

  describe('playStartFeedback', () => {
    it('should play start sound and double vibration when enabled', async () => {
      vi.spyOn(audioService, 'playStartSound').mockResolvedValue()
      
      await audioService.playStartFeedback(true, true)
      
      expect(audioService.playStartSound).toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100])
    })
  })

  describe('playStopFeedback', () => {
    it('should play stop sound and finish vibration when enabled', async () => {
      vi.spyOn(audioService, 'playStopSound').mockResolvedValue()
      
      await audioService.playStopFeedback(true, true)
      
      expect(audioService.playStopSound).toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 100, 100, 100, 200])
    })
  })

  describe('announceText', () => {
    it('should create and configure speech synthesis utterance', () => {
      const mockUtterance = {
        text: '',
        rate: 0,
        volume: 0
      } as any
      const mockSpeak = vi.fn()
      
      global.SpeechSynthesisUtterance = vi.fn(() => mockUtterance) as any
      global.speechSynthesis = { speak: mockSpeak } as any
      
      audioService.announceText('Test announcement')
      
      expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Test announcement')
      expect(mockUtterance.rate).toBe(0.9)
      expect(mockUtterance.volume).toBe(0.7)
      expect(mockSpeak).toHaveBeenCalledWith(mockUtterance)
    })

    it('should handle missing speech synthesis gracefully', () => {
      global.SpeechSynthesisUtterance = undefined as any
      global.speechSynthesis = undefined as any
      
      expect(() => audioService.announceText('Test')).not.toThrow()
    })
  })

  describe('getAudioState', () => {
    it('should return audio context state', () => {
      mockAudioContext.state = 'running'
      expect(audioService.getAudioState()).toBe('running')
    })

    it('should return "unavailable" when no audio context', () => {
      global.AudioContext = undefined as any
      const service = AudioService.getInstance()
      expect(service.getAudioState()).toBe('unavailable')
    })
  })

  describe('dispose', () => {
    it('should close audio context', async () => {
      await audioService.dispose()
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('should handle disposal without audio context', async () => {
      global.AudioContext = undefined as any
      const service = AudioService.getInstance()
      await expect(service.dispose()).resolves.not.toThrow()
    })
  })
}) 