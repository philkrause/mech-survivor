import Phaser from 'phaser';
import { ExperienceSystem } from './ExperienceSystem';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Laser line interface for walker enemy attacks
 */
interface LaserLine {
  graphics: Phaser.GameObjects.Graphics;
  line: Phaser.Geom.Line;
  startTime: number;
  active: boolean;
  enemy: Phaser.Physics.Arcade.Sprite;
  damageTimer?: Phaser.Time.TimerEvent | null;
  isFiring: boolean; // true when firing (blue), false when aiming (white)
}

/**
 * System responsible for Walker enemy spawning, movement, and management
 * Similar to AT enemy but shoots laser lines instead of projectiles
 */
export class WalkerEnemySystem {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private target: Phaser.Physics.Arcade.Sprite;
  private player: Player;
  private experienceSystem: ExperienceSystem | null = null;

  // Tracking active enemies for improved performance
  private activeEnemies: Set<Phaser.Physics.Arcade.Sprite> = new Set();
  private cameraRect: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
  private visibleEnemies: Array<Phaser.Physics.Arcade.Sprite> = [];
  private spawnZones: Array<{ x: number, y: number }> = [];
  
  // Tracking enemies that are off screen 
  private offscreenTimers: Map<Phaser.Physics.Arcade.Sprite, number> = new Map();

  // Health bars for enemies
  private healthBars: Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Graphics> = new Map();
  private healthBarsEnabled: boolean = true;

  // Walker-specific properties
  private maxHealth: number = 60; // Higher health than regular enemies
  private damage: number = 18; // Higher damage
  private speed: number = 50; // Slower than regular enemies
  private scale: number = 1.5; // Scale for walker
  
  // Shooting properties
  private shootingInterval: number = 3500; // ms between shooting attempts
  private shootingRange: number = 350; // Distance at which Walker will try to shoot
  private shootingDuration: number = 1500; // How long Walker stays still while shooting
  private laserDuration: number = GAME_CONFIG.WALKER.LASER_DURATION;
  private aimingDuration: number = GAME_CONFIG.WALKER.AIMING_DURATION;
  private firingDuration: number = GAME_CONFIG.WALKER.FIRING_DURATION;
  
  // Laser lines (active laser attacks)
  private activeLasers: Map<Phaser.Physics.Arcade.Sprite, LaserLine> = new Map();

  constructor(scene: Phaser.Scene, target: Phaser.Physics.Arcade.Sprite, player: Player) {
    this.scene = scene;
    this.target = target;
    this.player = player;

    // Initialize enemy group with preallocated pool
    this.enemies = this.createEnemyGroup();

    // Set up collisions - Walker enemies collide with themselves
    this.scene.physics.add.collider(this.enemies, this.enemies);

    // Pre-populate the object pool to avoid runtime allocations
    this.prepopulateEnemyPool();

    // Set up spawn timer (spawn less frequently than regular enemies)
    this.spawnTimer = this.startSpawnTimer();

    // Initialize spawn zones
    this.initializeSpawnZones();

    // Set up camera rectangle for culling
    this.updateCameraRect();
  }

  /**
   * Create the enemy group with object pooling
   */
  private createEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.scene.physics.add.group({
      defaultKey: 'walker_walk', // Use walk texture as default (enemies start moving)
      maxSize: 50, // Smaller pool since Walker enemies are rarer
      runChildUpdate: false // We'll handle updates manually for better control
    });
  }

  /**
   * Set up Walker enemy animations
   */
  public static setupWalkerAnimations(scene: Phaser.Scene) {
    // Walk animation (6 frames) - used when moving
    if (!scene.anims.exists('walker_walk')) {
      scene.anims.create({
        key: 'walker_walk',
        frames: scene.anims.generateFrameNumbers('walker_walk', { start: 0, end: 5 }), // 6 frames for walker Walk.png
        frameRate: 8,
        repeat: -1
      });
    }
    
    // Attack animation (6 frames) - used when shooting/stopped
    if (!scene.anims.exists('walker_attack')) {
      scene.anims.create({
        key: 'walker_attack',
        frames: scene.anims.generateFrameNumbers('walker_attack', { start: 0, end: 5 }), // 6 frames for walker Attack1.png
        frameRate: 8,
        repeat: -1
      });
    }
  }

  /**
   * Pre-populate the enemy pool
   */
  private prepopulateEnemyPool(): void {
    for (let i = 0; i < 20; i++) {
      const enemy = this.enemies.get();
      if (enemy) {
        enemy.setActive(false);
        enemy.setVisible(false);
        enemy.setPosition(-1000, -1000); // Place off-screen
      }
    }
  }

  /**
   * Calculate spawn interval based on player level
   */
  private calculateSpawnInterval(): number {
    const baseInterval = GAME_CONFIG.WALKER.SPAWN_INTERVAL;
    const playerLevel = this.player.getLevel();

    // Reduce spawn interval by 25% per level (minimum 30% of base interval)
    const reductionFactor = Math.max(0.3, 1 - (playerLevel - 1) * 0.25);

    return Math.floor(baseInterval * reductionFactor);
  }

  /**
   * Start the spawn timer
   */
  private startSpawnTimer(): Phaser.Time.TimerEvent {
    const spawnInterval = this.calculateSpawnInterval();

    const delay = this.player.getLevel() < GAME_CONFIG.WALKER.MIN_LEVEL 
      ? Math.max(spawnInterval, 5000) // Check every 5 seconds if below level
      : spawnInterval;

    return this.scene.time.addEvent({
      delay: delay,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Update spawn timer when player levels up
   */
  public updateSpawnRate(): void {
    const playerLevel = this.player.getLevel();
    
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }

    this.spawnTimer = this.startSpawnTimer();

    const spawnInterval = this.calculateSpawnInterval();
    console.log(`Walker enemy spawn rate updated: ${spawnInterval}ms (Player Level: ${playerLevel}, Min Level: ${GAME_CONFIG.WALKER.MIN_LEVEL})`);
    
    if (playerLevel >= GAME_CONFIG.WALKER.MIN_LEVEL) {
      this.scene.time.delayedCall(100, () => {
        this.spawnEnemy();
      });
    }
  }

  /**
   * Initialize spawn zones around the camera
   */
  private initializeSpawnZones(): void {
    this.updateSpawnZones();
  }

  /**
   * Update spawn zones based on camera position
   */
  private updateSpawnZones(): void {
    const camera = this.scene.cameras.main;
    const margin = 200; // Distance from camera edge to spawn enemies
    
    this.spawnZones = [
      // Left side
      { x: camera.scrollX - margin, y: camera.centerY },
      // Right side
      { x: camera.scrollX + camera.width + margin, y: camera.centerY },
      // Top side
      { x: camera.centerX, y: camera.scrollY - margin },
      // Bottom side
      { x: camera.centerX, y: camera.scrollY + camera.height + margin }
    ];
  }

  /**
   * Update camera rectangle for culling
   */
  private updateCameraRect(): void {
    const camera = this.scene.cameras.main;
    this.cameraRect.setTo(
      camera.scrollX - 100,
      camera.scrollY - 100,
      camera.width + 200,
      camera.height + 200
    );
  }

  /**
   * Spawn a new Walker enemy
   */
  private spawnEnemy(): void {
    const playerLevel = this.player.getLevel();
    
    if (playerLevel < GAME_CONFIG.WALKER.MIN_LEVEL) {
      return;
    }

    const activeCount = this.enemies.countActive();
    if (activeCount >= GAME_CONFIG.WALKER.MAX_COUNT) {
      return;
    }

    this.updateSpawnZones();
    const spawnZone = Phaser.Utils.Array.GetRandom(this.spawnZones);
    
    const enemy = this.enemies.get();
    if (!enemy) return;

    // Configure enemy
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setPosition(spawnZone.x, spawnZone.y);
    enemy.setScale(this.scale);
    
    // Set up physics body - wait for next frame to ensure sprite dimensions are available
    this.scene.time.delayedCall(0, () => {
      if (!enemy.active || !enemy.body) return;
      
      // Use frame dimensions if available, otherwise fallback to sprite dimensions
      const frameWidth = enemy.frame?.width || enemy.width || 72;
      const frameHeight = enemy.frame?.height || enemy.height || 72;
      
      enemy.body.setSize(frameWidth * 0.5, frameHeight * 0.8);
      enemy.body.setOffset(frameWidth * 0.25, frameHeight * 0.1);
    });

    // Set enemy properties
    (enemy as any).health = this.maxHealth;
    (enemy as any).maxHealth = this.maxHealth;
    (enemy as any).damage = this.damage;
    (enemy as any).speed = this.speed;
    (enemy as any).lastDamageTime = 0;
    
    // Set shooting properties
    (enemy as any).isShooting = false;
    (enemy as any).lastShotTime = 0;
    (enemy as any).shootingStartTime = 0;

    // Set initial texture to walk animation
    // Wait for next frame to ensure texture/frame data is available
    this.scene.time.delayedCall(0, () => {
      if (!enemy.active || !enemy.body) return;
      
      // Set texture first
      if (this.scene.textures.exists('walker_walk')) {
        enemy.setTexture('walker_walk', 0);
        
        // Wait one more frame before playing animation to ensure frame data is ready
        this.scene.time.delayedCall(16, () => {
          if (!enemy.active) return;
          
          // Start with walk animation
          if (this.scene.anims.exists('walker_walk')) {
            enemy.anims.play('walker_walk', true);
          } else {
            // Fallback to static texture if animation doesn't exist
            enemy.setTexture('walker_walk', 0);
          }
        });
      } else {
        // Fallback if texture doesn't exist
        console.warn('Walker walk texture not found');
      }
    });

    // Add to active enemies
    this.activeEnemies.add(enemy);

    // Create health bar if enabled
    if (this.healthBarsEnabled) {
      this.createHealthBar(enemy);
    }
  }

  /**
   * Create health bar for enemy
   */
  private createHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    const healthBar = this.scene.add.graphics();
    healthBar.setScrollFactor(0);
    healthBar.setDepth(1500);
    this.healthBars.set(enemy, healthBar);
    this.updateHealthBar(enemy);
  }

  /**
   * Update health bar for enemy
   */
  private updateHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    const healthBar = this.healthBars.get(enemy);
    if (!healthBar || !enemy.active) return;

    const camera = this.scene.cameras.main;
    const x = enemy.x - camera.scrollX - 20;
    const y = enemy.y - camera.scrollY - 30;
    
    healthBar.clear();
    
    const healthPercent = (enemy as any).health / (enemy as any).maxHealth;
    const width = 40;
    const height = 4;
    
    // Background
    healthBar.fillStyle(0x222222, 0.8);
    healthBar.fillRect(x, y, width, height);
    
    // Health
    if (healthPercent > 0) {
      if (healthPercent > 0.6) {
        healthBar.fillStyle(0x00ff00, 0.8);
      } else if (healthPercent > 0.3) {
        healthBar.fillStyle(0xffff00, 0.8);
      } else {
        healthBar.fillStyle(0xff0000, 0.8);
      }
      healthBar.fillRect(x, y, width * healthPercent, height);
    }
    
    // Border
    healthBar.lineStyle(1, 0xffffff, 1);
    healthBar.strokeRect(x, y, width, height);
  }

  /**
   * Damage a Walker enemy
   */
  public damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockbackForce?: number, isCritical = false): boolean {
    if (!enemy.active) return false;

    (enemy as any).health -= damage;
    this.showDamageNumber(this.scene, enemy.x, enemy.y - 10, damage, isCritical);
    
    if (this.healthBarsEnabled) {
      this.updateHealthBar(enemy);
    }
    
    if (knockbackForce && enemy.body) {
      const dx = enemy.x - this.target.x;
      const dy = enemy.y - this.target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const knockbackX = (dx / distance) * knockbackForce;
        const knockbackY = (dy / distance) * knockbackForce;
        enemy.setVelocity(knockbackX, knockbackY);
      }
    }
    
    if ((enemy as any).health <= 0) {
      this.showDamageNumber(this.scene, enemy.x, enemy.y - 10, damage, isCritical);
      this.killEnemy(enemy);
      return true;
    }
    
    return false;
  }

  /**
   * Show floating damage number above enemy
   */
  private showDamageNumber(scene: Phaser.Scene, x: number, y: number, damage: number, isCritical = false): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '24px',
      color: isCritical ? '#ff3333' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial'
    };

    if (!damage) return;
    const text = scene.add.text(x, y, damage.toString(), style)
      .setDepth(100)
      .setOrigin(0.5);

    scene.tweens.add({
      targets: text,
      y: y - 20,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }

  /**
   * Kill a Walker enemy
   */
  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Clean up any active laser from this enemy
    this.cleanupLaser(enemy);
    
    this.scene.events.emit('enemy-death', enemy.x, enemy.y, 'walker');
    this.dropExperience(enemy);
    
    if (Math.random() < GAME_CONFIG.WALKER.RELIC_DROP_CHANCE) {
      this.scene.events.emit('relic-dropped', enemy.x, enemy.y);
    }
    
    this.activeEnemies.delete(enemy);
    
    const healthBar = this.healthBars.get(enemy);
    if (healthBar) {
      healthBar.destroy();
      this.healthBars.delete(enemy);
    }
    
    this.offscreenTimers.delete(enemy);
    
    enemy.setActive(false);
    enemy.setVisible(false);
    enemy.setPosition(-1000, -1000);
  }

  /**
   * Drop experience when enemy dies
   */
  private dropExperience(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (this.experienceSystem) {
      const numOrbs = 5;
      for (let i = 0; i < numOrbs; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 35;
        const ox = Math.cos(angle) * radius;
        const oy = Math.sin(angle) * radius;
        this.experienceSystem.spawnOrb(enemy.x + ox, enemy.y + oy);
      }
    }
  }

  /**
   * Update all Walker enemies
   */
  public update(): void {
    if (!this.spawnTimer) {
      this.spawnTimer = this.startSpawnTimer();
    }

    this.updateCameraRect();
    
    this.visibleEnemies = Array.from(this.activeEnemies).filter((enemy: Phaser.Physics.Arcade.Sprite) => 
      enemy.active && this.cameraRect.contains(enemy.x, enemy.y)
    );
    
    this.visibleEnemies.forEach(enemy => {
      this.updateEnemy(enemy);
    });
    
    // Update laser lines
    this.updateLasers();
    
    this.cleanupOffscreenEnemies();
  }

  /**
   * Update individual enemy
   */
  private updateEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) return;
    
    const currentTime = this.scene.time.now;
    const dx = this.target.x - enemy.x;
    const dy = this.target.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if enemy should start shooting
    if (!(enemy as any).isShooting && 
        distance <= this.shootingRange && 
        currentTime - (enemy as any).lastShotTime >= this.shootingInterval) {
      this.startShooting(enemy);
    }
    
    // Handle shooting state
    if ((enemy as any).isShooting) {
      if (currentTime - (enemy as any).shootingStartTime >= this.shootingDuration) {
        this.stopShooting(enemy);
      } else {
        // Stay still while shooting
        enemy.setVelocity(0, 0);
        
        // Switch to attack animation when shooting
        if (enemy.anims.currentAnim?.key !== 'walker_attack' && this.scene.anims.exists('walker_attack')) {
          enemy.setTexture('walker_attack', 0);
          enemy.anims.play('walker_attack', true);
        }
      }
    } else {
      // Normal movement towards player
      if (distance > 0) {
        const speed = (enemy as any).speed;
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;
        
        enemy.setVelocity(moveX, moveY);
        
        // Switch to walk animation when moving
        if (enemy.anims.currentAnim?.key !== 'walker_walk' && this.scene.anims.exists('walker_walk')) {
          enemy.setTexture('walker_walk', 0);
          enemy.anims.play('walker_walk', true);
        }
        
        // Flip sprite based on movement direction
        if (moveX > 0) {
          enemy.setFlipX(false); // Moving right
        } else if (moveX < 0) {
          enemy.setFlipX(true); // Moving left
        }
      } else {
        // If not moving, still use walk animation if not shooting
        if (enemy.anims.currentAnim?.key !== 'walker_walk' && this.scene.anims.exists('walker_walk')) {
          enemy.setTexture('walker_walk', 0);
          enemy.anims.play('walker_walk', true);
        }
      }
    }
    
    // Update health bar position
    if (this.healthBarsEnabled) {
      this.updateHealthBar(enemy);
    }
  }

  /**
   * Clean up enemies that have been off-screen too long
   */
  private cleanupOffscreenEnemies(): void {
    const currentTime = this.scene.time.now;
    const maxOffscreenTime = 5000;
    
    this.activeEnemies.forEach(enemy => {
      if (!this.cameraRect.contains(enemy.x, enemy.y)) {
        if (!this.offscreenTimers.has(enemy)) {
          this.offscreenTimers.set(enemy, currentTime);
        } else {
          const offscreenTime = currentTime - this.offscreenTimers.get(enemy)!;
          if (offscreenTime > maxOffscreenTime) {
            this.killEnemy(enemy);
          }
        }
      } else {
        this.offscreenTimers.delete(enemy);
      }
    });
  }

  /**
   * Set experience system reference
   */
  public setExperienceSystem(experienceSystem: ExperienceSystem): void {
    this.experienceSystem = experienceSystem;
  }

  /**
   * Get number of active Walker enemies
   */
  public getEnemyCount(): number {
    return this.enemies.countActive();
  }

  /**
   * Get visible enemies for collision detection
   */
  public getVisibleEnemies(): Phaser.Physics.Arcade.Sprite[] {
    return this.visibleEnemies;
  }

  /**
   * Get the enemy group for collision detection
   */
  public getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  /**
   * Start shooting state for enemy
   */
  private startShooting(enemy: Phaser.Physics.Arcade.Sprite): void {
    (enemy as any).isShooting = true;
    (enemy as any).shootingStartTime = this.scene.time.now;
    (enemy as any).lastShotTime = this.scene.time.now;
    
    // Switch to attack animation immediately
    if (this.scene.anims.exists('walker_attack')) {
      enemy.setTexture('walker_attack', 0);
      enemy.anims.play('walker_attack', true);
    }
    
    // Fire laser line
    this.fireLaserLine(enemy);
  }

  /**
   * Stop shooting state for enemy
   */
  private stopShooting(enemy: Phaser.Physics.Arcade.Sprite): void {
    (enemy as any).isShooting = false;
    
    // Switch back to walk animation
    if (enemy.anims.currentAnim?.key !== 'walker_walk' && this.scene.anims.exists('walker_walk')) {
      enemy.setTexture('walker_walk', 0);
      enemy.anims.play('walker_walk', true);
    }
  }

  /**
   * Fire laser line from enemy (replaces projectile)
   */
  private fireLaserLine(enemy: Phaser.Physics.Arcade.Sprite): void {
    const dx = this.target.x - enemy.x;
    const dy = this.target.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    // Calculate direction to player
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Create graphics object for laser line
    const graphics = this.scene.add.graphics();
    graphics.setDepth(1501); // Above enemies (same depth as AT health bars)
    
    // Calculate laser line length (span across screen + buffer)
    const camera = this.scene.cameras.main;
    const screenDiagonal = Math.sqrt(camera.width * camera.width + camera.height * camera.height);
    const laserLength = screenDiagonal * 1.5; // Extend beyond screen edges
    
    // Start position (from enemy center)
    const startX = enemy.x;
    const startY = enemy.y;
    
    // End position (extends in direction of player)
    const endX = startX + (dirX * laserLength);
    const endY = startY + (dirY * laserLength);
    
    // Create line geometry
    const line = new Phaser.Geom.Line(startX, startY, endX, endY);
    
    // Store laser line data
    const laserLine: LaserLine = {
      graphics: graphics,
      line: line,
      startTime: this.scene.time.now,
      active: true,
      enemy: enemy,
      damageTimer: null,
      isFiring: false // Start in aiming phase (white line)
    };
    
    this.activeLasers.set(enemy, laserLine);
    
    // Draw initial laser line (white - aiming phase)
    this.drawLaserLine(laserLine);
    
    // Transition from aiming to firing after aiming duration
    this.scene.time.delayedCall(this.aimingDuration, () => {
      if (laserLine.active) {
        laserLine.isFiring = true; // Switch to firing phase (blue line)
        // Now check for player collision and start damage timer
        this.checkPlayerLaserCollision(laserLine);
      }
    });
    
    // Auto-cleanup after total duration
    this.scene.time.delayedCall(this.laserDuration, () => {
      this.cleanupLaser(enemy);
    });
  }

  /**
   * Draw/update laser line
   */
  private drawLaserLine(laserLine: LaserLine): void {
    if (!laserLine.active || !laserLine.graphics.active) return;
    
    const graphics = laserLine.graphics;
    const line = laserLine.line;
    
    graphics.clear();
    
    const elapsed = this.scene.time.now - laserLine.startTime;
    
    if (!laserLine.isFiring) {
      // AIMING PHASE: White line only (no damage)
      const alpha = Math.max(0, Math.min(1, (this.aimingDuration - elapsed) / this.aimingDuration));
      graphics.lineStyle(4, 0xffffff, alpha * 0.9); // White aiming line
      graphics.lineBetween(line.x1, line.y1, line.x2, line.y2);
    } else {
      // FIRING PHASE: Blue line with gradual animation down the line
      const firingElapsed = elapsed - this.aimingDuration;
      const firingProgress = Math.min(1, firingElapsed / this.firingDuration);
      
      // Calculate remaining time for alpha fade
      const remaining = this.laserDuration - elapsed;
      const alpha = Math.max(0, Math.min(1, remaining / this.firingDuration));
      
      // Calculate how far the blue has traveled (from start to end)
      const blueProgress = firingProgress; // 0 to 1 as blue travels down line
      
      // Calculate point where blue transition occurs
      const transitionX = line.x1 + (line.x2 - line.x1) * blueProgress;
      const transitionY = line.y1 + (line.y2 - line.y1) * blueProgress;
      
      // Draw white line (aiming section) - from start to transition point
      graphics.lineStyle(4, 0xffffff, alpha * 0.7);
      graphics.lineBetween(line.x1, line.y1, transitionX, transitionY);
      
      // Draw blue firing section - from transition point to end
      graphics.lineStyle(6, 0x0066ff, alpha * 0.9); // Blue outline
      graphics.lineBetween(transitionX, transitionY, line.x2, line.y2);
      
      // Draw inner white core for firing section
      graphics.lineStyle(3, 0xffffff, alpha * 0.8); // White core
      graphics.lineBetween(transitionX, transitionY, line.x2, line.y2);
    }
  }

  /**
   * Update all active laser lines
   */
  private updateLasers(): void {
    const currentTime = this.scene.time.now;
    
    this.activeLasers.forEach((laserLine, enemy) => {
      if (!laserLine.active || !enemy.active) {
        this.cleanupLaser(enemy);
        return;
      }
      
      // Update laser visuals (fade out over time)
      this.drawLaserLine(laserLine);
      
      // Check if laser has expired
      const elapsed = currentTime - laserLine.startTime;
      if (elapsed >= this.laserDuration) {
        this.cleanupLaser(enemy);
      }
    });
  }

  /**
   * Check player collision with laser line and apply damage (only during firing phase)
   */
  private checkPlayerLaserCollision(laserLine: LaserLine): void {
    if (!laserLine.active || !laserLine.isFiring) return; // Only check during firing phase
    
    const playerSprite = this.player.getSprite();
    if (!playerSprite || !playerSprite.body) return;
    
    // Get player body bounds
    const playerBody = playerSprite.body;
    const playerBounds = new Phaser.Geom.Rectangle(
      playerBody.x,
      playerBody.y,
      playerBody.width,
      playerBody.height
    );
    
    // Check if player intersects with laser line
    const intersects = Phaser.Geom.Intersects.LineToRectangle(laserLine.line, playerBounds);
    
    if (intersects) {
      // Start damage timer if not already running
      if (!laserLine.damageTimer) {
        laserLine.damageTimer = this.scene.time.addEvent({
          delay: GAME_CONFIG.WALKER.LASER_DAMAGE_INTERVAL,
          callback: () => {
            // Only damage during firing phase
            if (!laserLine.active || !laserLine.isFiring || !playerSprite.active) {
              if (laserLine.damageTimer) {
                laserLine.damageTimer.destroy();
                laserLine.damageTimer = null;
              }
              return;
            }
            
            // Re-check intersection (player might have moved)
            const currentPlayerBody = playerSprite.body;
            if (!currentPlayerBody) {
              if (laserLine.damageTimer) {
                laserLine.damageTimer.destroy();
                laserLine.damageTimer = null;
              }
              return;
            }
            
            const currentPlayerBounds = new Phaser.Geom.Rectangle(
              currentPlayerBody.x,
              currentPlayerBody.y,
              currentPlayerBody.width,
              currentPlayerBody.height
            );
            
            // Only damage if still intersecting and in firing phase
            if (laserLine.isFiring && Phaser.Geom.Intersects.LineToRectangle(laserLine.line, currentPlayerBounds)) {
              this.player.takeDamage(GAME_CONFIG.WALKER.LASER_DAMAGE);
            } else {
              // Player moved away or no longer firing, stop damage timer
              if (laserLine.damageTimer) {
                laserLine.damageTimer.destroy();
                laserLine.damageTimer = null;
              }
            }
          },
          callbackScope: this,
          loop: true
        });
      }
    }
  }

  /**
   * Clean up laser line
   */
  private cleanupLaser(enemy: Phaser.Physics.Arcade.Sprite): void {
    const laserLine = this.activeLasers.get(enemy);
    if (!laserLine) return;
    
    // Stop damage timer
    if (laserLine.damageTimer) {
      laserLine.damageTimer.destroy();
      laserLine.damageTimer = null;
    }
    
    // Destroy graphics
    if (laserLine.graphics && laserLine.graphics.active) {
      laserLine.graphics.destroy();
    }
    
    // Remove from active lasers
    this.activeLasers.delete(enemy);
  }

  /**
   * Clean up the system
   */
  public destroy(): void {
    // Clean up all lasers
    this.activeLasers.forEach((_laserLine, enemy) => {
      this.cleanupLaser(enemy);
    });
    this.activeLasers.clear();
    
    // Destroy spawn timer
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
    
    // Destroy health bars
    this.healthBars.forEach(healthBar => healthBar.destroy());
    this.healthBars.clear();
    
    // Clear active enemies
    this.activeEnemies.clear();
    this.visibleEnemies = [];
    this.offscreenTimers.clear();
  }
}

