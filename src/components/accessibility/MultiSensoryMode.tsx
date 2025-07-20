import React, { useEffect, useState, useRef } from 'react';
import { Creature } from '../../types/GameTypes';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';

interface MultiSensoryModeProps {
  cursorPosition: { x: number; y: number };
  creaturePosition: { x: number; y: number };
  detectionRadius: number;
  gameAreaSize: { width: number; height: number };
  onCreatureFound: () => void;
  isFound: boolean;
  creature: Creature;
}

const MultiSensoryMode: React.FC<MultiSensoryModeProps> = ({
  cursorPosition,
  creaturePosition,
  detectionRadius,
  gameAreaSize,
  onCreatureFound,
  isFound,
  creature
}) => {
  const [proximity, setProximity] = useState(0);
  const { playSpatialAudio } = useAudio();
  const { vibrate } = useHaptics();
  const lastAudioTimeRef = useRef(0);

  useEffect(() => {
    if (isFound) return;

    const distance = Math.sqrt(
      Math.pow(cursorPosition.x - creaturePosition.x, 2) +
      Math.pow(cursorPosition.y - creaturePosition.y, 2)
    );

    const proximityValue = Math.max(0, 1 - (distance / detectionRadius));
    setProximity(proximityValue);

    if (proximityValue > 0) {
      // Audio feedback
      const now = Date.now();
      if (now - lastAudioTimeRef.current > 300) {
      const panValue = ((cursorPosition.x - creaturePosition.x) / gameAreaSize.width) * 2;
      const frequency = 250 + (proximityValue * 400);
      const volume = proximityValue * 0.3;
      playSpatialAudio(frequency, volume, panValue, 100);
        lastAudioTimeRef.current = now;
      }

      // Haptic feedback
      if (proximityValue > 0.3) {
        vibrate(50 + (proximityValue * 100));
      }

      // Auto-discovery only at very close range (much smaller threshold)
      if (distance < 15) {
        onCreatureFound();
      }
    }
  }, [cursorPosition, creaturePosition, detectionRadius, gameAreaSize, onCreatureFound, isFound, playSpatialAudio, vibrate]);

  const glowIntensity = proximity * 40;
  const backgroundColor = `rgba(${creature.color}, ${proximity * 0.2})`;

  return (
    <div className="absolute inset-0">
      {/* Combined Visual and Audio Feedback */}
      <div
        className="absolute inset-0 transition-all duration-200 rounded-xl"
        style={{
          backgroundColor,
          boxShadow: `inset 0 0 ${glowIntensity}px rgba(${creature.color}, ${proximity * 0.5})`
        }}
      />

      {/* Particle Effects */}
      {proximity > 0.4 && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(Math.floor(proximity * 10))].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: `rgb(${creature.color})`,
                left: `${creaturePosition.x + (Math.random() - 0.5) * 100}px`,
                top: `${creaturePosition.y + (Math.random() - 0.5) * 100}px`,
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      )}

      {/* Creature Reveal with Enhanced Effects */}
      {isFound && (
        <div
          className="absolute text-6xl animate-bounce"
          style={{
            left: creaturePosition.x - 30,
            top: creaturePosition.y - 30,
            filter: 'drop-shadow(0 0 30px rgba(255, 255, 255, 1))',
            textShadow: `0 0 20px rgb(${creature.color})`
          }}
        >
          {creature.icon}
        </div>
      )}

      {/* Multi-Modal Feedback Panel */}
      <div className="absolute top-4 left-4 bg-black/80 p-3 rounded-lg text-white">
        <div className="text-xs mb-2">Multi-Sensory Feedback</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs">Audio:</span>
            <div className="w-16 h-1 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all duration-200"
                style={{ width: `${proximity * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Visual:</span>
            <div className="w-16 h-1 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-green-400 transition-all duration-200"
                style={{ width: `${proximity * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Haptic:</span>
            <div className="w-16 h-1 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-purple-400 transition-all duration-200"
                style={{ width: `${Math.max(0, (proximity - 0.3) * 1.43) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSensoryMode;