import { useCallback, useRef, useEffect } from 'react';

export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeTonesRef = useRef<Set<OscillatorNode>>(new Set());
  const forestSoundRef = useRef<OscillatorNode | null>(null);
  const forestGainRef = useRef<GainNode | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const initializeAudio = useCallback(async () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context on user interaction if needed
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Preload sound files
      const soundFiles = [
        '/sounds/creatures/owl.mp3',
        '/sounds/creatures/fox.mp3', 
        '/sounds/creatures/deer.mp3',
        '/sounds/creatures/squirrel.mp3',
        '/sounds/creatures/phoenix.mp3',
        '/sounds/ambient/forest.mp3'
      ];

      soundFiles.forEach(soundFile => {
        const audio = new Audio(soundFile);
        audio.preload = 'auto';
        audio.onerror = () => {
          console.warn(`Could not load sound file: ${soundFile}`);
        };
        audioElementsRef.current.set(soundFile, audio);
      });
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }, []);

  const startForestAmbience = useCallback(() => {
    if (forestSoundRef.current) return;

    // Try to play actual forest sound file first
    const forestAudio = audioElementsRef.current.get('/sounds/ambient/forest.mp3');
    if (forestAudio) {
      forestAudio.loop = true;
      forestAudio.volume = 0.3;
      forestAudio.play().catch(() => {
        console.warn('Could not play forest ambience file, using synthesized sound');
        startSynthesizedForestAmbience();
      });
      return;
    }

    startSynthesizedForestAmbience();
  }, []);

  const startSynthesizedForestAmbience = useCallback(() => {
    if (!audioContextRef.current || forestSoundRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const filterNode = audioContextRef.current.createBiquadFilter();

      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      // Create a low-frequency forest ambience
      oscillator.frequency.setValueAtTime(80, audioContextRef.current.currentTime);
      oscillator.type = 'sawtooth';
      
      // Low-pass filter for natural sound
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);

      forestSoundRef.current = oscillator;
      forestGainRef.current = gainNode;

      oscillator.start();
    } catch (error) {
      console.warn('Error starting forest ambience:', error);
    }
  }, []);

  const stopForestAmbience = useCallback(() => {
    // Stop actual forest sound file
    const forestAudio = audioElementsRef.current.get('/sounds/ambient/forest.mp3');
    if (forestAudio) {
      forestAudio.pause();
      forestAudio.currentTime = 0;
    }

    // Stop synthesized forest sound
    if (forestSoundRef.current) {
      try {
        forestSoundRef.current.stop();
      } catch (error) {
        // Already stopped
      }
      forestSoundRef.current = null;
      forestGainRef.current = null;
    }
  }, []);

  const playTone = useCallback((frequency: number, volume: number, duration: number) => {
    if (!audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration / 1000);

      activeTonesRef.current.add(oscillator);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);

      oscillator.onended = () => {
        activeTonesRef.current.delete(oscillator);
      };
    } catch (error) {
      console.warn('Error playing tone:', error);
    }
  }, []);

  const playSpatialAudio = useCallback((frequency: number, volume: number, pan: number, duration: number) => {
    if (!audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const pannerNode = audioContextRef.current.createStereoPanner();

      oscillator.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(audioContextRef.current.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine';

      // Clamp pan value between -1 and 1
      const clampedPan = Math.max(-1, Math.min(1, pan));
      pannerNode.pan.setValueAtTime(clampedPan, audioContextRef.current.currentTime);

      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration / 1000);

      activeTonesRef.current.add(oscillator);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);

      oscillator.onended = () => {
        activeTonesRef.current.delete(oscillator);
      };
    } catch (error) {
      console.warn('Error playing spatial audio:', error);
    }
  }, []);

  const playSound = useCallback(async (soundFile: string) => {
    // Try to play actual sound file first
    const fullPath = `/sounds/creatures/${soundFile}`;
    const audio = audioElementsRef.current.get(fullPath);
    
    if (audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch (error) {
        console.warn(`Could not play sound file: ${soundFile}, using synthesized sound`);
      }
    }

    // Fallback to synthesized sound
    const creatureSounds: { [key: string]: { frequency: number; duration: number } } = {
      'owl.mp3': { frequency: 400, duration: 2000 },
      'fox.mp3': { frequency: 600, duration: 1800 },
      'deer.mp3': { frequency: 300, duration: 2200 },
      'squirrel.mp3': { frequency: 800, duration: 1600 },
      'phoenix.mp3': { frequency: 500, duration: 2500 }
    };

    const sound = creatureSounds[soundFile];
    if (sound) {
      playTone(sound.frequency, 0.4, sound.duration);
    }
  }, [playTone]);

  const playCreatureProximitySound = useCallback((creatureType: string, proximity: number) => {
    if (!audioContextRef.current || proximity <= 0) return;

    const creatureFrequencies: { [key: string]: number } = {
      'owl': 400,
      'fox': 600, 
      'deer': 300,
      'squirrel': 800,
      'phoenix': 500
    };

    const baseFreq = creatureFrequencies[creatureType] || 400;
    const frequency = baseFreq + (proximity * 200);
    const volume = proximity * 0.3;
    
    playTone(frequency, volume, 200);
  }, [playTone]);

  const stopAllTones = useCallback(() => {
    stopForestAmbience();
    activeTonesRef.current.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch (error) {
        // Oscillator already stopped
      }
    });
    activeTonesRef.current.clear();
  }, [stopForestAmbience]);

  useEffect(() => {
    return () => {
      stopAllTones();
    };
  }, [stopAllTones]);

  return {
    initializeAudio,
    startForestAmbience,
    stopForestAmbience,
    playTone,
    playSpatialAudio,
    playSound,
    playCreatureProximitySound,
    stopAllTones
  };
};