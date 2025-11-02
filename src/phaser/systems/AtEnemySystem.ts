import Phaser from 'phaser';
import { ExperienceSystem } from './ExperienceSystem';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * System responsible for AT enemy spawning, movement, and management
 * Independent system for complete control over AT enemy behavior
 */
export class AtEnemySystem {
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


  // AT-specific properties
  private maxHealth: number = 50; // Higher health than regular enemies
  private damage: number = 15; // Higher damage
  private speed: number = 60; // Slower than regular enemies
  private scale: number = 1.4; // Reduced from 1.75 for smaller size
  
  // Shooting properties
  private shootingInterval: number = 3000; // ms between shooting attempts
  private shootingRange: number = 400; // Distance at which AT will try to shoot (much further)
  private shootingDuration: number = 1000; // How long AT stays still while shooting
  private projectileSystem: any = null; // Will be set by MainScene

  constructor(scene: Phaser.Scene, target: Phaser.Physics.Arcade.Sprite, player: Player) {
    this.scene = scene;
    this.target = target;
    this.player = player;

    // Initialize enemy group with preallocated pool
    this.enemies = this.createEnemyGroup();

    // Set up collisions - AT enemies collide with themselves
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
      defaultKey: 'at_enemy_walk', // Use walk texture as default (enemies start moving)
      maxSize: 50, // Smaller pool since AT enemies are rarer
      runChildUpdate: false // We'll handle updates manually for better control
    });
  }

  /**
   * Set up AT enemy animations
   */
  public static setupAtEnemyAnimations(scene: Phaser.Scene) {
    // Walk animation (4 frames) - used when moving
    if (!scene.anims.exists('at_enemy_walk')) {
      scene.anims.create({
        key: 'at_enemy_walk',
        frames: scene.anims.generateFrameNumbers('at_enemy_walk', { start: 0, end: 3 }), // 4 frames for roller Walk.png
        frameRate: 8,
        repeat: -1
      });
    }
    
    // Attack animation (6 frames) - used when shooting/stopped
    if (!scene.anims.exists('at_enemy_attack')) {
      scene.anims.create({
        key: 'at_enemy_attack',
        frames: scene.anims.generateFrameNumbers('at_enemy_attack', { start: 0, end: 5 }), // 6 frames for roller Attack1.png
        frameRate: 8,
        repeat: -1
      });
    }
    
    // Keep old animation for backward compatibility
    if (!scene.anims.exists('at_enemy')) {
      scene.anims.create({
        key: 'at_enemy',
        frames: scene.anims.generateFrameNumbers('at_enemy', { start: 0, end: 5 }), // 6 frames for roller Attack1.png
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
   * AT enemies spawn faster as player level increases
   */
  private calculateSpawnInterval(): number {
    const baseInterval = GAME_CONFIG.AT.SPAWN_INTERVAL;
    const playerLevel = this.player.getLevel();

    // Reduce spawn interval by 25% per level (minimum 30% of base interval)
    const reductionFactor = Math.max(0.3, 1 - (playerLevel - 1) * 0.25);

    return Math.floor(baseInterval * reductionFactor);
  }

  /**
   * Start the spawn timer
   */
  private startSpawnTimer(): Phaser.Time.TimerEvent {
    // Calculate spawn interval based on player level
    const spawnInterval = this.calculateSpawnInterval();

    // If player hasn't reached minimum level, use a longer delay to check again
    // This prevents wasting timer ticks when player is below level
    const delay = this.player.getLevel() < GAME_CONFIG.AT.MIN_LEVEL 
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
   * Should be called when player level changes
   */
  public updateSpawnRate(): void {
    const playerLevel = this.player.getLevel();
    
    // Destroy existing timer
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null; // Clear reference
    }

    // Create new timer with updated interval
    this.spawnTimer = this.startSpawnTimer();

    const spawnInterval = this.calculateSpawnInterval();
    console.log(`AT enemy spawn rate updated: ${spawnInterval}ms (Player Level: ${playerLevel}, Min Level: ${GAME_CONFIG.AT.MIN_LEVEL})`);
    
    // If player just reached minimum level, force an immediate spawn check
    if (playerLevel >= GAME_CONFIG.AT.MIN_LEVEL) {
      // Schedule immediate spawn attempt (after a short delay to ensure timer is set up)
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
   * Update spawn zones based on camera position (matches EnemySystem pattern)
   */
  private updateSpawnZones(): void {
    const camera = this.scene.cameras.main;
    const padding = 200; // Distance from camera edge to spawn enemies
    
    // Create spawn zones with random ranges (like EnemySystem)
    this.spawnZones = [
      // Left side - random Y position along the left edge
      {
        x: Phaser.Math.Between(camera.scrollX - padding * 2, camera.scrollX - padding),
        y: Phaser.Math.Between(camera.scrollY - padding, camera.scrollY + camera.height + padding)
      },
      // Right side - random Y position along the right edge
      {
        x: Phaser.Math.Between(camera.scrollX + camera.width + padding, camera.scrollX + camera.width + padding * 2),
        y: Phaser.Math.Between(camera.scrollY - padding, camera.scrollY + camera.height + padding)
      },
      // Top side - random X position along the top edge
      {
        x: Phaser.Math.Between(camera.scrollX - padding, camera.scrollX + camera.width + padding),
        y: Phaser.Math.Between(camera.scrollY - padding * 2, camera.scrollY - padding)
      },
      // Bottom side - random X position along the bottom edge
      {
        x: Phaser.Math.Between(camera.scrollX - padding, camera.scrollX + camera.width + padding),
        y: Phaser.Math.Between(camera.scrollY + camera.height + padding, camera.scrollY + camera.height + padding * 2)
      }
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
   * Spawn a new AT enemy
   */
  private spawnEnemy(): void {
    const playerLevel = this.player.getLevel();
    
    // Don't spawn AT enemies until player reaches minimum level
    if (playerLevel < GAME_CONFIG.AT.MIN_LEVEL) {
      return;
    }

    // Check if we've hit the max count
    // Note: This timer loops continuously, so spawning will automatically resume
    // when enemies die and the count drops below MAX_COUNT
    const activeCount = this.enemies.countActive();
    if (activeCount >= GAME_CONFIG.AT.MAX_COUNT) {
      return;
    }

    // Debug log to help diagnose spawning issues
    if (activeCount === 0) {
      console.log(`AT enemy spawning - Level: ${playerLevel}, Active: ${activeCount}/${GAME_CONFIG.AT.MAX_COUNT}, Interval: ${this.calculateSpawnInterval()}ms`);
    }

    // Update spawn zones
    this.updateSpawnZones();

    // Choose a random spawn zone
    const spawnZone = Phaser.Utils.Array.GetRandom(this.spawnZones);
    
    // Get enemy from pool
    const enemy = this.enemies.get();
    if (!enemy) return;

    // Configure enemy
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setPosition(spawnZone.x, spawnZone.y);
    enemy.setScale(this.scale);
    
    // Set up physics body - narrower width, same height
    if (enemy.body) {
      enemy.body.setSize(enemy.width * 0.5, enemy.height * 0.8); // 50% width, 80% height
      enemy.body.setOffset(enemy.width * 0.25, enemy.height * 0.1); // Center the narrower hitbox
    }

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
    enemy.setTexture('at_enemy_walk', 0);
    
    // Start with walk animation (enemy will be moving)
    if (this.scene.anims.exists('at_enemy_walk')) {
      enemy.anims.play('at_enemy_walk', true);
    } else {
      // Fallback to static texture
      enemy.setTexture('at_enemy_walk', 0);
    }

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
    healthBar.setScrollFactor(0); // Fix to camera
    healthBar.setDepth(1500); // Above regular enemies
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
        healthBar.fillStyle(0x00ff00, 0.8); // Green
      } else if (healthPercent > 0.3) {
        healthBar.fillStyle(0xffff00, 0.8); // Yellow
      } else {
        healthBar.fillStyle(0xff0000, 0.8); // Red
      }
      healthBar.fillRect(x, y, width * healthPercent, height);
    }
    
    // Border
    healthBar.lineStyle(1, 0xffffff, 1);
    healthBar.strokeRect(x, y, width, height);
  }

  /**
   * Damage an AT enemy
   */
  public damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockbackForce?: number, isCritical = false): boolean {
    if (!enemy.active) return false;

    (enemy as any).health -= damage;

    // Show floating damage number
    this.showDamageNumber(this.scene, enemy.x, enemy.y - 10, damage, isCritical);
    
    // Only update health bar if enabled
    if (this.healthBarsEnabled) {
      this.updateHealthBar(enemy);
    }
    
    // Apply knockback if specified
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
    
    // Check if enemy is dead
    if ((enemy as any).health <= 0) {
      // Also show number on death for emphasis
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
   * Kill an AT enemy
   */
  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Emit death event
    this.scene.events.emit('enemy-death', enemy.x, enemy.y, 'at_enemy');
    
    // Drop experience
    this.dropExperience(enemy);
    
    // Drop relic (higher chance than regular enemies)
    this.dropRelic(enemy);
    
    // Remove from active enemies
    this.activeEnemies.delete(enemy);
    
    // Remove health bar
    const healthBar = this.healthBars.get(enemy);
    if (healthBar) {
      healthBar.destroy();
      this.healthBars.delete(enemy);
    }
    
    // Remove from offscreen timers
    this.offscreenTimers.delete(enemy);
    
    
    // Return to pool
    enemy.setActive(false);
    enemy.setVisible(false);
    enemy.setPosition(-1000, -1000);
  }

  /**
   * Drop experience when enemy dies
   */
  private dropExperience(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (this.experienceSystem) {
      // Spawn multiple orbs with wider spread so they don't stack
      const numOrbs = 5;
      for (let i = 0; i < numOrbs; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 35; // 15..50px (increased from 6..24px)
        const ox = Math.cos(angle) * radius;
        const oy = Math.sin(angle) * radius;
        this.experienceSystem.spawnOrb(enemy.x + ox, enemy.y + oy);
      }
    }
  }

  /**
   * Drop relic when enemy dies
   */
  private dropRelic(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Configurable chance to drop a relic from AT enemies
    if (Math.random() < GAME_CONFIG.AT.RELIC_DROP_CHANCE) {
      this.scene.events.emit('relic-dropped', enemy.x, enemy.y);
    }
  }

  /**
   * Update all AT enemies
   */
  public update(_time?: number, delta?: number): void {
    // Ensure spawn timer exists (recreate if destroyed)
    // Check if timer is null, undefined, or if it was destroyed (Phaser timers become null when destroyed)
    if (!this.spawnTimer) {
      this.spawnTimer = this.startSpawnTimer();
      console.log('AT enemy spawn timer recreated');
    }
    
    // Note: updateSpawnRate() is called from MainScene when player levels up
    // This ensures spawn timer updates when player reaches minimum level

    this.updateCameraRect();
    
    // Update visible enemies
    this.visibleEnemies = Array.from(this.activeEnemies).filter((enemy: Phaser.Physics.Arcade.Sprite) => 
      enemy.active && this.cameraRect.contains(enemy.x, enemy.y)
    );
    
    // Update each visible enemy
    this.visibleEnemies.forEach(enemy => {
      this.updateEnemy(enemy);
    });
    
    // Clean up off-screen enemies - pass delta time
    this.cleanupOffscreenEnemies(delta || 16.67); // Default to ~60fps if delta not provided
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
        if (enemy.anims.currentAnim?.key !== 'at_enemy_attack' && this.scene.anims.exists('at_enemy_attack')) {
          enemy.setTexture('at_enemy_attack', 0);
          enemy.anims.play('at_enemy_attack', true);
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
        if (enemy.anims.currentAnim?.key !== 'at_enemy_walk' && this.scene.anims.exists('at_enemy_walk')) {
          enemy.setTexture('at_enemy_walk', 0);
          enemy.anims.play('at_enemy_walk', true);
        }
        
        // Flip sprite based on movement direction
        // Roller sprite faces right by default, so we flip when moving left
        if (moveX > 0) {
          enemy.setFlipX(false); // Moving right - no flip (sprite faces right by default)
        } else if (moveX < 0) {
          enemy.setFlipX(true); // Moving left - flip to face left
        }
      } else {
        // If not moving (distance = 0), still use walk animation if not shooting
        if (enemy.anims.currentAnim?.key !== 'at_enemy_walk' && this.scene.anims.exists('at_enemy_walk')) {
          enemy.setTexture('at_enemy_walk', 0);
          enemy.anims.play('at_enemy_walk', true);
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
  private cleanupOffscreenEnemies(delta: number): void {
    const camera = this.scene.cameras.main;
    
    this.activeEnemies.forEach(enemy => {
      // Use more accurate visibility check with enemy bounds (matching EnemySystem)
      const isVisibleToCamera =
        enemy.x + enemy.width > camera.worldView.left &&
        enemy.x - enemy.width < camera.worldView.right &&
        enemy.y + enemy.height > camera.worldView.top &&
        enemy.y - enemy.height < camera.worldView.bottom;

      if (!isVisibleToCamera) {
        const elapsed = this.offscreenTimers.get(enemy) || 0;
        // Accumulate delta time for off-screen enemies
        const newElapsed = elapsed + delta;
        this.offscreenTimers.set(enemy, newElapsed);

        // Despawn after 2 seconds (2000ms) - matching EnemySystem behavior
        if (newElapsed > 2000) {
          this.killEnemy(enemy);
          this.offscreenTimers.delete(enemy);
        }
      } else {
        // If back on screen, reset the timer
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
   * Get number of active AT enemies
   */
  public getEnemyCount(): number {
    return this.enemies.countActive();
  }

  /**
   * Get total number of AT enemies (including inactive)
   */
  public getTotalEnemyCount(): number {
    return this.enemies.getLength();
  }

  /**
   * Set stress test configuration
   */
  public setStressTestConfig(config: {
    spawnInterval: number;
    maxCount: number;
    healthBarsEnabled: boolean;
  }): void {
    // Update spawn timer
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null; // Clear reference
    }
    this.spawnTimer = this.scene.time.addEvent({
      delay: config.spawnInterval,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    // Update max count (resize group if needed)
    if (config.maxCount > this.enemies.maxSize) {
      this.enemies.maxSize = config.maxCount;
    }

    // Store health bars setting
    this.healthBarsEnabled = config.healthBarsEnabled;
  }

  /**
   * Get the enemy group for collision detection
   */
  public getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  /**
   * Get visible enemies for collision detection
   */
  public getVisibleEnemies(): Phaser.Physics.Arcade.Sprite[] {
    return this.visibleEnemies;
  }

  /**
   * Start shooting state for enemy
   */
  private startShooting(enemy: Phaser.Physics.Arcade.Sprite): void {
    (enemy as any).isShooting = true;
    (enemy as any).shootingStartTime = this.scene.time.now;
    (enemy as any).lastShotTime = this.scene.time.now;
    
    // Switch to attack animation immediately when shooting starts
    if (this.scene.anims.exists('at_enemy_attack')) {
      enemy.setTexture('at_enemy_attack', 0);
      enemy.anims.play('at_enemy_attack', true);
    }
    
    // Fire projectile
    this.fireProjectile(enemy);
  }

  /**
   * Stop shooting state for enemy
   */
  private stopShooting(enemy: Phaser.Physics.Arcade.Sprite): void {
    (enemy as any).isShooting = false;
    
    // Switch back to walk animation when shooting stops
    if (enemy.anims.currentAnim?.key !== 'at_enemy_walk' && this.scene.anims.exists('at_enemy_walk')) {
      enemy.setTexture('at_enemy_walk', 0);
      enemy.anims.play('at_enemy_walk', true);
    }
  }

  /**
   * Fire projectile from enemy
   */
  private fireProjectile(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!this.projectileSystem) return;
    
    const dx = this.target.x - enemy.x;
    const dy = this.target.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Normalize direction
      const dirX = dx / distance;
      const dirY = dy / distance;
      
      // Fire enemy projectile using enemy laser pool
      const projectile = this.projectileSystem.fire(
        'enemy_laser', // Use enemy laser pool (laser.png texture)
        enemy.x,
        enemy.y,
        dirX,
        dirY,
        'enemy_blaster' // Projectile type for enemy shots
      );

      // Add trail effect to projectile (same as player blaster)
      if (projectile) {
        this.addProjectileTrail(projectile);
      }
    }
  }

  /**
   * Add visual trail effect to AT enemy projectiles (matching player blaster trail)
   */
  private addProjectileTrail(projectile: Phaser.Physics.Arcade.Sprite): void {
    // Track projectile path points for trail
    const pathPoints: { x: number; y: number; time: number }[] = [];
    const maxTrailLength = 200; // ms of trail history
    
    // Create graphics object for trail
    const trailGraphics = this.scene.add.graphics();
    trailGraphics.setDepth(projectile.depth - 1);
    
    // Update trail every frame
    const updateTrail = () => {
      if (!projectile.active) {
        trailGraphics.destroy();
        return;
      }
      
      const now = this.scene.time.now;
      
      // Add current position to path
      pathPoints.push({ x: projectile.x, y: projectile.y, time: now });
      
      // Remove old points outside trail window
      while (pathPoints.length > 0 && (now - pathPoints[0].time) > maxTrailLength) {
        pathPoints.shift();
      }
      
      // Draw trail
      trailGraphics.clear();
      
      if (pathPoints.length > 1) {
        // Draw trail segments with fading alpha
        for (let i = 1; i < pathPoints.length; i++) {
          const prev = pathPoints[i - 1];
          const curr = pathPoints[i];
          const age = now - curr.time;
          const alpha = 1.0 - (age / maxTrailLength); // Fade out over time
          
          // Red trail line
          trailGraphics.lineStyle(3, 0xff0000, alpha * 0.8);
          trailGraphics.lineBetween(prev.x, prev.y, curr.x, curr.y);
          
          // White highlight
          trailGraphics.lineStyle(1, 0xffffff, alpha * 0.5);
          trailGraphics.lineBetween(prev.x, prev.y, curr.x, curr.y);
        }
      }
      
      // Continue updating
      this.scene.time.delayedCall(16, updateTrail); // ~60fps
    };
    
    // Start trail updates
    updateTrail();
  }

  /**
   * Set projectile system reference for shooting
   */
  public setProjectileSystem(projectileSystem: any): void {
    this.projectileSystem = projectileSystem;
  }

  /**
   * Clean up the system
   */
  public destroy(): void {
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
