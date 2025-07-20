import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AccessibilityMode } from '../types/GameTypes';
import ProximityEngine from './ProximityEngine';
import CreatureFactBox from './CreatureFactBox';
import AudioMode from './accessibility/AudioMode';
import VisualMode from './accessibility/VisualMode';
import MultiSensoryMode from './accessibility/MultiSensoryMode';
import { creatures } from '../data/creatures';
import { useTalkBack } from '../hooks/useTalkBack';
import { useAudio } from '../hooks/useAudio';

interface GameEngineProps {
  level: number;
  accessibilityMode: AccessibilityMode;
  onLevelComplete: () => void;
  talkBackEnabled: boolean;
}

const GameEngine: React.FC<GameEngineProps> = ({
  level,
  accessibilityMode,
  onLevelComplete,
  talkBackEnabled
}) => {
  const [gameAreaSize, setGameAreaSize] = useState({ width: 800, height: 600 });
  const [cursorPosition, setCursorPosition] = useState({ x: 100, y: 100 });
  const [isFound, setIsFound] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const [currentFact, setCurrentFact] = useState('');
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const { speak } = useTalkBack(talkBackEnabled);
  const { playSound } = useAudio();
  
  const currentCreature = creatures[level - 1];

  useEffect(() => {
    const updateGameAreaSize = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setGameAreaSize({ width: rect.width, height: rect.height });
      }
    };

    updateGameAreaSize();
    window.addEventListener('resize', updateGameAreaSize);
    return () => window.removeEventListener('resize', updateGameAreaSize);
  }, []);

  useEffect(() => {
    // Give initial instructions when level starts
    const creature = creatures.find(c => c.level === level);
    if (creature) {
      speak(`Level ${level}: Find the hidden ${creature.name}. Move your cursor slowly and listen for audio cues. Press Enter when you think you've found it.`);
    }
  }, [level, speak]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (gameAreaRef.current && !isFound) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPosition({ x, y });
    }
  }, [isFound]);

  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (gameAreaRef.current && !isFound) {
      e.preventDefault();
      const rect = gameAreaRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setCursorPosition({ x, y });
    }
  }, [isFound]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isFound) return;

    const moveDistance = 20;
    let newPosition = { ...cursorPosition };

    switch (e.key) {
      case 'ArrowUp':
        newPosition.y = Math.max(0, cursorPosition.y - moveDistance);
        break;
      case 'ArrowDown':
        newPosition.y = Math.min(gameAreaSize.height, cursorPosition.y + moveDistance);
        break;
      case 'ArrowLeft':
        newPosition.x = Math.max(0, cursorPosition.x - moveDistance);
        break;
      case 'ArrowRight':
        newPosition.x = Math.min(gameAreaSize.width, cursorPosition.x + moveDistance);
        break;
      case 'Enter':
      case ' ':
        handleCreatureFound();
        return;
    }

    setCursorPosition(newPosition);
  }, [cursorPosition, gameAreaSize, isFound]);

  const handleCreatureFound = useCallback(() => {
    if (isFound) return;

    setIsFound(true);
    
    // Play creature sound after a short delay
    setTimeout(() => {
      playSound(currentCreature.soundFile);
    }, 500);
    
    const randomFact = currentCreature.facts[Math.floor(Math.random() * currentCreature.facts.length)];
    setCurrentFact(randomFact);
    setShowFact(true);
    
    // Announce discovery
    speak(`${currentCreature.name} found! Listen for the fun fact.`, 'assertive');
  }, [isFound, currentCreature, playSound]);

  const handleFactComplete = useCallback(() => {
    setShowFact(false);
    onLevelComplete();
  }, [onLevelComplete]);

  const renderAccessibilityMode = () => {
    const commonProps = {
      cursorPosition,
      creaturePosition: currentCreature.position,
      detectionRadius: currentCreature.detectionRadius,
      gameAreaSize,
      onCreatureFound: handleCreatureFound,
      isFound,
      creature: currentCreature
    };

    switch (accessibilityMode) {
      case 'audio-first':
        return <AudioMode {...commonProps} />;
      case 'visual-first':
        return <VisualMode {...commonProps} />;
      case 'multi-sensory':
      default:
        return <MultiSensoryMode {...commonProps} />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Game Instructions */}
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-emerald-300 mb-2">
          Level {level}: The {currentCreature.name} Grove
        </h2>
        <p className="text-emerald-200">
          Use your {accessibilityMode.replace('-', ' ')} to find the hidden {currentCreature.name}
        </p>
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative bg-emerald-900/50 rounded-xl border-2 border-emerald-600/30 mx-auto backdrop-blur-sm"
        style={{ width: '100%', maxWidth: '800px', height: '600px' }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouch}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="application"
        aria-label={`Game area for finding the ${currentCreature.name}. Use arrow keys to move or mouse to explore.`}
      >
        <ProximityEngine
          cursorPosition={cursorPosition}
          creaturePosition={currentCreature.position}
          detectionRadius={currentCreature.detectionRadius}
          level={level}
        />
        
        {renderAccessibilityMode()}

        {/* Cursor */}
        {!isFound && (
          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-300 shadow-lg transition-all duration-100"
            style={{
              left: cursorPosition.x - 8,
              top: cursorPosition.y - 8,
              boxShadow: '0 0 20px rgba(234, 179, 8, 0.6)'
            }}
          />
        )}
      </div>

      {/* Fact Display */}
      {showFact && (
        <CreatureFactBox
          creature={currentCreature}
          fact={currentFact}
          onClose={() => setShowFact(false)}
          onComplete={handleFactComplete}
        />
      )}

      {/* Mobile Instructions */}
      <div className="mt-4 text-center text-sm text-emerald-400 md:hidden">
        Touch and drag to explore • Listen for audio cues
      </div>
      
      {/* Desktop Instructions */}
      <div className="mt-4 text-center text-sm text-emerald-400 hidden md:block">
        Use arrow keys or mouse to explore • Press Enter when you find the creature
      </div>
    </div>
  );
};

export default GameEngine;