import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { Player } from '../entities/Player';


/**
 * Manages all UI elements in the game
 */
export class GameUI {
  private scene: Phaser.Scene;
  //private enemyCountText: Phaser.GameObjects.Text;
  //private healthText: Phaser.GameObjects.Text;
  //private levelText: Phaser.GameObjects.Text;
  private experienceBar: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private dashBar: Phaser.GameObjects.Graphics;
  private player: Player;
  private relicDisplay: Phaser.GameObjects.Container;
  private gameTimer: Phaser.GameObjects.Text;
  private startTime: number;
  private killCounterSprite: Phaser.GameObjects.Image | null = null;
  private killCounterText: Phaser.GameObjects.Text | null = null;
  private upgradeIconsContainer: Phaser.GameObjects.Container;
  private upgradeIconSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  
  // Store health bar position for dash bar reference
  private healthBarX: number = 0;
  private healthBarY: number = 0;
  
  // Mobile dash button
  private mobileDashButton: Phaser.GameObjects.Container | null = null;
  private isMobile: boolean = false;
  private dashButtonBounds = { x: 0, y: 0, radius: 0 };
  private dashButtonPressed = false; // Track if dash button is currently pressed
  
  // Mobile touch controls
  private touchTarget = { x: 0, y: 0, active: false };
  
  // Mapping of upgrade IDs to icon image keys
  private upgradeIconMap: Map<string, string> = new Map([
    ['blaster', 'blaster_icon'], // Blaster starts unlocked
    ['unlock_flamethrower', 'flamethrower_icon'], // Will use flamethrower_icon.png if loaded
    ['unlock_force', 'spark'], // Using spark1.png
    ['unlock_combat_drone', 'combat_drone_icon'], // Using combat_drone_icon
    ['unlock_attack_chopper', 'attack_chopper_icon'], // Using attack_chopper_icon
  ]);

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    // Detect if mobile
    this.isMobile = this.detectMobile();
    
    // Create UI elements
    //this.createInstructionText();
    //this.enemyCountText = this.createEnemyCounterText();
    //this.healthText = this.createHealthText();
    //this.levelText = this.createLevelText();
    this.healthBar = this.createHealthBar();
    this.dashBar = this.createDashBar();
    this.experienceBar = this.createExperienceBar();
    this.relicDisplay = this.createRelicDisplay();
    this.gameTimer = this.createGameTimer();
    this.createKillCounter();
    this.upgradeIconsContainer = this.createUpgradeIconsDisplay();
    
    // Create mobile controls if on mobile
    if (this.isMobile) {
      this.createMobileDashButton(); // Create button first
      this.setupMobileTouchControls(); // Then set up touch handler
    }
    
    this.startTime = this.scene.time.now;
    
    // Listen for level up events
    this.scene.events.on('player-level-up', this.onPlayerLevelUp, this);
    // Listen for upgrade events to update icons
    this.scene.events.on('upgrade-applied', this.onUpgradeApplied, this);
    
    // Initial update to show starting upgrades (like blaster)
    this.updateUpgradeIcons();
  }

  /**
   * Detect if the device is mobile
   */
  private detectMobile(): boolean {
    // Check for touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check screen size (mobile typically < 768px width)
    const isSmallScreen = window.innerWidth < 768;
    
    // Check user agent as fallback
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    return (hasTouch && isSmallScreen) || isMobileUA;
  }

  /** Ensure core UI elements are visible and recreated if needed */
  public ensureUIVisible(): void {
    if (!this.healthBar || !(this.healthBar as any).scene) {
      this.healthBar = this.createHealthBar();
    }
    if (!this.experienceBar || !(this.experienceBar as any).scene) {
      this.experienceBar = this.createExperienceBar();
    }
    this.healthBar.setVisible(true);
    this.experienceBar.setVisible(true);
    // Keep relic display and timer visible as appropriate
    if (this.gameTimer && (this.gameTimer as any).scene) {
      this.gameTimer.setVisible(true);
    } else {
      this.gameTimer = this.createGameTimer();
    }
    // Recreate kill counter if needed
    if (!this.killCounterText || !(this.killCounterText as any).scene) {
      this.createKillCounter();
    } else {
      this.killCounterText.setVisible(true);
      if (this.killCounterSprite) {
        this.killCounterSprite.setVisible(true);
      }
    }
    // Ensure upgrade icons are visible
    if (this.upgradeIconsContainer) {
      this.upgradeIconsContainer.setVisible(true);
    }
    // Ensure mobile controls are visible (if on mobile)
    if (this.mobileDashButton) {
      this.mobileDashButton.setVisible(true);
    }
  }
  
  /**
   * Create instruction text for the player
   */
  // private createInstructionText(): void {
  //   // Movement instructions
  //   this.scene.add.text(16, 16, 'Use WASD or Arrow keys to move', GAME_CONFIG.UI.TEXT_STYLE);
    
  //   // Enemy info
  //   this.scene.add.text(16, 40, 'Enemies will spawn around the edges', GAME_CONFIG.UI.TEXT_STYLE);
    
  //   // Health info
  //   this.scene.add.text(16, 64, 'Avoid enemies to prevent taking damage', GAME_CONFIG.UI.TEXT_STYLE);
    
  //   // Experience info
  //   this.scene.add.text(16, 88, 'Collect cyan orbs for experience', GAME_CONFIG.UI.TEXT_STYLE);
  // }
  
  /**
   * Create a text display for the enemy counter
   */
  // private createEnemyCounterText(): Phaser.GameObjects.Text {
  //   return this.scene.add.text(16, 112, 'Enemies: 0', GAME_CONFIG.UI.TEXT_STYLE);
  // }
  
  /**
   * Create a text display for player health
   */
  // private createHealthText(): Phaser.GameObjects.Text {
  //   return this.scene.add.text(16, 136, 'Health: 100/100', GAME_CONFIG.UI.TEXT_STYLE);
  // }
  
  /**
   * Create a text display for player level
   */
  // private createLevelText(): Phaser.GameObjects.Text {
  //   return this.scene.add.text(16, 160, 'Level: 1', GAME_CONFIG.UI.TEXT_STYLE);
  // }
  
  /**
   * Create a health bar
   */
  private createHealthBar(): Phaser.GameObjects.Graphics {
    const healthBar = this.scene.add.graphics();
    healthBar.setScrollFactor(0); // Fix to camera
    healthBar.setDepth(2000); // Higher depth to stay above pause menu
    return healthBar;
  }
  
  /**
   * Create a dash bar
   */
  private createDashBar(): Phaser.GameObjects.Graphics {
    const dashBar = this.scene.add.graphics();
    dashBar.setScrollFactor(0); // Fix to camera
    dashBar.setDepth(2000); // Higher depth to stay above pause menu
    return dashBar;
  }

  /**
   * Create an experience bar
   */
  private createExperienceBar(): Phaser.GameObjects.Graphics {
    const experienceBar = this.scene.add.graphics();
    experienceBar.setScrollFactor(0); // Fix to camera
    experienceBar.setDepth(2000); // Higher depth to stay above pause menu
    return experienceBar;
  }
  
  /**
   * Create relic display container
   */
  private createRelicDisplay(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    container.setScrollFactor(0); // Fix to camera
    container.setDepth(2000); // Higher depth to stay above pause menu
    container.setVisible(false); // Start hidden
    return container;
  }
  
  /**
   * Update the enemy counter display
   */
  // updateEnemyCount(count: number): void {
  //   this.enemyCountText.setText(`Enemies: ${count}`);
  // }
  
  /**
   * Update the health display
   */
  updateHealth(current: number, max: number): void {
    //this.healthText.setText(`Health: ${current}/${max}`);
    this.updateHealthBar(current, max);
  }

  /**
   * Update dash bar (should be called every frame)
   */
  public updateDashBar(): void {
    this.updateDashBarInternal();
  }

  /**
   * Hide health and dash bars (e.g., during level up screen)
   */
  public hideBars(): void {
    if (this.healthBar) {
      this.healthBar.setVisible(false);
    }
    if (this.dashBar) {
      this.dashBar.setVisible(false);
    }
  }

  /**
   * Show health and dash bars
   */
  public showBars(): void {
    if (this.healthBar) {
      this.healthBar.setVisible(true);
    }
    if (this.dashBar) {
      this.dashBar.setVisible(true);
    }
  }

  /**
   * Internal method to update dash cooldown bar (vertical on left side)
   */
  private updateDashBarInternal(): void {
    const dashBar = this.dashBar;

    // Get dash cooldown progress (0 to 1, where 1 = ready)
    const cooldownProgress = this.player.getDashCooldownProgress();

    // Vertical bar dimensions
    const barWidth = 8; // Thin vertical bar
    const barHeight = 60; // Taller vertical bar

    // Position relative to health bar (left side, vertically centered)
    const x = this.healthBarX - barWidth - 5; // 5px left of health bar
    const y = this.healthBarY - 25; // Center vertically with health bar

    // Clear previous graphics
    dashBar.clear();

    // Draw background (empty cooldown)
    dashBar.fillStyle(0x111111, 0.9);
    dashBar.fillRect(x, y, barWidth, barHeight);

    // Draw cooldown fill with gradient (fills from bottom to top)
    if (cooldownProgress > 0) {
      const fillHeight = barHeight * cooldownProgress;
      const fillY = y + barHeight - fillHeight; // Start from bottom
      
      // Create gradient effect by drawing segments
      const segments = 10; // Number of gradient segments
      const segmentHeight = fillHeight / segments;
      
      for (let i = 0; i < segments; i++) {
        const segmentProgress = i / segments;
        
        // Gradient from dark cyan (empty) to bright cyan (full)
        const darkCyan = 0x004466;
        const brightCyan = 0x00ffff;
        
        // Interpolate color based on position in bar
        const r1 = (darkCyan >> 16) & 0xFF;
        const g1 = (darkCyan >> 8) & 0xFF;
        const b1 = darkCyan & 0xFF;
        
        const r2 = (brightCyan >> 16) & 0xFF;
        const g2 = (brightCyan >> 8) & 0xFF;
        const b2 = brightCyan & 0xFF;
        
        const r = Math.floor(r1 + (r2 - r1) * segmentProgress);
        const g = Math.floor(g1 + (g2 - g1) * segmentProgress);
        const b = Math.floor(b1 + (b2 - b1) * segmentProgress);
        
        const color = (r << 16) | (g << 8) | b;
        
        dashBar.fillStyle(color, 0.9);
        dashBar.fillRect(x, fillY + (segments - 1 - i) * segmentHeight, barWidth, segmentHeight + 1);
      }
    }

    // Add border
    dashBar.lineStyle(2, 0x00aaaa, 0.8);
    dashBar.strokeRect(x, y, barWidth, barHeight);
  }
  
  /**
   * Update the health bar
   */
  private updateHealthBar(current: number, max: number): void {
    const healthBar = this.healthBar;
    const cameraBounds = this.scene.cameras.main

    let x = cameraBounds.scrollX - 40;
    let y = cameraBounds.scrollY - 30;
    // Clear previous graphics
    healthBar.clear();
    
    // Calculate health percentage
    const healthPercent = Math.max(0, Math.min(1, current / max));
    
    // Get dimensions
    const width = GAME_CONFIG.PLAYER.HEALTH_BAR_WIDTH;
    const height = GAME_CONFIG.PLAYER.HEALTH_BAR_HEIGHT;

    // Camera

    // Position at bottom of players position
    const playerPos =  this.player.getPosition();
    

    // x = playerPos.x - cameraBounds.scrollX - 40; // Centered horizontally
    // y = playerPos.y  - cameraBounds.scrollY + 40; 

    const offsetX = this.player.getFlippedX() ? -10 : -40;
    x = playerPos.x - cameraBounds.scrollX + offsetX;
    y = playerPos.y - cameraBounds.scrollY + 50;

    // Store health bar position for dash bar reference
    this.healthBarX = x;
    this.healthBarY = y;

    // Draw background (empty health)
    healthBar.fillStyle(0x222222, 0.8);
    healthBar.fillRect(x, y, width, height);
    
    // Draw health (filled portion)
    if (healthPercent > 0) {
      // Color based on health percentage
      if (healthPercent > 0.6) {
        healthBar.fillStyle(0x00ff00, 0.8); // Green
      } else if (healthPercent > 0.3) {
        healthBar.fillStyle(0xffff00, 0.8); // Yellow
      } else {
        healthBar.fillStyle(0xff0000, 0.8); // Red
      }
      
      healthBar.fillRect(x, y, width * healthPercent, height);
    }
    
    // Add border
    healthBar.lineStyle(2, 0xffffff, 1);
    healthBar.strokeRect(x, y, width, height);
    
    // Add text
    //const healthText = `${current}/${max}`;
    
    // Remove any existing text
    const existingText = this.scene.children.getByName('health-text');
    if (existingText) {
      existingText.destroy();
    }
    
    // Add new text
    // this.scene.add.text(x + width / 2, y + height / 2, healthText, {
    //   fontSize: '12px',
    //   color: '#ffffff',
    //   fontStyle: 'bold'
    // }).setOrigin(0.5).setName('health-text').setScrollFactor(0).setDepth(1000);
  }
  
  /**
   * Update the level display
   */
  // updateLevel(level: number): void {
  //   this.levelText.setText(`Level: ${level}`);
  // }
  
  /**
   * Update the experience bar
   */
  updateExperience(current: number, nextLevel: number, level: number): void {
    const experienceBar = this.experienceBar;
    
    // Clear previous graphics
    experienceBar.clear();
    
    // Calculate experience percentage
    const expPercent = Math.min(1, current / nextLevel);
    
    // Set dimensions
    const width = this.scene.cameras.main.width;
    const height = 30;
    
    // Position at bottom-center of screen, below health bar
    const x = (this.scene.cameras.main.width - width) / 2;
    const y = 0;
    
    // Draw background (empty experience)
    experienceBar.fillStyle(0x222222, 0.8);
    experienceBar.fillRect(x, y, width, height);
    
    // Draw filled portion
    experienceBar.fillStyle(GAME_CONFIG.EXPERIENCE_ORB.TINT, 0.8);
    experienceBar.fillRect(x, y, width * expPercent, height);
    
    // Add border
    experienceBar.lineStyle(1, 0xffffff, 1);
    experienceBar.strokeRect(x, y, width, height);
    
    // Add text - round values to avoid long decimals
    experienceBar.lineStyle(1, 0xffffff, 0); // Set line width to 1 and alpha to 0 to effectively disable the line
    const expText = `Level ${level}: ${Math.round(current)}/${Math.round(nextLevel)} XP`;
    
    // Remove any existing text
    const existingText = this.scene.children.getByName('exp-text');
    if (existingText) {
      existingText.destroy();
    }
    
    // Add new text
    this.scene.add.text(x + width / 2, y + height / 2, expText, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setName('exp-text').setScrollFactor(0).setDepth(2000);
  }
  
  /**
   * Handle player level up event
   */
  private onPlayerLevelUp(level: number): void {
    // Update level text
    //this.updateLevel(level);
    
    // Show level up message
    this.showMessage(`Level Up! ${level}`, 2000, "0x00ff00", "32px");
  }
  
  /**
   * Add a temporary message to the screen
   */
  showMessage(
    message: string, 
    duration: number = 2000, 
    color: string = "0x00ffff", 
    size: string = "32px", 
  ): void {

    const cameraBounds = this.scene.cameras.main.worldView;
    
    const text = this.scene.add.text(
      cameraBounds.centerX, 
      cameraBounds.centerY,
      message,
      {
        ...GAME_CONFIG.UI.TEXT_STYLE,
        fontSize: size
      }
    ).setOrigin(0.5).setAlpha(1).setColor(color).setDepth(2000);
    
    // Fade out and destroy after duration
    if(duration > 0) {
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          text.destroy();
        }
      });
    }
  }
  
  /**
   * Show a relic in the UI
   */
  showRelic(relicId: string, relicName: string, relicDescription: string): void {
    //console.log("GameUI.showRelic called:", relicName, relicDescription);
    
    // Clear existing relic display
    this.relicDisplay.removeAll(true);
    
    // Position below experience bar
    const x = 20; // Left side of screen
    const y = 50; // Below experience bar
    
    // Position the container at the correct location
    this.relicDisplay.setPosition(x, y);
    
    // Create background (positioned relative to container at 0,0)
    const bg = this.scene.add.rectangle(0, 0, 200, 60, 0x1d1805, 0.9);
    bg.setStrokeStyle(2, 0xf0c040);
    bg.setScrollFactor(0); // Fix to camera viewport
    bg.setDepth(2000); // Ensure it's above other UI elements
    this.relicDisplay.add(bg);
    
    // Create relic sprite - map relic ID to sprite frame (positioned relative to container)
    const relicFrame = this.getRelicFrame(relicId);
    console.log("Creating relic sprite for ID:", relicId, "frame:", relicFrame);
    const relicSprite = this.scene.add.sprite(-60, 0, 'relics');
    relicSprite.setFrame(relicFrame);
    relicSprite.setScale(2);
    relicSprite.setScrollFactor(0); // Fix to camera viewport
    relicSprite.setDepth(2000); // Ensure it's above other UI elements
    relicSprite.setVisible(true); // Ensure it's visible
    relicSprite.setAlpha(1); // Ensure full opacity
    this.relicDisplay.add(relicSprite);
    console.log("Relic sprite created:", relicSprite.visible, relicSprite.alpha, relicSprite.frame.name);
    
    // Create relic name text (positioned relative to container)
    const nameText = this.scene.add.text(20, -10, relicName, {
      fontSize: '16px',
      color: '#f0c040',
      fontStyle: 'bold',
      align: 'left',
      stroke: '#000000',
      strokeThickness: 2
    });
    nameText.setOrigin(0, 0.5);
    nameText.setScrollFactor(0); // Fix to camera viewport
    nameText.setDepth(2001); // Ensure it's above other UI elements
    this.relicDisplay.add(nameText);
    
    // Create relic description text (positioned relative to container)
    const descText = this.scene.add.text(20, 10, relicDescription, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'left',
      stroke: '#000000',
      strokeThickness: 1
    });
    descText.setOrigin(0, 0.5);
    descText.setScrollFactor(0); // Fix to camera viewport
    descText.setDepth(2001); // Ensure it's above other UI elements
    this.relicDisplay.add(descText);
    
    // Show the display
    this.relicDisplay.setVisible(true);
    console.log("Relic display set to visible, container children:", this.relicDisplay.list.length);
    console.log("Relic display position:", this.relicDisplay.x, this.relicDisplay.y);
    console.log("Relic display visible:", this.relicDisplay.visible);
    console.log("Relic display alpha:", this.relicDisplay.alpha);
    console.log("Relic sprite position:", relicSprite.x, relicSprite.y);
    console.log("Relic sprite visible:", relicSprite.visible);
  }

  /**
   * Map relic ID to sprite frame number
   */
  private getRelicFrame(relicId: string): number {
    const relicFrameMap: { [key: string]: number } = {
      'jedi_robes': 0, // Combat Armor (keeping same frame for compatibility)
      'flamethrower_core': 1, // Plasma Core (keeping same frame for compatibility)
      'force_medallion': 2, // Plasma Amplifier (keeping same frame for compatibility)
      'blaster_mod': 3,
      'attack_chopper_upgrade': 4, // Attack Chopper Enhancement (keeping same frame for compatibility)
      'speed_boosters': 5,
      'armor_plating': 6,
      'energy_core': 7,
      'reflex_enhancer': 8,
      'shield_generator': 9
    };
    
    return relicFrameMap[relicId] || 0; // Default to frame 0 if not found
  }

  /**
   * Create the game timer display
   */
  private createGameTimer(): Phaser.GameObjects.Text {
    const timer = this.scene.add.text(
      this.scene.cameras.main.width / 2, // Center horizontally
      40, // Below the experience bar
      '00:00',
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    
    timer.setOrigin(0.5, 0.5);
    timer.setScrollFactor(0); // Fix to camera viewport
    timer.setDepth(2000); // Above other UI elements
    
    return timer;
  }

  /**
   * Create the kill counter display
   */
  private createKillCounter(): void {
    const screenWidth = this.scene.cameras.main.width;
    const x = screenWidth * 0.75; // 3/4 on the right side
    const y = 40; // Same height as timer

    // Create skull sprite if texture exists
    if (this.scene.textures.exists('skull')) {
      this.killCounterSprite = this.scene.add.image(x - 25, y, 'skull');
      this.killCounterSprite.setOrigin(0, 0.5);
      this.killCounterSprite.setScrollFactor(0); // Fix to camera viewport
      this.killCounterSprite.setDepth(2000); // Above other UI elements
      this.killCounterSprite.setScale(2); // Scale if needed
    }

    // Create kill count text
    this.killCounterText = this.scene.add.text(
      x, // Position next to skull
      y,
      '0',
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'left',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    
    this.killCounterText.setOrigin(0, 0.5);
    this.killCounterText.setScrollFactor(0); // Fix to camera viewport
    this.killCounterText.setDepth(2000); // Above other UI elements
  }

  /**
   * Update the kill counter display
   */
  public updateKillCount(count: number): void {
    // Recreate if destroyed
    if (!this.killCounterText || !(this.killCounterText as any).scene) {
      this.createKillCounter();
      // Update immediately after recreation
      if (this.killCounterText) {
        this.killCounterText.setText(count.toString());
      }
      return;
    }

    if (!this.killCounterText.active) {
      return;
    }

    // Update text
    this.killCounterText.setText(count.toString());
  }

  /**
   * Update the game timer
   */
  public updateTimer(): void {
    // Safeguard: recreate timer text if it was destroyed during pause UI
    if (!this.gameTimer || !(this.gameTimer as any).scene) {
      this.gameTimer = this.createGameTimer();
    }
    if (!this.gameTimer.active) {
      return;
    }
    
    const elapsedTime = this.scene.time.now - this.startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.gameTimer.setText(timeString);
  }

  /**
   * Get the current game time in milliseconds
   */
  public getGameTime(): number {
    return this.scene.time.now - this.startTime;
  }

  /**
   * Get the current game time formatted as MM:SS
   */
  public getFormattedTime(): string {
    const elapsedTime = this.getGameTime();
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Create the upgrade icons display container
   */
  private createUpgradeIconsDisplay(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    container.setScrollFactor(0); // Fix to camera viewport
    container.setDepth(2000); // Above other UI elements
    container.setVisible(true);
    return container;
  }

  /**
   * Update upgrade icons based on player's active upgrades
   */
  private updateUpgradeIcons(): void {
    if (!this.upgradeIconsContainer) {
      return;
    }

    // Clear existing icons
    this.upgradeIconSprites.forEach((sprite) => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.upgradeIconSprites.clear();
    this.upgradeIconsContainer.removeAll(true);

    // Position below experience bar (y=30) in left corner
    const startX = 10; // Left padding
    const startY = 35; // Below experience bar (30px height + 5px padding)
    const iconSize = 32; // Icon size
    const iconSpacing = 5; // Space between icons
    const iconsPerRow = 6; // Icons per row before wrapping

    const activeUpgrades: string[] = [];

    // Check which upgrades are active
    if (this.player.hasBlasterAbility()) {
      activeUpgrades.push('blaster');
    }
    if (this.player.hasFlamethrowerAbility()) {
      activeUpgrades.push('unlock_flamethrower');
    }
    if (this.player.hasForceAbility()) {
      activeUpgrades.push('unlock_force');
    }
    if (this.player.hasCombatDroneAbility()) {
      activeUpgrades.push('unlock_combat_drone');
    }
    if (this.player.hasAttackChopperAbility()) {
      activeUpgrades.push('unlock_attack_chopper');
    }

    // Create icons for active upgrades
    activeUpgrades.forEach((upgradeId, index) => {
      const iconKey = this.upgradeIconMap.get(upgradeId);
      if (!iconKey || !this.scene.textures.exists(iconKey)) {
        return; // Skip if icon doesn't exist
      }

      // Calculate position (grid layout)
      const row = Math.floor(index / iconsPerRow);
      const col = index % iconsPerRow;
      const x = startX + col * (iconSize + iconSpacing);
      const y = startY + row * (iconSize + iconSpacing);

      // Create icon sprite
      const iconSprite = this.scene.add.image(x, y, iconKey);
      iconSprite.setOrigin(0, 0); // Top-left origin
      iconSprite.setScrollFactor(0); // Fix to camera
      iconSprite.setDepth(2001); // Above container
      
      // Use displaySize to ensure all icons are the same size regardless of source image size
      iconSprite.setDisplaySize(iconSize, iconSize);

      // Add to container and map
      this.upgradeIconsContainer.add(iconSprite);
      this.upgradeIconSprites.set(upgradeId, iconSprite);
    });
  }

  /**
   * Handle upgrade applied event
   */
  private onUpgradeApplied = (_upgradeId: string): void => {
    this.updateUpgradeIcons();
  };

  /**
   * Setup mobile touch-to-move controls
   */
  private setupMobileTouchControls(): void {
    // Make the entire game area interactive for touch-to-move
    const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
      // Don't process if dash button was just pressed
      if (this.dashButtonPressed) {
        return;
      }
      
      // Don't process if touching the dash button area
      const distToDashButton = Math.sqrt(
        Math.pow(pointer.x - this.dashButtonBounds.x, 2) + 
        Math.pow(pointer.y - this.dashButtonBounds.y, 2)
      );
      
      if (distToDashButton < this.dashButtonBounds.radius * 1.5) {
        return; // Don't move toward dash button (with 50% extra exclusion zone)
      }
      
      // Set touch target in world coordinates
      const cam = this.scene.cameras.main;
      this.touchTarget.x = pointer.x + cam.scrollX;
      this.touchTarget.y = pointer.y + cam.scrollY;
      this.touchTarget.active = true;
    };
    
    const handlePointerMove = (pointer: Phaser.Input.Pointer) => {
      // Don't move if dash button is pressed
      if (this.dashButtonPressed) {
        return;
      }
      
      if (pointer.isDown && this.touchTarget.active) {
        const cam = this.scene.cameras.main;
        this.touchTarget.x = pointer.x + cam.scrollX;
        this.touchTarget.y = pointer.y + cam.scrollY;
      }
    };
    
    const handlePointerUp = () => {
      this.touchTarget.active = false;
      this.dashButtonPressed = false; // Reset dash button flag
    };
    
    this.scene.input.on('pointerdown', handlePointerDown);
    this.scene.input.on('pointermove', handlePointerMove);
    this.scene.input.on('pointerup', handlePointerUp);
  }
  
  /**
   * Get touch target position (for Player to read)
   */
  public getTouchTarget(): { x: number, y: number, active: boolean } {
    return this.touchTarget;
  }
  
  /**
   * Check if touch is active
   */
  public isTouchActive(): boolean {
    return this.touchTarget.active;
  }

  /**
   * Create mobile dash button
   */
  private createMobileDashButton(): void {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    
    // Position in right side, 25% from bottom (75% from top)
    const buttonSize = Math.min(80, screenWidth * 0.12);
    const padding = Math.min(20, screenWidth * 0.03);
    const x = screenWidth - buttonSize / 2 - padding;
    const y = screenHeight * 0.75; // 75% down from top (25% from bottom)
    
    // Store button bounds for touch exclusion
    this.dashButtonBounds = { x, y, radius: buttonSize / 2 };
    
    // Create container for button
    this.mobileDashButton = this.scene.add.container(x, y);
    this.mobileDashButton.setScrollFactor(0);
    this.mobileDashButton.setDepth(2001); // Above other UI
    
    // Create button background (circle)
    const buttonBg = this.scene.add.circle(0, 0, buttonSize / 2, 0x00aaaa, 0.7);
    buttonBg.setStrokeStyle(3, 0x00ffff, 0.9);
    this.mobileDashButton.add(buttonBg);
    
    // Create button icon/text
    const buttonText = this.scene.add.text(0, 0, 'DASH', {
      fontSize: `${Math.max(16, buttonSize * 0.25)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    buttonText.setOrigin(0.5);
    this.mobileDashButton.add(buttonText);
    
    // Make button interactive
    buttonBg.setInteractive({ useHandCursor: true });
    
    // Handle button press - use pointerdown for immediate feedback
    buttonBg.on('pointerdown', () => {
      // Set flag to prevent touch-to-move from activating
      this.dashButtonPressed = true;
      
      if (this.player && !this.player.isDead()) {
        this.player.triggerDash();
        
        // Visual feedback
        buttonBg.setFillStyle(0x008888, 0.9);
        this.scene.tweens.add({
          targets: buttonBg,
          scale: 0.9,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          ease: 'Power2'
        });
      }
    });
    
    // Reset on pointer up
    buttonBg.on('pointerup', () => {
      buttonBg.setFillStyle(0x00aaaa, 0.7);
      // Reset flag after a short delay
      this.scene.time.delayedCall(50, () => {
        this.dashButtonPressed = false;
      });
    });
    
    // Hover effects (for tablets with mouse support)
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x00dddd, 0.8);
    });
    
    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x00aaaa, 0.7);
    });
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    // Remove event listeners
    this.scene.events.off('player-level-up', this.onPlayerLevelUp, this);
    this.scene.events.off('upgrade-applied', this.onUpgradeApplied, this);
    
    // Clean up upgrade icons
    this.upgradeIconSprites.forEach((sprite) => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.upgradeIconSprites.clear();
    
    // Clean up mobile controls
    if (this.mobileDashButton) {
      this.mobileDashButton.destroy();
      this.mobileDashButton = null;
    }
    // Touch controls are event-based, no need to clean up objects
    
    // Remove any dynamic text
    const expText = this.scene.children.getByName('exp-text');
    if (expText) {
      expText.destroy();
    }
    
    const healthText = this.scene.children.getByName('health-text');
    if (healthText) {
      healthText.destroy();
    }
  }
} 