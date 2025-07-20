import React, { useEffect, useRef } from 'react';
import { Creature } from '../../types/GameTypes';
import { useAudio } from '../../hooks/useAudio';

interface AudioModeProps {
  cursorPosition: { x: number; y: number };
  creaturePosition: { x: number; y: number };
  detectionRadius: number;
  gameAreaSize: { width: number; height: number };
  onCreatureFound: () => void;
  isFound: boolean;
  creature: Creature;
}

const AudioMode: React.FC<AudioModeProps> = ({
  cursorPosition,
  creaturePosition,
  detectionRadius,
  gameAreaSize,
  onCreatureFound,
  isFound,
  creature
}) => {
  const { startForestAmbience, stopForestAmbience, playCreatureProximitySound } = useAudio();
  const hasStartedAmbience = useRef(false);
  const lastProximityRef = useRef(0);

  useEffect(() => {
    if (!hasStartedAmbience.current) {
      startForestAmbience();
      hasStartedAmbience.current = true;
    }

    return () => {
      stopForestAmbience();
    };
  }, [startForestAmbience, stopForestAmbience]);

  useEffect(() => {
    if (isFound) return;

    const distance = Math.sqrt(
      Math.pow(cursorPosition.x - creaturePosition.x, 2) +
      Math.pow(cursorPosition.y - creaturePosition.y, 2)
    );

    const proximity = Math.max(0, 1 - (distance / detectionRadius));

    // Only play sound if proximity changed significantly to avoid constant audio
    if (proximity > 0 && Math.abs(proximity - lastProximityRef.current) > 0.1) {
      // Play creature-specific proximity sound
      playCreatureProximitySound(creature.id, proximity);
      lastProximityRef.current = proximity;
    }

    // Auto-discovery only at very close range (much smaller threshold)
    if (distance < 15) {
      onCreatureFound();
    }
  }, [cursorPosition, creaturePosition, detectionRadius, onCreatureFound, isFound, creature.id, playCreatureProximitySound]);

  return (
    <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
      {isFound ? (
        <div className="text-center p-8 bg-emerald-800/80 rounded-xl border border-emerald-500">
          <div className="text-6xl mb-4">{creature.icon}</div>
          <h3 className="text-2xl font-bold text-emerald-300 mb-2">
            {creature.name} Found!
          </h3>
          <p className="text-emerald-200">Listen for the fun fact!</p>
        </div>
      ) : (
        <div className="text-center p-8">
          <h3 className="text-2xl font-bold text-white mb-4">
            Audio-First Mode Active
          </h3>
          <p className="text-gray-300 mb-4">
            Navigate using arrow keys and listen for creature sounds
          </p>
          <div className="text-sm text-gray-400">
            Forest ambience plays constantly. Creature sounds get stronger as you get closer to the {creature.name}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioMode;