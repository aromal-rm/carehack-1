import React, { useEffect, useState } from 'react';
import { useAudio } from '../hooks/useAudio';

interface ProximityEngineProps {
  cursorPosition: { x: number; y: number };
  creaturePosition: { x: number; y: number };
  detectionRadius: number;
  level: number;
}

const ProximityEngine: React.FC<ProximityEngineProps> = ({
  cursorPosition,
  creaturePosition,
  detectionRadius,
  level
}) => {
  const [proximity, setProximity] = useState(0);
  const [audioFeedback, setAudioFeedback] = useState({ frequency: 200, volume: 0 });
  const { playTone } = useAudio();

  useEffect(() => {
    const distance = Math.sqrt(
      Math.pow(cursorPosition.x - creaturePosition.x, 2) +
      Math.pow(cursorPosition.y - creaturePosition.y, 2)
    );

    const normalizedDistance = Math.min(distance / detectionRadius, 1);
    const proximityValue = Math.max(0, 1 - normalizedDistance);
    
    setProximity(proximityValue);

    // Calculate audio feedback
    const baseFrequency = 200;
    const maxFrequency = 800;
    const frequency = baseFrequency + (proximityValue * (maxFrequency - baseFrequency));
    const volume = proximityValue * 0.3; // Keep volume reasonable

    setAudioFeedback({ frequency, volume });

    // Difficulty adjustments
    const difficultyDelay = Math.max(0, (level - 1) * 50);
    
    if (proximityValue > 0 && volume > 0.05) {
      setTimeout(() => {
        playTone(frequency, volume, 200);
      }, difficultyDelay);
    }
  }, [cursorPosition, creaturePosition, detectionRadius, level, playTone]);

  return null; // This component handles logic only, no rendering
};

export default ProximityEngine;