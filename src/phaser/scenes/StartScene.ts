import Phaser from 'phaser';
import { OptionsMenu } from '../ui/OptionsMenu';


export default class StartScene extends Phaser.Scene {
  private music!: Phaser.Sound.BaseSound;
  private optionsMenu!: OptionsMenu;

  constructor() {
    super({ key: 'StartScene' });

  }

  preload() {
    //console.log('📦 preload StartScene');
    this.load.image('starfield', '../../../assets/images/game/startscene.png');
    this.load.image('spark', '../../../assets/images/game/spark1.png');
    //this.load.image('darthback', '../../../assets/images/game/darth_back.png');
    
    // Load menu music
    this.load.audio('menu_music', '../../../assets/audio/menu_music.wav');
  }

  create() {
    // Initialize global volume to 50% by default
    this.sound.volume = 0.5;

    this.sound.stopAll();

    if (this.music) {
      this.music.stop();
    }

    // Initialize menu music
    this.music = this.sound.add('menu_music', {
      loop: true,
      volume: 1.0 // Full volume (respects global volume, which is 0.5 by default)
    });
    
    // Try to play menu music (may be blocked by browser autoplay policy)
    // If blocked, user interaction will be required to start it
    try {
      this.music.play();
    } catch (error) {
      console.log('Menu music play error:', error);
    }
    
    // Log for debugging
    const musicSound = this.music as Phaser.Sound.WebAudioSound;
    console.log('Menu music initialized:', {
      playing: this.music.isPlaying,
      volume: musicSound.volume || 'N/A',
      globalVolume: this.sound.volume
    });

    // Initialize options menu
    this.optionsMenu = new OptionsMenu(this, {
      onVolumeChange: (volume: number) => this.setMusicVolume(volume),
      onClose: () => this.closeOptions()
    });

    // Add background - use camera dimensions for proper scaling
    const cam = this.cameras.main;
    // Background image should fill the entire game viewport, positioned at top-left
    const bgImage = this.add.image(0, 0, 'starfield')
      .setOrigin(0, 0)
      .setDisplaySize(cam.width, cam.height)
      .setAlpha(0.9);
    bgImage.setScrollFactor(0); // Fix to camera viewport
    bgImage.setDepth(-2); // Behind everything

    // Add subtle animated background overlay for depth - cover entire viewport from (0,0)
    const overlay = this.add.rectangle(
      cam.width / 2,  // Center horizontally
      cam.height / 2, // Center vertically
      cam.width,
      cam.height,
      0x000000,
      0.3
    );
    overlay.setOrigin(0.5, 0.5); // Center the rectangle
    overlay.setScrollFactor(0); // Fix to camera viewport
    overlay.setDepth(-1); // Behind everything but above background
    
    // Pulse the overlay for a subtle breathing effect
    this.tweens.add({
      targets: overlay,
      alpha: 0.5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Wait for StarJedi font to fully load before adding text
    document.fonts.load('64px StarJedi').then(() => {
      // Create title group for easier animation - use camera center for proper centering
      const cam = this.cameras.main;
      const titleY = cam.height * 0.15; // 15% down the screen
      const titleGroup = this.add.container(cam.centerX, titleY);

      // Title: "mech"
      const mechText = this.add.text(0, 0, 'mech', {
        fontFamily: 'StarJedi',
        fontSize: '72px',
        color: '#ffff00',
        stroke: '#000',
        strokeThickness: 8,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000',
          blur: 5,
          fill: true
        }
      }).setOrigin(0.5).setAlpha(0);

      // Title: "survivor"
      const survivorText = this.add.text(0, 100, 'survivor', {
        fontFamily: 'StarJedi',
        fontSize: '72px',
        color: '#ffff00',
        stroke: '#000',
        strokeThickness: 8,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000',
          blur: 5,
          fill: true
        }
      }).setOrigin(0.5).setAlpha(0);

      titleGroup.add([mechText, survivorText]);
      titleGroup.setDepth(2);

      // Animate title entry - fade and slide in from top
      this.tweens.add({
        targets: mechText,
        alpha: 1,
        y: 0,
        duration: 800,
        ease: 'Power2',
        delay: 200
      });

      this.tweens.add({
        targets: survivorText,
        alpha: 1,
        y: 100,
        duration: 800,
        ease: 'Power2',
        delay: 400
      });

      // Add pulsing glow effect to title
      this.tweens.add({
        targets: [mechText, survivorText],
        scale: 1.05,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 1200
      });

      // Create button container - use camera center for proper centering
      const buttonY = cam.height * 0.65; // 65% down the screen
      const buttonGroup = this.add.container(cam.centerX, buttonY);

      // Start Button with enhanced styling
      const startButtonBg = this.add.rectangle(0, 0, 250, 80, 0x1a1a1a, 0.8)
        .setStrokeStyle(3, 0xffffff)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

      const startButton = this.add.text(0, 0, 'start', {
        fontFamily: 'StarJedi',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

      buttonGroup.add([startButtonBg, startButton]);
      buttonGroup.setDepth(3);

      // Options Button with enhanced styling
      const optionsButtonBg = this.add.rectangle(0, 100, 250, 80, 0x1a1a1a, 0.8)
        .setStrokeStyle(3, 0xffffff)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

      const optionsButton = this.add.text(0, 100, 'options', {
        fontFamily: 'StarJedi',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

      buttonGroup.add([optionsButtonBg, optionsButton]);
      buttonGroup.setDepth(3);

      // Animate buttons entry - fade in
      this.tweens.add({
        targets: [startButton, startButtonBg],
        alpha: 1,
        duration: 800,
        ease: 'Power2',
        delay: 800
      });

      this.tweens.add({
        targets: [optionsButton, optionsButtonBg],
        alpha: 1,
        duration: 800,
        ease: 'Power2',
        delay: 1000
      });

      // Button hover effects with animations
      const createHoverEffect = (button: Phaser.GameObjects.Text, bg: Phaser.GameObjects.Rectangle) => {
        button.on('pointerover', () => {
          // Change to yellow with glow
          button.setStyle({ color: '#ffff00' });
          bg.setStrokeStyle(4, 0xffff00);
          // Scale up slightly
          this.tweens.add({
            targets: [button, bg],
            scale: 1.1,
            duration: 200,
            ease: 'Power2'
          });
        });

        button.on('pointerout', () => {
          // Change back to white
          button.setStyle({ color: '#ffffff' });
          bg.setStrokeStyle(3, 0xffffff);
          // Scale back down
          this.tweens.add({
            targets: [button, bg],
            scale: 1.0,
            duration: 200,
            ease: 'Power2'
          });
        });

        button.on('pointerdown', () => {
          // Press animation
          this.tweens.add({
            targets: [button, bg],
            scale: 0.95,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
          });
        });
      };

      createHoverEffect(startButton, startButtonBg);
      createHoverEffect(optionsButton, optionsButtonBg);

      // Button click handlers
      startButton.on('pointerdown', () => {
        // Stop menu music before transitioning
        if (this.music && this.music.isPlaying) {
          this.music.stop();
        }
        
        // Fade out effect before transition
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop('StartScene');
          this.scene.start('MainScene'); // Start the already-registered MainScene
        });
      });

      optionsButton.on('pointerdown', () => {
        // Try to start music if it wasn't playing (browser autoplay policy)
        if (this.music && !this.music.isPlaying) {
          this.music.play();
        }
        this.showOptions();
      });

      // Add decorative particle effect in the background
      this.createParticleEffect();

      // Fade in camera
      this.cameras.main.fadeIn(500, 0, 0, 0);
    });

  }

  /**
   * Create particle effect for visual interest
   */
  private createParticleEffect(): void {
    try {
      // Create a simple particle emitter for stars/sparks
      const cam = this.cameras.main;
      const particleManager = this.add.particles(0, 0, 'spark', {
        speed: { min: 20, max: 50 },
        scale: { start: 0.3, end: 0 },
        lifespan: 3000,
        frequency: 100,
        tint: 0xffff00,
        blendMode: 'ADD',
        x: { min: 0, max: cam.width },
        y: { min: 0, max: cam.height }
      });

      particleManager.setDepth(1);
    } catch (error) {
      // If particle system fails, just skip it - not critical for menu
      console.warn('Could not create particle effect:', error);
    }
  }

  /**
   * Show options menu
   */
  private showOptions(): void {
    this.optionsMenu.show();
  }

  /**
   * Close options menu
   */
  private closeOptions(): void {
    this.optionsMenu.hide();
  }

  /**
   * Set music volume
   */
  private setMusicVolume(volume: number): void {
    // Set global volume (affects all sounds)
    this.sound.volume = volume;
    
    // Update music volume (music should be at 1.0 to respect global volume)
    // The effective volume will be volume * 1.0 = volume
    if (this.music) {
      (this.music as Phaser.Sound.WebAudioSound).setVolume(1.0);
    }
  }

  /**
   * Cleanup when scene is destroyed
   */
  destroy(): void {
    if (this.optionsMenu) {
      this.optionsMenu.cleanup();
    }
  }
}
