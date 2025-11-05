import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
//import { getRandomEdgePosition } from '../utils/MathUtils';
import { ExperienceSystem } from './ExperienceSystem';
import { Player } from '../entities/Player';

/**
 * System responsible for enemy spawning, movement, and management
 */
export class EnemySystem {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private target: Phaser.Physics.Arcade.Sprite;
  private player: Player;
  private experienceSystem: ExperienceSystem | null = null;
  private gameStartTime: number = 0;
  private lastSpawnRateUpdate: number = 0;

  // Tracking active enemies for improved performance
  private activeEnemies: Set<Phaser.Physics.Arcade.Sprite> = new Set();
  private cameraRect: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
  private visibleEnemies: Array<Phaser.Physics.Arcade.Sprite> = [];
  private spawnZones: Array<{ x: number, y: number }> = [];
  // tracking enemies that are off screen 
  private offscreenTimers: Map<Phaser.Physics.Arcade.Sprite, number> = new Map();

  // Wave-based spawning (Vampire Survivors style)
  private isWaveActive: boolean = true; // Start with a wave
  private currentWaveNumber: number = 1;
  private waveTimer: Phaser.Time.TimerEvent | null = null;
  private burstTimer: Phaser.Time.TimerEvent | null = null;

  // Health bars for enemies
  private healthBars: Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Graphics> = new Map();
  private healthBarsEnabled: boolean = true;
  
  // Enemy glow lights for lighting system
  private enemyLights: Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Light> = new Map();

  // Buffer to avoid allocations in update loop
  private vectorBuffer = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, target: Phaser.Physics.Arcade.Sprite, player: Player) {
    this.scene = scene;
    this.target = target;
    this.player = player;
    this.gameStartTime = scene.time.now; // Track when game started
    this.lastSpawnRateUpdate = scene.time.now; // Track last spawn rate update

    // Initialize enemy group with preallocated pool
    this.enemies = this.createEnemyGroup();

    // create collisions between enemies
    this.scene.physics.add.collider(this.enemies, this.enemies);

    // Pre-populate the object pool to avoid runtime allocations
    this.prepopulateEnemyPool();

    // Set up wave-based spawning if enabled
    if (GAME_CONFIG.ENEMY.WAVES.ENABLED) {
      this.startWaveCycle();
    } else {
      // Set up traditional spawn timer
      this.spawnTimer = this.startSpawnTimer();
    }
    //this.spawnTfighterFormation();
    
  }

  /**
 * Returns enemies near a given point within a radius
 */
  getEnemiesNear(x: number, y: number, radius: number): Phaser.Physics.Arcade.Sprite[] {
    const result: Phaser.Physics.Arcade.Sprite[] = [];

    const radiusSq = radius * radius;
    for (const enemy of this.activeEnemies) {
      if (!enemy.active) continue;

      const dx = enemy.x - x;
      const dy = enemy.y - y;

      // Square distance check for better performance
      if (dx * dx + dy * dy <= radiusSq) {

        result.push(enemy);
      }
    }

    return result;
  }


  /**
   * Create the enemy physics group with pooling
   */
  private createEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: GAME_CONFIG.ENEMY.MAX_COUNT,
      runChildUpdate: false // We'll handle updates manually for better control
    });
  }

  public static setupEnemyAnimations(scene: Phaser.Scene) {
    //console.log("Setting up enemy animations");
    scene.anims.create({
      key: 'steppercannon',
      frames: scene.anims.generateFrameNumbers('steppercannon', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    scene.anims.create({
      key: 'soldier1',
      frames: scene.anims.generateFrameNumbers('soldier1', { start: 0, end: 5 }), // 6 frames for ShockBot Walk.png
      frameRate: 8,
      repeat: -1
    });

    scene.anims.create({
      key: 'hover',
      frames: scene.anims.generateFrameNumbers('hover', { start: 0, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

  }


  /**
   * Prepopulate the enemy pool to avoid runtime allocations
   */
  private prepopulateEnemyPool(): void {
    // Preallocate enemy objects to avoid allocations during gameplay
    for (let i = 0; i < GAME_CONFIG.ENEMY.MAX_COUNT; i++) {
      const enemy = this.enemies.create(0, 0, 'steppercannon') as Phaser.Physics.Arcade.Sprite;
      enemy.setActive(false);
      enemy.setVisible(false);
      enemy.disableBody(true, true);
      enemy.setAlpha(1);

      // Configure enemy properties once
      this.configureEnemyProperties(enemy);
    }
  }

  /**
   * Start the enemy spawning timer
   */
  private startSpawnTimer(): Phaser.Time.TimerEvent {
    // Calculate spawn interval based on player level
    const spawnInterval = this.calculateSpawnInterval();

    return this.scene.time.addEvent({
      delay: spawnInterval,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
  }


  /**
   * Calculate spawn interval based on player level and elapsed time
   * Enemies spawn faster as player level increases and time passes
   */
  private calculateSpawnInterval(): number {
    const baseInterval = GAME_CONFIG.ENEMY.SPAWN_INTERVAL;
    const playerLevel = this.player.getLevel();
    const MIN_SPAWN_INTERVAL = 50; // Minimum delay in ms to prevent infinite loops

    // Level-based reduction: 25% per level (minimum 30% of base interval)
    const levelReductionFactor = Math.max(
      GAME_CONFIG.ENEMY.LEVEL_SCALING.MIN_REDUCTION_FACTOR,
      1 - (playerLevel - 1) * GAME_CONFIG.ENEMY.LEVEL_SCALING.REDUCTION_PER_LEVEL
    );

    // Time-based reduction: 10% per minute (maximum 50% reduction)
    const elapsedTime = this.scene.time.now - this.gameStartTime;
    const minutesElapsed = Math.floor(elapsedTime / 60000);
    const timeReduction = Math.min(
      minutesElapsed * GAME_CONFIG.ENEMY.TIME_SCALING.REDUCTION_PER_MINUTE,
      GAME_CONFIG.ENEMY.TIME_SCALING.MAX_REDUCTION
    );
    const timeReductionFactor = Math.max(0.1, 1 - timeReduction); // Prevent going to 0

    // Combine both reductions (multiply factors)
    const totalReductionFactor = levelReductionFactor * timeReductionFactor;

    // Calculate interval and ensure minimum delay
    const calculatedInterval = baseInterval * totalReductionFactor;
    
    // Ensure minimum delay to prevent infinite loops
    return Math.max(MIN_SPAWN_INTERVAL, Math.floor(calculatedInterval));
  }

  /**
   * Update spawn timer when player levels up or time passes
   * Should be called when player level changes or periodically for time-based scaling
   */
  updateSpawnRate(): void {
    // If wave-based spawning is disabled, use traditional method
    if (!GAME_CONFIG.ENEMY.WAVES.ENABLED) {
      // Destroy existing timer
      if (this.spawnTimer) {
        this.spawnTimer.destroy();
      }

      // Create new timer with updated interval
      this.spawnTimer = this.startSpawnTimer();

      const elapsedTime = this.scene.time.now - this.gameStartTime;
      const minutesElapsed = Math.floor(elapsedTime / 60000);
      console.log(`Enemy spawn rate updated: ${this.calculateSpawnInterval()}ms (Player Level: ${this.player.getLevel()}, Time: ${minutesElapsed}m)`);
    } else {
      // For wave-based spawning, update the spawn interval but keep wave cycle
      if (this.isWaveActive && this.spawnTimer) {
        this.spawnTimer.destroy();
        this.spawnTimer = this.startSpawnTimer();
      }
    }
  }



  private createSpawnZones():{ x: number; y: number; }[] {     

    const cam = this.scene.cameras.main;
    const padding = GAME_CONFIG.ENEMY.SPAWN_PADDING || 100;

    // Define spawn zones just off-screen (left, right, top, bottom)
    return this.spawnZones = [
      {
        x: Phaser.Math.Between(cam.scrollX - padding * 2, cam.scrollX - padding),
        y: Phaser.Math.Between(cam.scrollY - padding, cam.scrollY + cam.height + padding)
      }, // Left
      {
        x: Phaser.Math.Between(cam.scrollX + cam.width + padding, cam.scrollX + cam.width + padding * 2),
        y: Phaser.Math.Between(cam.scrollY - padding, cam.scrollY + cam.height + padding)
      }, // Right
      {
        x: Phaser.Math.Between(cam.scrollX - padding, cam.scrollX + cam.width + padding),
        y: Phaser.Math.Between(cam.scrollY - padding * 2, cam.scrollY - padding)
      }, // Top
      {
        x: Phaser.Math.Between(cam.scrollX - padding, cam.scrollX + cam.width + padding),
        y: Phaser.Math.Between(cam.scrollY + cam.height + padding, cam.scrollY + cam.height + padding * 2)
      } // Bottom
    ];

  }

  /**
   * Get available enemy types based on player level
   */
  private getAvailableEnemyTypes(): string[] {
    const playerLevel = this.player.getLevel();
    const availableTypes: string[] = [];

    // Check each enemy type against unlock level
    for (const [type, unlockLevel] of Object.entries(GAME_CONFIG.ENEMY.TYPE_UNLOCKS)) {
      if (playerLevel >= unlockLevel) {
        availableTypes.push(type);
      }
    }

    return availableTypes;
  }

  /**
   * Spawn a new enemy at a random edge position
   */
  private spawnEnemy(): void {
    // Don't spawn if we've reached the maximum number of enemies
    if (this.getEnemyCount() >= GAME_CONFIG.ENEMY.MAX_COUNT) {
      return;
    }

    // If wave-based spawning is enabled, check if we're in a lull period
    if (GAME_CONFIG.ENEMY.WAVES.ENABLED && !this.isWaveActive) {
      // During lull, spawn at reduced rate (only sometimes)
      if (Math.random() > GAME_CONFIG.ENEMY.WAVES.LULL_SPAWN_MULTIPLIER) {
        return; // Skip this spawn
      }
    }

    // Get available enemy types based on player level
    const availableTypes = this.getAvailableEnemyTypes();
    
    if (availableTypes.length === 0) {
      // Fallback to hover if no types are available
      availableTypes.push('hover');
    }

    // Pick a random type from available types
    const type = Phaser.Utils.Array.GetRandom(availableTypes);

    this.spawnZones = this.createSpawnZones()

    // Pick a random spawn position
    const { x, y } = Phaser.Utils.Array.GetRandom(this.spawnZones);

    // Get an inactive enemy from the pool
    const enemy = this.enemies.get(x, y, type) as Phaser.Physics.Arcade.Sprite;


    if (enemy)
      this.activateEnemy(enemy, x, y, type);
  }

  /**
   * Spawn multiple enemies in a burst (formation spawning)
   */
  private spawnBurst(count: number = GAME_CONFIG.ENEMY.WAVES.BURST_SPAWN_COUNT): void {
    if (this.getEnemyCount() >= GAME_CONFIG.ENEMY.MAX_COUNT) {
      return;
    }

    const availableTypes = this.getAvailableEnemyTypes();
    if (availableTypes.length === 0) {
      availableTypes.push('hover');
    }

    this.spawnZones = this.createSpawnZones();
    const spawnZone = Phaser.Utils.Array.GetRandom(this.spawnZones);
    const baseX = spawnZone.x;
    const baseY = spawnZone.y;

    // Spawn enemies in a cluster formation
    for (let i = 0; i < count; i++) {
      // Stagger spawns slightly for visual effect
      this.scene.time.delayedCall(
        i * GAME_CONFIG.ENEMY.WAVES.BURST_SPAWN_INTERVAL,
        () => {
          if (this.getEnemyCount() >= GAME_CONFIG.ENEMY.MAX_COUNT) {
            return;
          }

          // Add some spread to cluster formation
          const spread = 30;
          const x = baseX + Phaser.Math.Between(-spread, spread);
          const y = baseY + Phaser.Math.Between(-spread, spread);

          const type = Phaser.Utils.Array.GetRandom(availableTypes);
          const enemy = this.enemies.get(x, y, type) as Phaser.Physics.Arcade.Sprite;

          if (enemy) {
            this.activateEnemy(enemy, x, y, type);
          }
        }
      );
    }
  }

  /**
   * Start wave-based spawning cycle (Vampire Survivors style)
   */
  private startWaveCycle(): void {
    this.isWaveActive = true;
    
    // Calculate wave duration (scales down over time for more intense waves)
    const waveDuration = this.calculateWaveDuration();
    
    // Start continuous spawning during wave
    this.spawnTimer = this.startSpawnTimer();
    
    // Schedule burst spawns during wave
    this.scheduleBurstSpawns(waveDuration);
    
    // Schedule wave end
    if (this.waveTimer) {
      this.waveTimer.destroy();
    }
    this.waveTimer = this.scene.time.addEvent({
      delay: waveDuration,
      callback: () => {
        this.endWave();
      }
    });
  }

  /**
   * End current wave and start lull period
   */
  private endWave(): void {
    if (this.burstTimer) {
      this.burstTimer.destroy();
      this.burstTimer = null;
    }

    this.isWaveActive = false;
    
    // Calculate lull duration
    const lullDuration = this.calculateLullDuration();
    
    // Reduce spawn rate during lull
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
    // Use longer interval during lull
    const baseInterval = this.calculateSpawnInterval();
    const lullInterval = baseInterval / GAME_CONFIG.ENEMY.WAVES.LULL_SPAWN_MULTIPLIER;
    this.spawnTimer = this.scene.time.addEvent({
      delay: lullInterval,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
    
    // Schedule next wave
    if (this.waveTimer) {
      this.waveTimer.destroy();
    }
    this.waveTimer = this.scene.time.addEvent({
      delay: lullDuration,
      callback: () => {
        this.currentWaveNumber++;
        this.startWaveCycle();
      }
    });
  }

  /**
   * Calculate wave duration (decreases over time for more intense waves)
   */
  private calculateWaveDuration(): number {
    const baseDuration = GAME_CONFIG.ENEMY.WAVES.WAVE_DURATION;
    const minDuration = GAME_CONFIG.ENEMY.WAVES.MIN_WAVE_DURATION;
    
    // Scale down duration based on wave number (waves get more intense)
    const scalingFactor = Math.pow(GAME_CONFIG.ENEMY.WAVES.WAVE_INTENSITY_SCALING, this.currentWaveNumber - 1);
    const scaledDuration = baseDuration * scalingFactor;
    
    return Math.max(minDuration, scaledDuration);
  }

  /**
   * Calculate lull duration (decreases over time)
   */
  private calculateLullDuration(): number {
    const baseDuration = GAME_CONFIG.ENEMY.WAVES.LULL_DURATION;
    const minDuration = GAME_CONFIG.ENEMY.WAVES.MIN_LULL_DURATION;
    
    // Scale down duration based on wave number
    const scalingFactor = Math.pow(GAME_CONFIG.ENEMY.WAVES.WAVE_INTENSITY_SCALING, this.currentWaveNumber - 1);
    const scaledDuration = baseDuration * scalingFactor;
    
    return Math.max(minDuration, scaledDuration);
  }

  /**
   * Schedule burst spawns throughout the wave
   */
  private scheduleBurstSpawns(waveDuration: number): void {
    const burstInterval = 2000; // Burst every 2 seconds during wave
    const numBursts = Math.floor(waveDuration / burstInterval);
    
    for (let i = 1; i <= numBursts; i++) {
      this.scene.time.delayedCall(i * burstInterval, () => {
        if (this.isWaveActive && this.getEnemyCount() < GAME_CONFIG.ENEMY.MAX_COUNT) {
          // Calculate burst size (increases with wave number)
          const burstSize = GAME_CONFIG.ENEMY.WAVES.BURST_SPAWN_COUNT + Math.floor(this.currentWaveNumber / 2);
          this.spawnBurst(Math.min(burstSize, 10)); // Cap at 10 enemies per burst
        }
      });
    }
  }



  /**
   * Activate an enemy from the pool with specific position
   */
  private activateEnemy(enemy: Phaser.Physics.Arcade.Sprite, x: number, y: number, type: string): void {
    enemy.setPosition(x, y);
    enemy.setActive(true);
    enemy.setVisible(true);
    if (enemy.body)
      enemy.body.enable = true;// Activate the physics body
    //enemy.setVelocity(0, 0);

    // Reset any enemy state that needs resetting
    //enemy.setTint(GAME_CONFIG.ENEMY.TINT);

    // Health from config per-type (defaults to 1.0 multiplier)
    const mult = (GAME_CONFIG.ENEMY.TYPES as any)?.[type]?.HEALTH_MULTIPLIER ?? 1.0;
    const hp = GAME_CONFIG.ENEMY.MAX_HEALTH * mult;
    (enemy as any).health = hp;
    (enemy as any).maxHealth = hp;


    enemy.setTexture(type);
    
    // Ensure sprite origin is at center (0.5, 0.5) for consistent positioning
    if (enemy.originX !== 0.5 || enemy.originY !== 0.5) {
      enemy.setOrigin(0.5, 0.5);
    }
    
    // Set scale - soldier1 uses 1.5x size, others use base scale
    const enemyScale = type === 'soldier1' ? GAME_CONFIG.ENEMY.SCALE * 1.5 : GAME_CONFIG.ENEMY.SCALE;
    enemy.setScale(enemyScale);
    
    // Enable lighting on enemy sprite (only if lights are available)
    if (this.scene.lights) {
      enemy.setPipeline('Light2D');
    }

    // Play animation for all enemy types (hover now has animation)
    enemy.play(type, true);
    

    // Set enemy type for identification (set before creating health bar so it can use correct scale)
    (enemy as any).enemyType = type;

    // Resize collider box based on enemy frame size, scale, and hitbox scale
    if (enemy.body) {
      // Wait for texture to be fully loaded - use next frame to ensure frame data is available
      this.scene.time.delayedCall(0, () => {
        if (!enemy.active || !enemy.body) return;
        this.updateEnemyHitbox(enemy, type);
      });
    }

    // Create or update health bar (now enemyType is set, so it can use correct scale)
    this.createOrUpdateHealthBar(enemy);

    // Create glowing light for enemy
    this.createEnemyGlow(enemy);

    // Add to our tracking set for faster iteration
    this.activeEnemies.add(enemy);

  }

  /**
   * Create a glowing light for an enemy
   */
  private createEnemyGlow(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Skip if enemy already has a light
    if (this.enemyLights.has(enemy)) {
      return;
    }

    // Check if lights plugin is available - if not, schedule retry
    if (!this.scene.lights) {
      // Retry after a short delay in case lights aren't initialized yet
      this.scene.time.delayedCall(100, () => {
        if (enemy.active && !this.enemyLights.has(enemy)) {
          this.createEnemyGlow(enemy);
        }
      });
      return;
    }

    // Remove existing light if it exists (for reactivated enemies)
    const existingLight = this.enemyLights.get(enemy);
    if (existingLight) {
      this.scene.lights.removeLight(existingLight);
      this.enemyLights.delete(enemy);
    }

    // Create a point light on the enemy with a red glow
    try {
      const light = this.scene.lights.addLight(enemy.x, enemy.y, 120);
      if (!light) {
        // Retry after a short delay
        this.scene.time.delayedCall(50, () => {
          if (enemy.active && !this.enemyLights.has(enemy)) {
            this.createEnemyGlow(enemy);
          }
        });
        return;
      }
      
      light.setColor(0xff0000); // Red glow
      light.setIntensity(1.5); // Slightly brighter for better visibility
      
      this.enemyLights.set(enemy, light);
    } catch (error) {
      // Retry after a short delay if creation fails
      this.scene.time.delayedCall(50, () => {
        if (enemy.active && !this.enemyLights.has(enemy)) {
          this.createEnemyGlow(enemy);
        }
      });
    }
  }

  /**
   * Update enemy glow light position
   */
  private updateEnemyGlow(enemy: Phaser.Physics.Arcade.Sprite): void {
    const light = this.enemyLights.get(enemy);
    if (light && enemy.active) {
      // Update light position to follow enemy
      light.x = enemy.x;
      light.y = enemy.y;
      
      // Light is valid - just update position
    } else if (!light && enemy.active && this.scene.lights) {
      // Light is missing but enemy is active - this shouldn't happen
      console.warn('[EnemySystem] updateEnemyGlow: enemy active but light missing', {
        enemyType: (enemy as any).enemyType,
        enemyActive: enemy.active,
        enemyVisible: enemy.visible,
        position: { x: enemy.x, y: enemy.y },
        lightMapSize: this.enemyLights.size
      });
    }
  }



  /**
   * Deactivate an enemy and return it to the pool
   */
  public deactivateEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {

    enemy.setActive(false);
    enemy.setVisible(false);
    enemy.setVelocity(0, 0);
    if (enemy.body)
      enemy.body.enable = false; // Deactivate the physics body
    //enemy.body.enable = false;// Disables the physics body

    // Remove health bar
    const healthBar = this.healthBars.get(enemy);
    if (healthBar) {
      healthBar.setVisible(false);
    }

    // Remove enemy glow light
    const light = this.enemyLights.get(enemy);
    if (light && this.scene.lights) {
      this.scene.lights.removeLight(light);
      this.enemyLights.delete(enemy);
    }
    
    this.activeEnemies.delete(enemy);
  }

  /**
   * Configure an enemy sprite with appropriate properties
   * Only needs to be done once when enemy is first created
   */
  private configureEnemyProperties(enemy: Phaser.Physics.Arcade.Sprite): void {
    enemy.setScale(GAME_CONFIG.ENEMY.SCALE);
    enemy.setDepth(GAME_CONFIG.ENEMY.DEPTH);
    //enemy.setCollideWorldBounds(true);
    // Initialize health properties
    (enemy as any).health = GAME_CONFIG.ENEMY.MAX_HEALTH;
    (enemy as any).maxHealth = (enemy as any).health;

    if (enemy.body) {

      enemy.body.setSize(

        enemy.width * GAME_CONFIG.ENEMY.SCALE * GAME_CONFIG.ENEMY.HITBOX_SCALE,
        enemy.height * GAME_CONFIG.ENEMY.SCALE * GAME_CONFIG.ENEMY.HITBOX_SCALE
      );
    }

    enemy.setOffset(
      (enemy.displayWidth - enemy.width) / 4,
      (enemy.displayHeight - enemy.height) / 4
    );

  }

  /**
   * Update all active enemies - optimized for large quantities
   */
  update(_time: number, _delta: number): void {
    // Periodically update spawn rate based on elapsed time (check every minute)
    const currentTime = this.scene.time.now;
    const previousMinute = Math.floor((this.lastSpawnRateUpdate - this.gameStartTime) / 60000);
    const currentMinute = Math.floor((currentTime - this.gameStartTime) / 60000);
    
    // Update spawn rate if we've crossed a minute boundary
    if (currentMinute > previousMinute) {
      this.updateSpawnRate();
      this.lastSpawnRateUpdate = currentTime;
    }

    // Update camera rectangle for visibility checks
    const camera = this.scene.cameras.main;
    if (camera) {
      this.cameraRect.setTo(
        camera.scrollX - 100, // Buffer zone outside camera
        camera.scrollY - 100,
        camera.width + 200,
        camera.height + 200
      );
    }

    // Clear visible enemies array without allocating new one
    this.visibleEnemies.length = 0;

    // Process active enemies
    for (const enemy of this.activeEnemies) {
      
      //const type = (enemy as any).enemyType;
      
      // Only process on-screen enemies or those close to screen
      if (Phaser.Geom.Rectangle.Contains(this.cameraRect, enemy.x, enemy.y)) {
        this.visibleEnemies.push(enemy);
                
       
        this.moveEnemyTowardTarget(enemy);

        // Flip sprite based on direction
        // When origin is (0.5, 0.5), Phaser automatically centers the flip
        const wasFlipped = enemy.flipX;
        if (enemy.body!.velocity.x < 0) {
          enemy.setFlipX(true); // moving left
        } else if (enemy.body!.velocity.x > 0) {
          enemy.setFlipX(false); // moving right
        }
        
        // Update hitbox offset if flip state changed
        // For soldier1, the hitbox adjustment when facing right may cause visual misalignment
        // Since origin is 0.5,0.5, the sprite visual flip is centered automatically
        if (wasFlipped !== enemy.flipX && enemy.body) {
          const enemyType = (enemy as any).enemyType;
          this.updateEnemyHitbox(enemy, enemyType);
        }
        // adjust to your preferred sizeate health bar position
        this.updateHealthBarPosition(enemy);
        
        // Ensure enemy has a glow light (safety check - should already be created at spawn)
        if (!this.enemyLights.has(enemy) && this.scene.lights && enemy.active) {
          // Create light immediately if missing
          this.createEnemyGlow(enemy);
        }
        
        // Always update light position if it exists
        if (this.enemyLights.has(enemy)) {
          this.updateEnemyGlow(enemy);
        }
      } else {
        // Optionally apply simplified physics for off-screen enemies
        this.moveOffscreenEnemyBasic(enemy);

        // Hide health bar for off-screen enemies
        const healthBar = this.healthBars.get(enemy);
        if (healthBar) {
          healthBar.setVisible(false);
        }

        const isVisibleToCamera =
          enemy.x + enemy.width > camera.worldView.left &&
          enemy.x - enemy.width < camera.worldView.right &&
          enemy.y + enemy.height > camera.worldView.top &&
          enemy.y - enemy.height < camera.worldView.bottom;


        //if enemy is off screen for 2 seconds despawn enemy
        if (!isVisibleToCamera) {
          const elapsed = this.offscreenTimers.get(enemy) || 0;
          const newElapsed = elapsed + _delta;
          this.offscreenTimers.set(enemy, newElapsed);

          if (newElapsed > 50) {
            //console.log("ENEMY OFF SCREEN AND DEACTIVATING")
            this.deactivateEnemy(enemy);
            this.offscreenTimers.delete(enemy);
            this.activeEnemies.delete(enemy);
          }
        } else {
            //if back on screen reset the timer
            this.offscreenTimers.delete(enemy);
          }
  
      }
    }
  }

  /**
   * Basic movement for off-screen enemies (less accurate but more efficient)
   */
  private moveOffscreenEnemyBasic(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Simplified movement toward player (less frequent updates, less precision)
    if (Math.random() < 0.1) { // Only update direction occasionally
      this.vectorBuffer.x = this.target.x - enemy.x;
      this.vectorBuffer.y = this.target.y - enemy.y;

      const length = Math.sqrt(
        this.vectorBuffer.x * this.vectorBuffer.x +
        this.vectorBuffer.y * this.vectorBuffer.y
      );

      if (length > 0) {
        enemy.setVelocity(
          (this.vectorBuffer.x / length) * GAME_CONFIG.ENEMY.SPEED * 0.8,
          (this.vectorBuffer.y / length) * GAME_CONFIG.ENEMY.SPEED * 0.8
        );
      }
    }
  }

  /**
   * Move an enemy toward the target (player) - accurate version for visible enemies
   */
  private moveEnemyTowardTarget(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Calculate direction vector to target using buffer to avoid allocation
    this.vectorBuffer.x = this.target.x - enemy.x;
    this.vectorBuffer.y = this.target.y - enemy.y;

    // Normalize the direction vector manually to avoid allocation
    const length = Math.sqrt(
      this.vectorBuffer.x * this.vectorBuffer.x +
      this.vectorBuffer.y * this.vectorBuffer.y
    );

    if (length > 0) {
      enemy.setVelocity(
        (this.vectorBuffer.x / length) * GAME_CONFIG.ENEMY.SPEED,
        (this.vectorBuffer.y / length) * GAME_CONFIG.ENEMY.SPEED
      );
    }

  }

  /**
   * Set the experience system reference
   */
  setExperienceSystem(experienceSystem: ExperienceSystem): void {
    this.experienceSystem = experienceSystem;
  }

  public showDamageNumber(scene: Phaser.Scene, x: number, y: number, damage: number, isCritical = false): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '24px',
      color: isCritical ? '#ff3333' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial'
    };

    if (!damage) return;
    const text = scene.add.text(x, y, damage.toString(), style)
      .setDepth(100) // above other sprites
      .setOrigin(0.5);

    // Animate up and fade
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
   * Apply damage to an enemy and handle effects
   * Returns true if the enemy was defeated
   */
  damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number, knockbackForce?: number, isCritical = false): boolean {
    if (!enemy.active) return false;

    (enemy as any).health -= damage;
    
    // Only update health bar if enabled
    if (this.healthBarsEnabled) {
      this.updateHealthBar(enemy);
    }

    if ((enemy as any).health <= 0) {
      const enemyType = (enemy as any).enemyType;
      
      // Emit death effect event for explosion
      this.scene.events.emit('enemy-death', enemy.x, enemy.y, enemyType);
      
      // Drop experience and relic
      this.showDamageNumber(this.scene, enemy.x, enemy.y - 10, damage, isCritical);
      this.dropExperienceOrb(enemy);
      this.dropRelic(enemy);
      this.dropHealth(enemy);
      
      // Deactivate enemy immediately (all enemies now explode on death)
      this.deactivateEnemy(enemy);

      return true;
    }

    // enemy.setTint(GAME_CONFIG.ENEMY.DAMAGE_TINT);
    // this.scene.time.delayedCall(200, () => {
    //   if (enemy.active) {
    //     enemy.setTint(GAME_CONFIG.ENEMY.TINT);
    //   }
    // });

    if (knockbackForce && enemy.body) {
      const vx = enemy.body.velocity.x;
      const vy = enemy.body.velocity.y;
      const length = Math.sqrt(vx * vx + vy * vy);

      if (length > 0) {
        const knockbackX = -(vx / length) * knockbackForce;
        const knockbackY = -(vy / length) * knockbackForce;
        const duration = GAME_CONFIG.ENEMY.KNOCKBACK_DURATION;

        // Calculate target position
        const targetX = enemy.x + knockbackX * (duration / 1000); // scale by duration
        const targetY = enemy.y + knockbackY * (duration / 1000);

        this.scene.tweens.add({
          targets: enemy,
          x: targetX,
          y: targetY,
          ease: 'Quad.easeOut',
          duration: duration,
          onComplete: () => {
            // Optionally do something after knockback
          }
        });
      }
    }

    this.showDamageNumber(this.scene, enemy.x, enemy.y - 10, damage, isCritical);

    return false;
  }


  /**
   * Drop an experience orb at the enemy's position
   */
  public dropExperienceOrb(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Skip if no experience system is set
    if (!this.experienceSystem) return;

    // Spawn multiple gems with moderate spread and even angle distribution to prevent overlap
    const numOrbs = 5;
    const baseRadius = 20; // Start radius - reduced from 40
    const radiusSpread = 30; // Additional random spread - reduced from 60
    for (let i = 0; i < numOrbs; i++) {
      // Evenly distribute angles to prevent overlap
      const angle = (i / numOrbs) * Math.PI * 2 + (Math.random() * 0.3 - 0.15); // Slight random offset
      const radius = baseRadius + Math.random() * radiusSpread; // 20..50px - more reasonable spread
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;
      this.experienceSystem.spawnOrb(enemy.x + ox, enemy.y + oy);
    }
    // Add a small visual effect
    this.createDeathEffect(enemy.x, enemy.y);

  }

  /**
   * Drop a relic at the enemy's position (rare chance)
   */
  public dropRelic(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Configurable chance to drop a relic from regular enemies
    if (Math.random() < GAME_CONFIG.ENEMY.RELIC_DROP_CHANCE) {
      //console.log("Regular enemy dropping relic at:", enemy.x, enemy.y);
      this.scene.events.emit('relic-dropped', enemy.x, enemy.y);
    }
  }

  /**
   * Drop a health drop at the enemy's position (chance based on config)
   */
  public dropHealth(enemy: Phaser.Physics.Arcade.Sprite): void {
    // Configurable chance to drop health from regular enemies
    if (Math.random() < GAME_CONFIG.ENEMY.HEALTH_DROP_CHANCE) {
      this.scene.events.emit('health-dropped', enemy.x, enemy.y);
    }
  }

  /**
   * Create a visual effect when an enemy is defeated
   */
  private createDeathEffect(x: number, y: number): void {
    // Emit event for particle effects system to handle
    this.scene.events.emit('enemy-death', x, y, 'stormtrooper');
  }

  /**
   * Update enemy hitbox size and offset based on sprite dimensions and flip state
   */
  private updateEnemyHitbox(enemy: Phaser.Physics.Arcade.Sprite, type: string): void {
    if (!enemy.body || !enemy.active) return;
    
    // Use frame dimensions for more reliable calculation
    // When origin is (0.5, 0.5), body offset is relative to frame top-left, not displayed size
    const frameWidth = enemy.frame?.width || enemy.width;
    const frameHeight = enemy.frame?.height || enemy.height;
    
    // Get scale (soldier1 is 1.5x, others use base scale)
    const enemyScale = type === 'soldier1' ? GAME_CONFIG.ENEMY.SCALE * 1.5 : GAME_CONFIG.ENEMY.SCALE;
    
    // Get hitbox scale for this enemy type (defaults to base HITBOX_SCALE if not specified)
    const typeConfig = (GAME_CONFIG.ENEMY.TYPES as any)?.[type];
    const hitboxScale = typeConfig?.HITBOX_SCALE ?? GAME_CONFIG.ENEMY.HITBOX_SCALE;
    
    // Calculate hitbox size: frame size * scale * hitbox scale
    // This matches how the player calculates hitbox
    const hitboxWidth = frameWidth * enemyScale * hitboxScale;
    const hitboxHeight = frameHeight * enemyScale * hitboxScale;
    
    enemy.body.setSize(hitboxWidth, hitboxHeight);
    
    // Calculate offset to center the hitbox
    // When origin is (0.5, 0.5), Phaser centers the sprite at its position
    // Body offset is in world pixels, relative to the frame top-left corner
    // We need to calculate: (frame - hitbox) / 2, then multiply by scale to get world pixels
    // For soldier1 at 1.5x: frame 48 -> displayed 72, hitbox 48*0.5*1.5 -> offset calculation
    const unscaledHitboxWidth = frameWidth * hitboxScale;
    const unscaledHitboxHeight = frameHeight * hitboxScale;
    const unscaledOffsetX = (frameWidth - unscaledHitboxWidth) / 2;
    const unscaledOffsetY = (frameHeight - unscaledHitboxHeight) / 2;
    
    // Scale to world pixels (Phaser automatically accounts for origin when body is created)
    let offsetX = unscaledOffsetX * enemyScale;
    const offsetY = unscaledOffsetY * enemyScale;
    
    // Special adjustment for soldier1 when facing right (not flipped)
    // The sprite has visual offset that needs compensation when facing right
    if (type === 'soldier1' && !enemy.flipX) {
      // When facing right, shift hitbox back (left) to align with sprite
      // This compensates for the sprite's visual offset in its texture
      offsetX -= (frameWidth * 0.2) * enemyScale; // Adjust by 20% of frame width, scaled (subtract to shift left)
    }
    
    enemy.body.setOffset(offsetX, offsetY);
  }

  private createOrUpdateHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    let healthBar = this.healthBars.get(enemy);

    if (!healthBar) {
      // Create new health bar
      healthBar = this.scene.add.graphics();
      // Set position to enemy position initially
      healthBar.setPosition(enemy.x, enemy.y);
      // Make sure it's visible
      healthBar.setVisible(true);
      // Set depth so it renders above enemies
      healthBar.setDepth(GAME_CONFIG.ENEMY.DEPTH + 1);
      this.healthBars.set(enemy, healthBar);
    }

    // Update health bar appearance
    this.updateHealthBar(enemy);

    // Position the health bar
    this.updateHealthBarPosition(enemy);
  }

  /**
   * Update health bar appearance based on current health
   */
  public updateHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    const healthBar = this.healthBars.get(enemy);
    if (!healthBar || !enemy.active) return;

    // Clear previous graphics
    healthBar.clear();

    // Get current health percentage
    const health = (enemy as any).health || 0;
    const maxHealth = (enemy as any).maxHealth || GAME_CONFIG.ENEMY.MAX_HEALTH;
    const healthPercent = Math.max(0, Math.min(1, health / maxHealth));

    // Get enemy type for special handling
    const enemyType = (enemy as any).enemyType || '';
    
    // Use consistent health bar size for all enemies (fixed width, not scaled)
    // This ensures health bars are the same absolute size regardless of enemy scale
    const width = 30; // Fixed width for all enemies
    const height = 4;
    
    // Y offset - adjust for soldier1 to account for extra space at top of sprite sheet
    // The ShockBot sprite has extra room at the top (sprite is positioned lower in 48px frame)
    // Frame is 48px tall, but actual sprite content is smaller and starts lower in the frame
    // With origin at (0.5, 0.5), frame top is at enemy.y - 24
    // If sprite visual content starts ~12-14px down from frame top, visual top is at enemy.y - 24 + 12 = enemy.y - 12
    // Health bar should be just above visual top, so offset should be closer to -12 (scaled)
    let yOffset: number;
    if (enemyType === 'soldier1') {
      // For soldier1: sprite visual top is much closer to sprite center due to empty space at top
      // Position health bar just above actual sprite visual top (not frame top)
      const enemyScale = GAME_CONFIG.ENEMY.SCALE * 1.5;
      yOffset = -12 * enemyScale; // Much closer to sprite (less negative = closer to center)
    } else {
      // Standard offset for other enemies
      const baseYOffset = -20;
      const enemyScale = GAME_CONFIG.ENEMY.SCALE;
      yOffset = baseYOffset * enemyScale;
    }

    // Draw background (empty health) - centered above enemy
    healthBar.fillStyle(0x222222, 0.8);
    healthBar.fillRect(-width / 2, yOffset, width, height);

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

      healthBar.fillRect(-width / 2, yOffset, width * healthPercent, height);
    }

    // Draw border
    healthBar.lineStyle(1, 0xffffff, 1);
    healthBar.strokeRect(-width / 2, yOffset, width, height);
  }

  /**
   * Update health bar position to follow the enemy
   */
  private updateHealthBarPosition(enemy: Phaser.Physics.Arcade.Sprite): void {
    const healthBar = this.healthBars.get(enemy);
    if (!healthBar) return;

    healthBar.setPosition(enemy.x, enemy.y);
    healthBar.setVisible(true);
  }

  /**
   * Clean up and destroy enemies if necessary
   */
  cleanup(): void {
    // Stop the spawn timer
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
    if (this.waveTimer) {
      this.waveTimer.destroy();
    }
    if (this.burstTimer) {
      this.burstTimer.destroy();
    }

    // Deactivate all enemies
    for (const enemy of this.activeEnemies) {
      this.deactivateEnemy(enemy);
    }

    // Clean up health bars
    for (const healthBar of this.healthBars.values()) {
      healthBar.destroy();
    }
    this.healthBars.clear();

    // Clean up enemy glow lights
    if (this.scene.lights) {
      for (const light of this.enemyLights.values()) {
        if (light) {
          this.scene.lights.removeLight(light);
        }
      }
    }
    this.enemyLights.clear();
  }

  /**
   * Get the enemy group for collision detection
   */
  getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  /**
   * Get array of visible enemies for optimized collision
   */
  getVisibleEnemies(): Array<Phaser.Physics.Arcade.Sprite> {
    return this.visibleEnemies;
  }

  /**
   * Get the current number of active enemies
   */
  getEnemyCount(): number {
    return this.activeEnemies.size;
  }

  /**
   * Set a new target for enemies to follow
   */
  setTarget(target: Phaser.Physics.Arcade.Sprite): void {
    this.target = target;
  }

  /**
   * Apply stress test configuration
   */
  setStressTestConfig(config: {
    spawnInterval: number;
    maxCount: number;
    healthBarsEnabled: boolean;
  }): void {
    // Update spawn timer
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
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

    // Store health bars setting for use in damageEnemy
    this.healthBarsEnabled = config.healthBarsEnabled;
  }

  /**
   * Get total enemy count including inactive
   */
  getTotalEnemyCount(): number {
    return this.enemies.children.size;
  }
} 