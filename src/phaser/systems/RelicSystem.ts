import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { UpgradeSystem } from './UpgradeSystem';
import { GameUI } from '../ui/GameUI';

export class RelicSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private upgradeSystem: UpgradeSystem;
  private activeRelics: Phaser.Physics.Arcade.Group;
  private availableRelicIds: string[] = [];
  private isShowingRelicScreen: boolean = false;
  private animationTimeoutId: number | null = null;
  private selectedRelicId: string | null = null;
  private isAnimationComplete: boolean = false;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private enterKey: Phaser.Input.Keyboard.Key | null = null;
  private isStressTestMode: boolean = false;
  // Baby Yoda fountain state
  private yodaSprites: Phaser.GameObjects.Image[] = [];
  private yodaTimers: number[] = [];
  private yodaLoopActive: boolean = false;
  // Animation early-stop state
  private currentAnimationComplete: (() => void) | null = null;
  private currentRelicDisplay: Phaser.GameObjects.Sprite | null = null;
  private currentOverlay: Phaser.GameObjects.Rectangle | null = null;
  private currentTitle: Phaser.GameObjects.Text | null = null;
  private currentChestSprite: Phaser.GameObjects.Sprite | null = null;
  private currentInstruction: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, player: Player, _gameUI: GameUI, upgradeSystem: UpgradeSystem) {
    this.scene = scene;
    this.player = player;
    this.upgradeSystem = upgradeSystem;
    this.activeRelics = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      runChildUpdate: true
    });

    this.scene.events.on('relic-dropped', this.spawnRelic, this);
    this.scene.physics.add.overlap(this.player.getSprite(), this.activeRelics, this.handleRelicPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    this.initializeAvailableRelics();
  }

  // Public flag for MainScene to know if selection UI is open
  public isScreenOpen(): boolean {
    return this.isShowingRelicScreen;
  }

  // --- Baby Yoda fountain effect ---
  private startYodaFountain(originX: number, originY: number): void {
    if (!this.scene.textures.exists('byoda')) {
      console.warn('Texture key "byoda" not found; skipping fountain.');
      return;
    }
    const count = 42; // number of sprites to spray
    const gravity = 0.22; // manual gravity per tick
    const lifetimeMs = 1800; // lifespan per sprite
    const dt = 16; // ms per update step
    for (let i = 0; i < count; i++) {
      // Aim mostly straight up with a wider spread
      const baseAngle = -Math.PI / 2; // straight up
      const spread = Math.PI * 0.8; // +/- ~72 degrees
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = 3.0 + Math.random() * 10.0; // initial speed
      // Allow a bit more horizontal component for width
      const vx0 = Math.cos(angle) * speed * 0.5;
      const vy0 = Math.sin(angle) * speed - 4.0; // upward bias (negative y)

      const sprite = this.scene.add.image(originX, originY, 'byoda')
        .setScale(1.2)  
        .setDepth(3002) // below relic display (3003) so the slot animation stays visible
        .setScrollFactor(0)
        .setAlpha(1.0);

      this.yodaSprites.push(sprite);

      let vx = vx0;
      let vy = vy0;
      let elapsed = 0;

      const step = () => {
        // Manual step so it runs while scene.time is paused
        elapsed += dt;
        // update position
        sprite.x += vx;
        sprite.y += vy;
        // gravity
        vy += gravity;
        // shrink and fade
        sprite.scale *= 0.987;
        sprite.alpha *= 0.987;

        if (elapsed >= lifetimeMs || sprite.scale < 0.06 || sprite.alpha < 0.06) {
          sprite.destroy();
          return;
        }
        const timerId = window.setTimeout(step, dt);
        this.yodaTimers.push(timerId);
      };

      const timerId = window.setTimeout(step, dt);
      this.yodaTimers.push(timerId);
    }
  }

  private stopYodaFountain(): void {
    // clear timers
    this.yodaTimers.forEach(id => window.clearTimeout(id));
    this.yodaTimers = [];
    this.yodaLoopActive = false;
    // destroy any remaining sprites
    this.yodaSprites.forEach(s => s.destroy());
    this.yodaSprites = [];
  }

  private startYodaFountainLoop(originX: number, originY: number): void {
    this.yodaLoopActive = true;
    const loop = () => {
      if (!this.isShowingRelicScreen || !this.yodaLoopActive) {
        return;
      }
      // spawn one burst
      this.startYodaFountain(originX, originY);
      // schedule next burst
      const id = window.setTimeout(loop, 220);
      this.yodaTimers.push(id);
    };
    loop();
  }

  private initializeAvailableRelics(): void {
    // Get all upgrades that are marked as relics and are available
    this.availableRelicIds = this.upgradeSystem.getAllUpgrades()
      .filter(upgrade => upgrade.isRelic && upgrade.isAvailable?.(this.player))
      .map(relic => relic.id);
    
  }

  /**
   * Spawn a relic chest at the specified position with floating arrow
   */
  private spawnRelic(x: number, y: number): void {
    //console.log("RelicSystem.spawnRelic called at:", x, y);
    //console.log("Available relics:", this.availableRelicIds);
    
    if (this.availableRelicIds.length === 0) {
      console.warn("No relics available to drop.");
      return;
    }


    // Create chest sprite
    const chest = this.scene.physics.add.sprite(x, y, 'chest');
    chest.setScale(1.8);
    chest.setDepth(5);
    
    // Add physics body
    if (chest.body) {
      chest.body.setSize(24, 20);
    }

    // Add chest data
    chest.setData('collected', false);

    // Add to group
    this.activeRelics.add(chest);

    // Create floating arrow above chest
    const arrow = this.scene.add.sprite(x, y - 30, 'arrow');
    arrow.setScale(3.2); // Much bigger arrow
    arrow.setDepth(6);
    arrow.setTint(0xffd700); // Golden color
    
    // Store arrow reference on chest so it can be destroyed on pickup
    chest.setData('arrow', arrow);
    
    // Floating animation for arrow
    this.scene.tweens.add({
      targets: arrow,
      y: y - 40,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Chest pulsing animation
    this.scene.tweens.add({
      targets: chest,
      scale: 1.4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add collection collision with player - REMOVED: handled by group overlap in constructor
    // this.scene.physics.add.overlap(
    //   chest,
    //   this.player.getSprite(),
    //   this.handleRelicPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    //   undefined,
    //   this
    // );

    // Auto-collect after 30 seconds if not picked up
    this.scene.time.delayedCall(30000, () => {
      if (chest.active && !chest.getData('collected')) {
        arrow.destroy();
        chest.destroy();
      }
    });
  }

  /**
   * Handle relic pickup collision
   */
  private handleRelicPickup(_player: Phaser.Types.Physics.Arcade.GameObjectWithBody, chest: Phaser.Types.Physics.Arcade.GameObjectWithBody): void {
    const chestSprite = chest as Phaser.Physics.Arcade.Sprite;
    this.collectRelic(chestSprite);
  }

  /**
   * Handle relic collection - show slot machine screen
   */
  private collectRelic(chest: Phaser.Physics.Arcade.Sprite): void {
    if (chest.getData('collected') || this.isShowingRelicScreen) {
      return;
    }

    chest.setData('collected', true);
    this.isShowingRelicScreen = true;
    this.selectedRelicId = null; // Reset for new relic selection
    this.isAnimationComplete = false; // Reset animation state

    // Emit relic collection particle effect
    this.scene.events.emit('relic-collected', chest.x, chest.y);

    // Destroy the floating arrow
    const arrow = chest.getData('arrow');
    if (arrow) {
      arrow.destroy();
    }
    
    // Hide chest instead of destroying it to prevent player sprite issues
    chest.destroy();

    // Pause the game exactly like level up
    this.scene.physics.pause();
    this.scene.time.paused = true;

    // Show relic selection screen
    this.showRelicSelectionScreen(chest.x, chest.y);
  }

  /**
   * Show slot machine-style relic selection screen
   */
  private showRelicSelectionScreen(_x: number, _y: number): void {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // Create dark overlay
    const overlay = this.scene.add.rectangle(centerX, centerY, this.scene.cameras.main.width, this.scene.cameras.main.height, 0x000000, 0.7);
    overlay.setDepth(3000).setScrollFactor(0);

    // Create title
    const title = this.scene.add.text(centerX, centerY - 200, 'RELIC DISCOVERED!', {
      fontSize: '32px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

    // Create chest a bit higher so it doesn't cover the text below
    const chestSprite = this.scene.add.sprite(centerX, centerY + 140, 'chest_open');
    chestSprite.setScale(2);
    chestSprite.setDepth(3002).setScrollFactor(0);

    // Start Baby Yoda fountain loop from chest
    this.startYodaFountainLoop(chestSprite.x, chestSprite.y - 20);

    // Create relic display area
    const relicDisplay = this.scene.add.sprite(centerX, centerY + 30, 'relics');
    relicDisplay.setScale(4);
    relicDisplay.setDepth(3003).setScrollFactor(0);
    relicDisplay.setTint(0xffffff); // Make sure it's visible
    relicDisplay.setAlpha(1); // Ensure full opacity
    
    // Show a specific frame to make sure spritesheet is working
    relicDisplay.setFrame(0);

    // Create instruction text
    const instruction = this.scene.add.text(centerX, centerY + 200, 'Press SPACE or ENTER to stop slot or claim relic!', {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

    // Store references for early stop functionality
    this.currentRelicDisplay = relicDisplay;
    this.currentOverlay = overlay;
    this.currentTitle = title;
    this.currentChestSprite = chestSprite;
    this.currentInstruction = instruction;

    // Check if in stress test mode - skip animation for faster testing
    if (this.isStressTestMode) {
      // Skip animation, immediately show final relic
      this.isAnimationComplete = true;
      this.currentAnimationComplete = null; // Clear animation callback
      this.showFinalRelic(relicDisplay, overlay, title, chestSprite, instruction);
    } else {
      // Create completion callback
      const onComplete = () => {
        // Animation complete - show final relic
        this.isAnimationComplete = true;
        this.currentAnimationComplete = null; // Clear animation callback
        this.showFinalRelic(relicDisplay, overlay, title, chestSprite, instruction);
      };
      
      // Store callback for early stop
      this.currentAnimationComplete = onComplete;
      
      // Start slot machine animation
      this.startSlotMachineAnimation(relicDisplay, onComplete);
    }
    

    // Helper function to handle relic selection (space or enter)
    const handleRelicSelection = () => {
      if (!this.isShowingRelicScreen) {
        return;
      }
      
      // If animation is still running, stop it early
      if (!this.isAnimationComplete && this.currentAnimationComplete) {
        // Stop the animation
        if (this.animationTimeoutId !== null) {
          clearTimeout(this.animationTimeoutId);
          this.animationTimeoutId = null;
        }
        
        // Immediately complete the animation
        const onComplete = this.currentAnimationComplete;
        this.currentAnimationComplete = null;
        if (onComplete && this.currentRelicDisplay && this.currentOverlay && 
            this.currentTitle && this.currentChestSprite && this.currentInstruction) {
          onComplete();
        }
        return;
      }
      
      // If animation is complete, claim the relic
      if (this.isAnimationComplete && this.currentRelicDisplay && this.currentOverlay && 
          this.currentTitle && this.currentChestSprite && this.currentInstruction) {
        this.claimRelic(this.currentRelicDisplay, this.currentOverlay, this.currentTitle, 
                       this.currentChestSprite, this.currentInstruction);
      }
    };

    // Add space key listener
    this.spaceKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) || null;
    this.spaceKey?.on('down', handleRelicSelection);

    // Add enter key listener
    this.enterKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER) || null;
    this.enterKey?.on('down', handleRelicSelection);
  }

  /**
   * Start slot machine animation cycling through relics
   */
  private startSlotMachineAnimation(relicDisplay: Phaser.GameObjects.Sprite, onComplete: () => void): void {
    let currentFrame = 0;
    const totalFrames = 60; // Total relics in spritesheet
    let animationSpeed = 50; // Much faster initial speed
    const maxCycles = 1; // Only 1 cycle - very short
    let frameCount = 0;
    const totalFramesToShow = maxCycles * totalFrames + Math.floor(totalFrames * 0.3); // Show 1.3 cycles
    

    const animate = () => {
      if (frameCount >= totalFramesToShow) {
        onComplete();
        return;
      }

      relicDisplay.setFrame(currentFrame);
      if (frameCount % 30 === 0) { // Log every 30 frames
      }
      currentFrame = (currentFrame + 1) % totalFrames;
      frameCount++;

      // Much faster speeds overall
      if (frameCount < totalFramesToShow * 0.6) {
        // First 60% - very fast
        animationSpeed = 50;
      } else if (frameCount < totalFramesToShow * 0.9) {
        // Next 30% - medium speed
        animationSpeed = 100;
      } else {
        // Final 10% - slower but still fast
        animationSpeed = 200;
      }

      this.animationTimeoutId = setTimeout(animate, animationSpeed) as unknown as number;
    };

    animate();
  }

  /**
   * Show the final selected relic
   */
  private showFinalRelic(relicDisplay: Phaser.GameObjects.Sprite, _overlay: Phaser.GameObjects.Rectangle, _title: Phaser.GameObjects.Text, _chestSprite: Phaser.GameObjects.Sprite, instruction: Phaser.GameObjects.Text): void {
    
    // Select random relic using a more reliable method
    const randomIndex = Math.floor(Math.random() * this.availableRelicIds.length);
    const randomRelicId = this.availableRelicIds[randomIndex];
    
    const relicUpgrade = this.upgradeSystem.getUpgradeById(randomRelicId);

    if (!relicUpgrade) {
      console.error(`Relic upgrade with ID ${randomRelicId} not found.`);
      return;
    }


    // Map relic ID to a specific frame (for now, use modulo to distribute across frames)
    const relicIndex = this.availableRelicIds.indexOf(randomRelicId);
    const finalFrame = relicIndex % 60; // Map to available frames
    relicDisplay.setFrame(finalFrame);

    // Add glow effect
    const glow = this.scene.add.sprite(relicDisplay.x, relicDisplay.y, 'relics');
    glow.setScale(4.5);
    glow.setDepth(1002).setScrollFactor(0);
    glow.setTint(0xffd700);
    glow.setAlpha(0.5);

    // Pulsing glow animation
    this.scene.tweens.add({
      targets: glow,
      scale: 5,
      alpha: 0.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Update instruction to show relic name and stat boost
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;
    
    instruction.setText(`${relicUpgrade.name}\n${relicUpgrade.description}\n\nPress SPACE or ENTER to claim!`);
    instruction.setPosition(centerX, centerY + 200);
    instruction.setFontSize('18px');
    instruction.setColor('#ffd700');
    instruction.setStroke('#000000', 3);
    instruction.setAlign('center');
    instruction.setScrollFactor(0);

    // Store the selected relic for claiming
    this.selectedRelicId = randomRelicId;
    
    // Store glow reference so it can be destroyed later
    relicDisplay.setData('glow', glow);
  }

  /**
   * Claim the selected relic
   */
  private claimRelic(relicDisplay: Phaser.GameObjects.Sprite, overlay: Phaser.GameObjects.Rectangle, title: Phaser.GameObjects.Text, chestSprite: Phaser.GameObjects.Sprite, instruction: Phaser.GameObjects.Text): void {
    // Get the selected relic ID that was stored during showFinalRelic
    const selectedRelicId = this.selectedRelicId;
    
    if (!selectedRelicId) {
      console.error("No relic selected - selectedRelicId is null");
      return;
    }
    
    const relicUpgrade = this.upgradeSystem.getUpgradeById(selectedRelicId);

    if (!relicUpgrade) {
      console.error(`Relic upgrade with ID ${selectedRelicId} not found.`);
      return;
    }

    // Apply the relic effect
    this.upgradeSystem.applyUpgrade(selectedRelicId);

    // Clean up screen elements
    overlay.destroy();
    title.destroy();
    chestSprite.destroy();
    instruction.destroy();
    this.stopYodaFountain();
    
    // Destroy glow effect if it exists
    const glow = relicDisplay.getData('glow');
    if (glow) {
      glow.destroy();
    }
    
    relicDisplay.destroy();

    // Clean up any running animation
    if (this.animationTimeoutId !== null) {
      clearTimeout(this.animationTimeoutId);
      this.animationTimeoutId = null;
    }

    // Resume game exactly like level up
    this.scene.physics.resume();
    this.scene.time.paused = false;
    this.isShowingRelicScreen = false;
    this.selectedRelicId = null; // Reset for next relic
    
    // Clear stored references
    this.currentRelicDisplay = null;
    this.currentOverlay = null;
    this.currentTitle = null;
    this.currentChestSprite = null;
    this.currentInstruction = null;
    this.currentAnimationComplete = null;
    this.isAnimationComplete = false;
    
    // Relic applied successfully
    // Note: Relic display in corner removed for now

    // Remove space and enter key listeners
    if (this.spaceKey) {
      this.spaceKey.off('down');
      this.spaceKey = null;
    }
    if (this.enterKey) {
      this.enterKey.off('down');
      this.enterKey = null;
    }
  }


  /**
   * Set stress test mode (skips slot animation for faster testing)
   */
  setStressTestMode(enabled: boolean): void {
    this.isStressTestMode = enabled;
  }

  cleanup(): void {
    this.scene.events.off('relic-dropped', this.spawnRelic, this);
    this.activeRelics.clear(true, true);
  }
}