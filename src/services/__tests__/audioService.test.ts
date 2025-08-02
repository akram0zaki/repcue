import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AudioService } from '../audioService'

describe('AudioService', () => {
  let audioService: AudioService
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAudioContext: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOscillator: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGainNode: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset the AudioService singleton
    // @ts-expect-error - accessing private static property for testing
    AudioService.instance = undefined

    // Mock document for event listeners
    global.document = {
      ...global.document,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      createElement: vi.fn(() => ({
        setAttribute: vi.fn(),
        style: {},
        textContent: '',
        className: ''
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // Create a new navigator mock without the vibrate property at all
      const originalNavigator = global.navigator
      const { vibrate: _vibrate, ...navigatorWithoutVibrate } = originalNavigator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.navigator = navigatorWithoutVibrate as any
      
      // Reset singleton to pick up the change
      // @ts-expect-error - accessing private static property for testing
      AudioService.instance = undefined
      
      // Create new instance to test without vibration
      const newService = AudioService.getInstance()
      expect(newService.isVibrationSupported()).toBe(false)
      
      // Restore original navigator
      global.navigator = originalNavigator
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
      // @ts-expect-error - accessing private static property for testing
      AudioService.instance = undefined
      
      const suspendedService = AudioService.getInstance()
      await suspendedService.playIntervalBeep()

      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should handle missing audio context gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    it('should create screen reader accessible announcement', () => {
      // Mock document methods are already set up in beforeEach
      const mockDiv = {
        setAttribute: vi.fn(),
        style: {},
        textContent: '',
        className: ''
      }
      
      // @ts-expect-error - mock setup
      global.document.createElement = vi.fn(() => mockDiv)
      
      audioService.announceText('Test announcement')
      
      expect(global.document.createElement).toHaveBeenCalledWith('div')
      expect(mockDiv.setAttribute).toHaveBeenCalledWith('aria-live', 'polite')
      expect(mockDiv.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true')
      expect(mockDiv.className).toBe('sr-only')
      expect(mockDiv.textContent).toBe('Test announcement')
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockDiv)
    })
  })

  describe('getAudioState', () => {
    it('should return audio context state', () => {
      // Force initialize the audio context
      // @ts-expect-error - accessing private method for testing
      audioService.initializeAudioContext()
      
      // Set the mock state
      mockAudioContext.state = 'running'
      expect(audioService.getAudioState()).toBe('running')
    })

    it('should return "unavailable" when no audio context', () => {
      // @ts-expect-error - accessing private property for testing
      audioService.audioContext = null
      expect(audioService.getAudioState()).toBe('not-initialized')
    })
  })

  describe('playRestStartFeedback', () => {
    it('should play rest start sound and vibration when enabled', async () => {
      vi.spyOn(audioService, 'playRestStartSound').mockResolvedValue()
      
      await audioService.playRestStartFeedback(true, true)
      
      expect(audioService.playRestStartSound).toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200])
    })

    it('should only play sound when only sound enabled', async () => {
      vi.spyOn(audioService, 'playRestStartSound').mockResolvedValue()
      
      await audioService.playRestStartFeedback(true, false)
      
      expect(audioService.playRestStartSound).toHaveBeenCalled()
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })
  })

  describe('playRestEndFeedback', () => {
    it('should play rest end sound and vibration when enabled', async () => {
      vi.spyOn(audioService, 'playRestEndSound').mockResolvedValue()
      
      await audioService.playRestEndFeedback(true, true)
      
      expect(audioService.playRestEndSound).toHaveBeenCalled()
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100, 50, 300])
    })
  })

  describe('playRestStartSound', () => {
    it('should create low tone for rest start', async () => {
      await audioService.playRestStartSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(mockOscillator.frequency.value).toBe(300) // Low tone for rest
      expect(mockOscillator.type).toBe('sine')
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })
  })

  describe('playRestEndSound', () => {
    it('should create ascending tones for rest end', async () => {
      vi.spyOn(global, 'setTimeout')
      
      await audioService.playRestEndSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockOscillator.frequency.value).toBe(500) // First tone
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 150)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 300)
    })
  })

  describe('dispose', () => {
    it('should close audio context', () => {
      // Force initialize the audio context
      // @ts-expect-error - accessing private method for testing
      audioService.initializeAudioContext()
      
      audioService.dispose()
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('should handle disposal without audio context', () => {
      // @ts-expect-error - accessing private property for testing
      audioService.audioContext = null
      expect(() => audioService.dispose()).not.toThrow()
    })
  })
}) 