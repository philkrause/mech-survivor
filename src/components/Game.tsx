import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '../phaser/scenes/MainScene';
import StartScene from '../phaser/scenes/StartScene';
import ResultsScene from '../phaser/scenes/ResultsScene';

import { GAME_CONFIG } from '../phaser/config/GameConfig';

const Game: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only create the game once (handles React StrictMode double-invocation)
    if (gameRef.current !== null || isInitializedRef.current) {
      return;
    }

    // Mark as initialized immediately to prevent double creation
    isInitializedRef.current = true;

    // Ensure container exists
    if (!gameContainerRef.current) {
      console.warn('Game container not available');
      isInitializedRef.current = false;
      return;
    }

    // Game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL, // Force WebGL for better performance in Chrome
      width: 1024,
      height: 768,
      parent: gameContainerRef.current || undefined,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: GAME_CONFIG.PHYSICS_DEBUG, // Use separate physics debug flag (very slow in Chrome)
        }
      },
      render: {
        antialias: false, // Disable antialiasing for pixel art (better performance)
        pixelArt: true,
        roundPixels: true,
        powerPreference: 'high-performance', // Request high performance GPU
        transparent: true, // Allow page background to show through
      },
      backgroundColor: 'transparent',
      fps: {
        target: 60,
        forceSetTimeOut: false, // Don't use setTimeout throttling
      },
      scene: [StartScene, MainScene, ResultsScene],
    };

    // Create new game instance
    gameRef.current = new Phaser.Game(config);

    // Cleanup function
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  return (
    <div 
      ref={gameContainerRef} 
      style={{ 
        width: '1024px', 
        height: '768px',
        minWidth: '1024px',
        minHeight: '768px',
        margin: '0 auto'
      }} 
    />
  );
};

export default Game; 