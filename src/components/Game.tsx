import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '../phaser/scenes/MainScene';
import StartScene from '../phaser/scenes/StartScene';
import ResultsScene from '../phaser/scenes/ResultsScene';
import IntroScene from '../phaser/scenes/IntroScene';

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

    // Game configuration - fullscreen responsive
    // Use RESIZE mode to fill the screen while maintaining internal resolution
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL, // Force WebGL for better performance in Chrome
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameContainerRef.current || undefined,
      scale: {
        mode: Phaser.Scale.RESIZE, // Resize to fill window, maintain internal resolution for game logic
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game
      },
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
      scene: [IntroScene, StartScene, MainScene, ResultsScene],
    };

    // Create new game instance
    gameRef.current = new Phaser.Game(config);

    // Handle window resize to keep game fullscreen
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // Only run once on mount

  return (
    <div 
      ref={gameContainerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0
      }} 
    />
  );
};

export default Game; 