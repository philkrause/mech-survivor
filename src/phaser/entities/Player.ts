import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { normalizeVector } from '../utils/MathUtils';
import { ProjectileSystem } from '../systems/ProjectileSystem'; // adjust path
//import { CollisionSystem } from '../systems/CollisionSystem';
import StartScene from "../scenes/StartScene"


/**
 * Interface for keyboard input keys
 */
export interface GameKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

/**
 * Class to manage player-related functionality
 */
export class Player {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: GameKeys;
  private dead: boolean = false;
  private scene: Phaser.Scene;
  // Blaster properties
  private attackTimer: Phaser.Time.TimerEvent | null = null;
  private projectileSystem: ProjectileSystem | null = null;
  private isFlippedX: boolean = false; // Track if player is flipped horizontally
  public unlockedProjectiles: Set<string> = new Set(); // Track unlocked projectiles
  private currentAnimationKey: string = 'mech_idle'; // Track current animation

  // Upgrade properties

  public saberSpeedMultiplier: number = 1.0;
  public saberDamageMultiplier: number = 1.0;
  public saberCritChance: number = 0; // Crit chance from relics

  // Additional upgrade properties
  public speedMultiplier: number = 1.0;
  public experienceMultiplier: number = 1.0;
  public projectileSpeedMultiplier: number = 1.0;

  private hasForceUpgrade: boolean = false;
  private hasR2D2Upgrade: boolean = false;
  private hasBB8Upgrade: boolean = false;
  public hasBlasterUpgrade: boolean = true; // Start with blaster unlocked
  private hasSaberUpgrade: boolean = false; // Saber starts locked
  private hasLaserCannonUpgrade: boolean = false; // Laser Cannon starts locked
  
  // Stress test mode
  private isStressTestMode: boolean = false;
  
  // Relic system
  private relics: Set<string> = new Set(); // Track collected relics
  private damageReduction: number = 0; // Track damage reduction from relics


  public R2D2SpeedMultiplier: number = 1.0;
  private R2D2StrengthMultiplier: number = 1.0;
  public R2D2DamageMultiplier: number = 1.0;

  public bb8SpeedMultiplier: number = 1.0;
  public bb8DamageMultiplier: number = 1.0;

  public forceSpeedMultiplier: number = 1.0;
  private forceStrengthMultiplier: number = 1.0;
  public forceDamageMultiplier: number = 1.0;

  private baseBlasterDamage: number = GAME_CONFIG.BLASTER.PLAYER.DAMAGE;
  private damageBlasterMultiplier: number = 1.0;
  private baseAttackInterval: number = GAME_CONFIG.PLAYER.ATTACK_INTERVAL;
  private baseBlasterAttackInterval: number = GAME_CONFIG.BLASTER.PLAYER.BASE_ATTACK_INTERVAL;

  private blasterSpeedMultiplier: number = .25;
  private projectileCount: number = 1;
  private projectileSizeMultiplier: number = 1.0;
  private lastDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0); // Default facing right

  // Health properties
  private health: number;
  private maxHealth: number;
  private isInvulnerable: boolean = false;
  private invulnerableTimer: Phaser.Time.TimerEvent | null = null;
  private damageTimer: Phaser.Time.TimerEvent | null = null;
  private isCurrentlyOverlapping: boolean = false; // Track if player is currently overlapping with enemies
  private enemySystem: any = null; // Reference to enemy system for finding nearest enemy
  private atEnemySystem: any = null; // Reference to AT enemy system
  private tfighterSystem: any = null; // Reference to T-Fighter system

  // Movement properties
  private baseSpeed: number = GAME_CONFIG.PLAYER.SPEED;

  // Dash properties
  private dashCooldown: number = 0; // Current cooldown remaining (ms)
  private dashCooldownMax: number = GAME_CONFIG.PLAYER.DASH.COOLDOWN; // Max cooldown (ms)
  private isDashing: boolean = false;
  private dashStartTime: number = 0;
  private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private dashSpeedMultiplier: number = 1.0; // Can be upgraded via relics
  private dashCooldownMultiplier: number = 1.0; // Can be upgraded via relics
  private lastUpdateTime: number = 0; // Track last update time for cooldown

  // Experience properties
  private experience: number = 0;
  private level: number = 1;
  private experienceToNextLevel: number = 50; // Base experience needed for level 2
  private isLevelingUp: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, projectileSystem: ProjectileSystem) {
    this.scene = scene;
    this.sprite = this.createSprite(x, y);
    this.setupInput();
    this.lastUpdateTime = scene.time.now; // Initialize update time tracking
    
    // Start with idle animation (mech Attack animation)
    // Sprite is already created with 'mech_attack' texture
    // Note: Animation will be played after setupAnimations is called in MainScene
    // We'll start it when update is first called or add a method to call after animations are set up
    
    // Initialize health
    this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH;
    this.health = this.maxHealth;
    this.projectileSystem = projectileSystem

    // Listen for experience collection events
    this.scene.events.on('experience-collected', this.onExperienceCollected, this);

    // Initialize blaster since player starts with it
    this.initProjectilePool();
  }


  // ** ATTACKS ** //
  public initProjectilePool() {
    //console.log("Projectile pool initialized for player");
    if (this.projectileSystem) {
      // Set player reference for speed multiplier
      this.projectileSystem.setPlayer(this);
      
      this.projectileSystem.createPool({
        key: GAME_CONFIG.BLASTER.PLAYER.KEY,
        speed: GAME_CONFIG.BLASTER.PLAYER.SPEED,
        lifespan: GAME_CONFIG.BLASTER.PLAYER.LIFESPAN,
        scale: GAME_CONFIG.BLASTER.PLAYER.SCALE,
        depth: GAME_CONFIG.BLASTER.PLAYER.DEPTH,
        damage: GAME_CONFIG.BLASTER.PLAYER.DAMAGE,
        rotateToDirection: GAME_CONFIG.BLASTER.PLAYER.ROTATEWITHDIRECTION,
        maxSize: GAME_CONFIG.BLASTER.PLAYER.MAX_COUNT,
        maxCount: GAME_CONFIG.BLASTER.PLAYER.MAX_COUNT,
        tint: GAME_CONFIG.BLASTER.PLAYER.TINT
      });

      // Create enemy blaster pool
      this.projectileSystem.createPool({
        key: GAME_CONFIG.BLASTER.ENEMY.KEY,
        speed: GAME_CONFIG.BLASTER.ENEMY.SPEED,
        lifespan: GAME_CONFIG.BLASTER.ENEMY.LIFESPAN,
        scale: GAME_CONFIG.BLASTER.ENEMY.SCALE,
        depth: GAME_CONFIG.BLASTER.ENEMY.DEPTH,
        damage: GAME_CONFIG.BLASTER.ENEMY.DAMAGE,
        rotateToDirection: GAME_CONFIG.BLASTER.ENEMY.ROTATEWITHDIRECTION,
        maxSize: GAME_CONFIG.BLASTER.ENEMY.MAX_COUNT,
        maxCount: GAME_CONFIG.BLASTER.ENEMY.MAX_COUNT,
        tint: GAME_CONFIG.BLASTER.ENEMY.TINT
      });
    }


    // Start attack timer
    this.attackTimer = this.scene.time.addEvent({
      delay: this.getBlasterAttackInterval(),
      callback: () => this.fireProjectile(GAME_CONFIG.BLASTER.PLAYER.KEY),
      callbackScope: this,
      loop: true
    });

    this.scene.events.emit('projectile-pool-initialized');
  }


  /**
   * Set enemy system references for auto-targeting
   */
  public setEnemySystems(enemySystem: any, atEnemySystem: any, tfighterSystem?: any): void {
    this.enemySystem = enemySystem;
    this.atEnemySystem = atEnemySystem;
    this.tfighterSystem = tfighterSystem;
  }

  /**
   * Find the nearest enemy to the player
   */
  private findNearestEnemy(): Phaser.Physics.Arcade.Sprite | null {
    const playerPos = this.getPosition();
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let nearestDist = Infinity;

    // Check all enemy types
    const allEnemies: Phaser.Physics.Arcade.Sprite[] = [];
    
    if (this.enemySystem) {
      allEnemies.push(...this.enemySystem.getVisibleEnemies());
    }
    if (this.atEnemySystem) {
      allEnemies.push(...this.atEnemySystem.getVisibleEnemies());
    }
    if (this.tfighterSystem) {
      allEnemies.push(...this.tfighterSystem.getVisibleEnemies());
    }

    // Find the nearest active enemy
    for (const enemy of allEnemies) {
      if (!enemy.active) continue;
      
      const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }

  // FIRE PROJECTILE LOGIC
  private fireProjectile(type: string): void {
    if (!this.projectileSystem || this.isLevelingUp) return;

    if (!this.hasBlasterUpgrade) {
      console.warn(`Projectile type "${type}" is not unlocked!`);
      return;
    }

    const playerPos = this.getPosition();
    let dirX = 0;
    let dirY = 0;

    // Find nearest enemy for auto-targeting
    const nearestEnemy = this.findNearestEnemy();
    
    if (nearestEnemy) {
      // Calculate direction to nearest enemy
      const dx = nearestEnemy.x - playerPos.x;
      const dy = nearestEnemy.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        dirX = dx / distance;
        dirY = dy / distance;
      }
    } else {
      // If no enemy found, use movement direction as fallback
      const lastDirection = this.lastDirection.clone();
      if (lastDirection.x === 0 && lastDirection.y === 0) {
        lastDirection.set(1, 0); // Default to facing right
      }
      const normalizedDirection = normalizeVector(lastDirection.x, lastDirection.y);
      dirX = normalizedDirection.x;
      dirY = normalizedDirection.y;
    }

    // Calculate projectile spawn position (in front of player)
    const projectileOffset = 20; // Distance in front of player
    let projectileSpawnX = playerPos.x + (dirX * projectileOffset);
    let projectileSpawnY = playerPos.y + (dirY * projectileOffset);
    
    // Adjust spawn position based on aiming direction
    if (Math.abs(dirY) > Math.abs(dirX)) {
      // Primarily vertical movement - adjust horizontal offset
      if (dirY < 0) { // Aiming up
        projectileSpawnY -= 10; // Higher up (raised from -5)
      } else { // Aiming down
        projectileSpawnY += 10; // Lower down (raised from +15)
      }
    } else {
      // Primarily horizontal movement - adjust vertical offset
      projectileSpawnY += 5; // Raised from +10, now slightly above center for horizontal shots
    }

    // Calculate angle for spread shots based on movement direction
    const baseAngle = Math.atan2(dirY, dirX);
    // Fire multiple projectiles if projectileCount > 1
    for (let i = 0; i < this.projectileCount; i++) {
      let angle = baseAngle;

      // If multiple projectiles, create a spread pattern
      if (this.projectileCount > 1) {
        // Calculate spread angle based on projectile count
        const spreadAngle = Math.PI / 6; // 30 degrees total spread
        const angleOffset = spreadAngle * (i / (this.projectileCount - 1) - 0.5);
        angle = baseAngle + angleOffset;
      }

      // Calculate direction from angle
      const spreadDirX = Math.cos(angle);
      const spreadDirY = Math.sin(angle);
      // Fire projectile with current damage and size
      const projectile = this.projectileSystem.fire(
        GAME_CONFIG.BLASTER.PLAYER.KEY,
        projectileSpawnX,
        projectileSpawnY,
        spreadDirX,
        spreadDirY,
        'blaster' // Projectile type for damage multiplier
      );

      // Projectile damage is now handled by ProjectileSystem with multipliers
      if (projectile) {
        // Apply size multiplier (normal size, no 2x increase)
        const baseScale = GAME_CONFIG.BLASTER.PLAYER.SCALE * this.projectileSizeMultiplier;
        projectile.setScale(baseScale, baseScale);
        
        // Add visual enhancements (line-based trail)
        this.addProjectileTrail(projectile);
      }
    }
  }
  
  /**
   * Add visual enhancements to projectile - line-based trail like BB8
   */
  private addProjectileTrail(projectile: Phaser.Physics.Arcade.Sprite): void {
    // Keep projectile at normal size (removed 2x scaling)
    projectile.setAlpha(1.0);
    projectile.setBlendMode(Phaser.BlendModes.NORMAL);
    
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
    
    // Store reference for cleanup
    (projectile as any).hasVisualEnhancement = true;
    (projectile as any).trailGraphics = trailGraphics;
    
    // Auto-cleanup trail after projectile lifespan
    this.scene.time.delayedCall(GAME_CONFIG.BLASTER.PLAYER.LIFESPAN, () => {
      if (trailGraphics && trailGraphics.active) {
        trailGraphics.destroy();
      }
    });
  }


  // setActiveProjectileType(type: string) {
  //   if (this.unlockedProjectiles.has(type)) {
  //     this.activeProjectileType = type;
  //   }
  // }


  public static setupAnimations(scene: Phaser.Scene) {
    // Mech idle animation - uses mech_attack spritesheet (6 frames)
    scene.anims.create({
      key: 'mech_attack',
      frames: scene.anims.generateFrameNumbers('mech_attack', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    // Mech walk animation - uses mech_walk_attack spritesheet (6 frames)
    scene.anims.create({
      key: 'mech_walk',
      frames: scene.anims.generateFrameNumbers('mech_walk_attack', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    // Mech dash animation - uses Fly_up spritesheet (4 frames, 384x96 = 96x96 per frame)
    if (!scene.anims.exists('mech_dash')) {
      scene.anims.create({
        key: 'mech_dash',
        frames: scene.anims.generateFrameNumbers('mech_dash', { start: 0, end: 3 }),
        frameRate: 20, // Faster frame rate for dash
        repeat: 0 // Play once
      });
    }
  }
  /**
   * Create and configure the player sprite
   */
  private createSprite(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    // Create sprite using the mech_attack spritesheet for idle animation
    const sprite = this.scene.physics.add.sprite(x, y, 'mech_attack', 0);

    sprite.setScale(GAME_CONFIG.PLAYER.SCALE);
    sprite.setDepth(GAME_CONFIG.PLAYER.DEPTH);

    sprite.setDamping(false);
    sprite.setDrag(0);

    // Create a smaller hitbox that matches the mech sprite better
    // The mech sprite frame is 96x96 pixels (each frame in the spritesheet)
    // Use the actual frame dimensions, not the spritesheet dimensions
    if (sprite.body) {
      // Frame dimensions from spritesheet (96x96 per frame)
      const frameWidth = 96;
      const frameHeight = 96;
      const scale = GAME_CONFIG.PLAYER.SCALE; // 2
      
      // Calculate hitbox size - 45% width (reduced from 55%), 70% height of a single frame
      const hitboxWidth = frameWidth * 0.45 * scale; // 96 * 0.45 * 2 = 86.4 (reduced from 105.6)
      const hitboxHeight = frameHeight * 0.70 * scale; // 96 * 0.70 * 2 = 134.4
      
      sprite.body.setSize(hitboxWidth, hitboxHeight);
      
      // Calculate offset to center the hitbox on a single frame
      // Offset is in world pixels, relative to sprite frame
      // Adjust to account for visual positioning
      const offsetX = ((frameWidth - frameWidth * 0.45) / 2) * scale - 14; // Move left (updated for new width)
      const offsetY = ((frameHeight - frameHeight * 0.70) / 2) * scale + 16; // Move down
      
      sprite.body.setOffset(offsetX, offsetY);
    }
    
    // Start with idle animation (will be set after animations are created)
    // The animation will be started in the constructor after setupAnimations is called

    return sprite;
  }


  /**
   * Configure keyboard input and cursor tracking
   */
  private setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();

    this.wasdKeys = {
      W: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    // Add spacebar for dash (will be used in update)
    this.scene.input.keyboard!.on('keydown-SPACE', () => {
      if (!this.dead && !this.isLevelingUp) {
        this.attemptDash();
      }
    });
  }


  /**
   * Gets the input direction based on keyboard state
   */
  private getInputDirection(): { x: number, y: number } {
    let dirX = 0;
    let dirY = 0;

    const left = this.wasdKeys.A.isDown || this.cursors.left!.isDown;
    const right = this.wasdKeys.D.isDown || this.cursors.right!.isDown;
    const up = this.wasdKeys.W.isDown || this.cursors.up!.isDown;
    const down = this.wasdKeys.S.isDown || this.cursors.down!.isDown;



    // Determine primary direction for sprite selection
    // Default to current horizontal direction if no horizontal input
    let primaryDirection = this.isFlippedX ? 'left' : 'right';

    // Check if A or left arrow key is pressed (move left)
    if (left && !this.dead) {
      dirX = -1;
      this.sprite.setFlipX(true);  // Flip sprite to face left
      // Adjust offset when flipped - need to move hitbox more to the right
      if (this.sprite.body) {
        const frameWidth = 96;
        const scale = GAME_CONFIG.PLAYER.SCALE;
        const baseOffsetX = ((frameWidth - frameWidth * 0.45) / 2) * scale - 14; // Updated for new width (0.45)
        const flippedOffsetX = baseOffsetX + (14 * 2); // Add extra offset to the right
        this.sprite.body.setOffset(flippedOffsetX, ((96 - 96 * 0.70) / 2) * scale + 16);
      }
      this.isFlippedX = true; // Set flipped state
      primaryDirection = 'left';
    }

    // Check if D or right arrow key is pressed (move right)
    if (right && !this.dead) {
      dirX = 1;
      this.sprite.setFlipX(false);  // Set sprite to face right (default)
      // Use default offset when facing right
      if (this.sprite.body) {
        const frameWidth = 96;
        const scale = GAME_CONFIG.PLAYER.SCALE;
        this.sprite.body.setOffset(
          ((frameWidth - frameWidth * 0.45) / 2) * scale - 14, // Updated for new width (0.45)
          ((96 - 96 * 0.70) / 2) * scale + 16
        );
      }
      this.isFlippedX = false; // Reset flipped state
      primaryDirection = 'right';
    }

    // Handle vertical movement (up and down)
    // Only change primary direction if there's no horizontal input
    if (up && !this.dead) {
      dirY = -1;
      // If moving purely vertical (no horizontal input), preserve current flip state
      if (dirX === 0) {
        primaryDirection = 'up';
      } else if (Math.abs(dirY) > Math.abs(dirX)) {
        primaryDirection = 'up';
      }
    }

    if (down && !this.dead) {
      dirY = 1;
      // If moving purely vertical (no horizontal input), preserve current flip state
      if (dirX === 0) {
        primaryDirection = 'down';
      } else if (Math.abs(dirY) > Math.abs(dirX)) {
        primaryDirection = 'down';
      }
    }

    // Only update sprite animation if there's actual movement input
    // If no input, let the update loop handle switching to default attack animation
    if (dirX !== 0 || dirY !== 0) {
      this.updatePlayerSprite(primaryDirection);
    }

    return { x: dirX, y: dirY };
  }

  getFlippedX(): boolean {
    return this.isFlippedX;
  }
  

  /**
   * Update player sprite animation based on direction
   */
  private updatePlayerSprite(direction: string): void {
    if (!this.sprite || this.dead || !this.sprite.anims) return;

    // When moving: switch to mech_walk animation
    // Stop attack animation if playing
    if (this.sprite.anims.isPlaying) {
      const currentAnim = this.sprite.anims.currentAnim;
      if (currentAnim && currentAnim.key === 'mech_attack') {
        this.sprite.anims.stop();
      }
    }

    // Set texture to mech_walk_attack for walk animation
    if (this.sprite.texture.key !== 'mech_walk_attack') {
      this.sprite.setTexture('mech_walk_attack', 0);
    }

    // Only change flip state for horizontal movement
    // Preserve current flip state for vertical-only movement (up/down)
    if (direction === 'left') {
      this.sprite.setFlipX(true);
      this.isFlippedX = true;
    } else if (direction === 'right') {
      this.sprite.setFlipX(false);
      this.isFlippedX = false;
    }
    // For 'up' and 'down', preserve current flip state (don't change it)
    
    // Play walk animation when moving
    this.sprite.anims.play("mech_walk", true);
  }

  /**
   * Update player sprite based on last direction when not moving
   */
  private updatePlayerSpriteFromLastDirection(): void {
    if (!this.sprite || this.dead || !this.sprite.anims) return;

    // Determine primary direction from lastDirection
    let primaryDirection = 'right'; // default
    
    if (Math.abs(this.lastDirection.y) > Math.abs(this.lastDirection.x)) {
      // Primarily vertical movement
      if (this.lastDirection.y < 0) {
        primaryDirection = 'up';
      } else {
        primaryDirection = 'down';
      }
    } else {
      // Primarily horizontal movement
      if (this.lastDirection.x < 0) {
        primaryDirection = 'left';
      } else {
        primaryDirection = 'right';
      }
    }

    // When not moving: switch back to mech_attack animation (default/idle)
    // Stop walk animation if playing
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      const currentAnim = this.sprite.anims.currentAnim;
      if (currentAnim && currentAnim.key === 'mech_walk') {
        this.sprite.anims.stop();
      }
    }
    
    // Set texture to mech_attack
    if (this.sprite.texture.key !== 'mech_attack') {
      this.sprite.setTexture('mech_attack', 0);
    }
    
    // Set flip based on last horizontal direction
    // Only change flip state for horizontal directions, preserve for vertical
    if (primaryDirection === 'left') {
      this.sprite.setFlipX(true);
      this.isFlippedX = true;
    } else if (primaryDirection === 'right') {
      this.sprite.setFlipX(false);
      this.isFlippedX = false;
    }
    // For 'up' and 'down', preserve current flip state (don't change it)
    
    // Play mech_attack animation (default/idle)
    // Check scene's animation manager instead of sprite's
    if (this.scene.anims.exists('mech_attack')) {
      this.sprite.anims.play('mech_attack', true);
    }
  }

  /**
   * Get the player sprite instance
   */
  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  /**
   * Start the idle animation
   * Should be called after animations are set up
   */
  startIdleAnimation(): void {
    // Play mech_attack animation when idle
    // Check scene's animation manager instead of sprite's
    if (this.sprite && this.sprite.anims && this.scene.anims.exists('mech_attack')) {
      this.sprite.anims.play('mech_attack', true);
    }
  }

  /**
   * Get the player's current position
   */
  getPosition(): { x: number, y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getVelocity(): Phaser.Math.Vector2 {
    if (!this.sprite.body) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return this.sprite.body.velocity;
  }




  /**
   * Apply damage to the player
   */
  takeDamage(amount: number): boolean {
    // Skip if player is invulnerable or in stress test mode
    if (this.isInvulnerable || this.isStressTestMode) {
      return false;
    }

    // Apply damage reduction from relics
    const actualDamage = amount * (1 - this.damageReduction);

    // Reduce health
    this.health = Math.max(0, this.health - actualDamage);

    // Ensure sprite is visible before applying damage effects
    this.sprite.setVisible(true);

    // Apply damage visual effect - DISABLED FOR DEBUGGING
    // this.sprite.setTint(GAME_CONFIG.PLAYER.DAMAGE_TINT);

    // Make player invulnerable temporarily
    this.setInvulnerable(GAME_CONFIG.PLAYER.INVULNERABLE_DURATION);

    // Check if player is defeated
    if (this.health <= 0 && this.dead === false) {
      
      // Handle player defeat
      this.onDefeat();
      this.dead = true; // Set dead flag to prevent multiple defeats
      return true;
    }

    return false;
  }

  /**
   * Make the player invulnerable for a duration
   */
  private setInvulnerable(duration: number): void {
    this.isInvulnerable = true;

    // Clear any existing invulnerability timer
    if (this.invulnerableTimer) {
      this.invulnerableTimer.destroy();
    }

    // Flash effect during invulnerability
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200),
      onComplete: () => {
        this.sprite.alpha = 1;
        this.sprite.setVisible(true); // Ensure sprite is visible
      }
    });

    // Set timer to end invulnerability
    this.invulnerableTimer = this.scene.time.delayedCall(duration, () => {
      this.isInvulnerable = false;
      this.sprite.clearTint();
      this.sprite.alpha = 1;
      this.sprite.setVisible(true); // Ensure sprite is visible
    });
  }

  /**
   * Handle player defeat
   */
  private onDefeat(): void {
    // Stop player movement
    if (this.sprite && this.sprite.body) {
      this.sprite.setVelocity(0, 0);
    }
    const cam = this.scene.cameras.main
    //death animation
    this.deathVisual();
   
    // Hide the player sprite (original behavior)
    this.sprite.setActive(false).setVisible(false);

    // Show Game Over text
    this.scene.add.text(
      cam.scrollX + cam.centerX,
      cam.scrollY + cam.centerY - 25,
      `GAME OVER`, {
      fontFamily: 'StarJedi',
      fontSize: '64px',
      color: '#ff0000',
      stroke: '#000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setDepth(1000);

    // Results button
    const resultsButton = this.scene.add.text(
      cam.scrollX + cam.centerX,
      cam.scrollY + cam.centerY + 45,
      'RESULTS',
      {
        fontFamily: 'StarJedi',
        fontSize: '64px',
        color: '#ffff00',
        stroke: '#000',
        strokeThickness: 8,
        align: 'center'
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1000);
    

    resultsButton.on('pointerdown', () => {
      // Get game stats and transition to results scene
      (this.scene as any).showResults();
    });

    // Hover effect
    resultsButton.on('pointerover', () => resultsButton.setStyle({ backgroundColor: '#444' }));
    resultsButton.on('pointerout', () => resultsButton.setStyle({ backgroundColor: '' }));
        
  
}

  /**
   * Start continuous damage timer (for enemy overlap)
   */
  startDamageTimer(): void {
    // Don't start a new timer if one is already running
    if(this.damageTimer) return;

    // Apply initial damage immediately
    this.takeDamage(GAME_CONFIG.PLAYER.DAMAGE_AMOUNT);

    // Set up timer for continuous damage
    this.damageTimer = this.scene.time.addEvent({
      delay: GAME_CONFIG.PLAYER.DAMAGE_INTERVAL,
      callback: () => {
        // Safety check: always verify timer still exists
        if (!this.damageTimer) return;
        
        // CRITICAL: Check actual overlap state from the scene
        // Don't trust cached flag - it can be stale due to callback timing issues
        // The overlap callback only fires when there IS overlap, not when it ends
        // So we need to verify the state directly
        const actuallyOverlapping = this.isCurrentlyOverlapping;
        
        // Additional safety: Always stop timer if invulnerable
        if (this.isInvulnerable) {
          this.stopDamageTimer();
          return;
        }
        
        // Only deal damage if actually overlapping
        if (actuallyOverlapping) {
          // Apply damage
          this.takeDamage(GAME_CONFIG.PLAYER.DAMAGE_AMOUNT);
        } else {
          // If no longer overlapping, stop the timer immediately
          // This is critical - the overlap callback stops firing when overlap ends,
          // so we need to detect this state change
          this.stopDamageTimer();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

/**
 * Stop continuous damage timer
 */
stopDamageTimer(): void {
  if(this.damageTimer) {
    this.damageTimer.remove(false); // Remove the timer and don't execute callback
    this.damageTimer.destroy();
    this.damageTimer = null;
  }
}

/**
 * Check if player is currently overlapping with enemies
 */
setOverlapping(isOverlapping: boolean): void {
  // Skip damage if in stress test mode
  if (this.isStressTestMode) {
    this.isCurrentlyOverlapping = false; // Still update state
    return;
  }
  
  // Update overlap state - this is the source of truth
  this.isCurrentlyOverlapping = isOverlapping;
  
  if(isOverlapping) {
    // Only start timer if not already running
    if (!this.damageTimer) {
      this.startDamageTimer();
    }
  } else {
    // CRITICAL: Always stop timer when not overlapping
    // This ensures damage stops immediately when player moves away
    if (this.damageTimer) {
      this.stopDamageTimer();
    }
  }
}

/**
 * Get current health
 */
getHealth(): number {
  return this.health;
}

/**
 * Get maximum health
 */
getMaxHealth(): number {
  return this.maxHealth;
}

isDead(): boolean {
  return this.dead;
}

  /**
   * Handle experience collection
   */
  private onExperienceCollected(value: number, _totalExperience: number): void {
  // Apply experience multiplier to the gained experience
  // Add to current level's experience (not total accumulated)
  // totalExperience is the full accumulated amount, but we only track current level's progress
  const multipliedValue = value * this.experienceMultiplier;
  
  // Add the multiplied value to current level's experience
  // This ensures the bar shows correct progress after level up
  this.experience += multipliedValue;

  // Check for level up
  this.checkLevelUp();

  // Visual feedback
  this.showExperienceCollectedEffect();
}

  /**
   * Check if player has enough experience to level up
   */
  private checkLevelUp(): void {
  // Use a while loop to handle multiple level-ups at once
    while(this.experience >= this.experienceToNextLevel && !this.isLevelingUp) {
      // Level up
      this.level++;

      // Reset experience to only keep overflow (experience beyond what was needed for this level)
      // This ensures the bar starts empty after level up
      const oldThreshold = this.experienceToNextLevel;
      this.experience = this.experience - oldThreshold;

      // Calculate new experience threshold (increases with each level)
      this.experienceToNextLevel = Math.floor(oldThreshold * 1.4);

      // Visual feedback
      this.showLevelUpEffect();

      // Set leveling up flag to prevent multiple level-up screens
      this.isLevelingUp = true;

      // Emit level up event for other systems
      this.scene.events.emit('player-level-up', this.level);

      // Emit event to show upgrade UI
      this.scene.events.emit('show-upgrade-ui');

      if (this.level === 5) {
        this.scene.events.emit('player-level-5', this);
      }
    }
}

  /**
   * Show visual effect when collecting experience
   */
  private showExperienceCollectedEffect(): void {
  // Flash player with cyan tint briefly
  //this.sprite.setTint(GAME_CONFIG.EXPERIENCE_ORB.TINT);

  this.scene.time.delayedCall(100, () => {
    if (this.sprite.active) {
      this.sprite.clearTint();
    }
  });
}

  /**
   * Show visual effect when leveling up
   */
  private showLevelUpEffect(): void {
  // Create a circular flash around the player
  const flash = this.scene.add.circle(
    this.sprite.x,
    this.sprite.y,
    50,
    GAME_CONFIG.EXPERIENCE_ORB.TINT,
    0.7
  );
  flash.setDepth(this.sprite.depth - 1);

  // Expand and fade out
  this.scene.tweens.add({
    targets: flash,
    radius: 150,
    alpha: 0,
    duration: 500,
    onComplete: () => {
      flash.destroy();
    }
  });

  // Show level up text
  const levelText = this.scene.add.text(
    this.sprite.x,
    this.sprite.y - 50,
    `Level Up! ${this.level}`,
    {
      fontSize: '24px',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4
    }
  ).setOrigin(0.5);

  // Float up and fade out
  this.scene.tweens.add({
    targets: levelText,
    y: this.sprite.y - 100,
    alpha: 0,
    duration: 1000,
    onComplete: () => {
      levelText.destroy();
    }
  });
}

/**
 * Get current experience
 */
getExperience(): number {
  return this.experience;
}

/**
 * Get current level
 */
getLevel(): number {
  return this.level;
}

/**
 * Get experience required for next level
 */
getExperienceToNextLevel(): number {
  return this.experienceToNextLevel;
}

/**
 * Clean up resources
 */
cleanup(): void {
  if(this.attackTimer) {
  this.attackTimer.destroy();
}

if (this.invulnerableTimer) {
  this.invulnerableTimer.destroy();
}

if (this.damageTimer) {
  this.damageTimer.destroy();
}

// Remove event listeners
this.scene.events.off('experience-collected', this.onExperienceCollected, this);
  }

/**
 * Called when an upgrade is selected
 */
onUpgradeSelected(): void {
  // Reset leveling up flag
  this.isLevelingUp = false;

  // Check for additional level-ups
  this.checkLevelUp();
}

/**
 * Increase player's attack speed
 */
increaseBlasterSpeed(multiplier: number): void {
  this.blasterSpeedMultiplier += multiplier;
  // Blaster attack speed multiplier

  // Update attack timer
  if(this.attackTimer) {
  this.attackTimer.destroy(); // Destroy the existing timer
}

// Blaster speed increased - get the updated interval
this.getBlasterAttackInterval(); // Get the updated interval

// Recreate the attack timer with the updated interval
this.attackTimer = this.scene.time.addEvent({
  delay: this.getBlasterAttackInterval(),
  callback: () => this.fireProjectile(GAME_CONFIG.BLASTER.PLAYER.KEY),
  callbackScope: this,
  loop: true
});

  }


//************** */ UPGRADES ****************



/**
 * Get current attack interval in ms
 */
getBlasterAttackInterval(): number {
  // Lower interval means faster attacks
  return this.baseBlasterAttackInterval / this.blasterSpeedMultiplier;
}


getForceInterval(): number {
  // Lower interval means faster attacks
  return this.baseAttackInterval / this.forceSpeedMultiplier;
}

/**
 * Increase number of projectiles fired per attack
 */
increaseProjectileCount(amount: number): void {
  this.projectileCount += amount;
  // Projectile count increased
}

/**
 * Increase projectile size
 */
increaseProjectileSize(multiplier: number): void {
  this.projectileSizeMultiplier += multiplier;
  // Projectile size increased
}

/**
 * Get current projectile size multiplier
 */
getProjectileSizeMultiplier(): number {
  return this.projectileSizeMultiplier;
}


/**
 * Increase movement speed
 */
increaseMovementSpeed(multiplier: number): void {
  this.speedMultiplier += multiplier;
  // Movement speed increased
}

/**
 * Get current movement speed
 */
getSpeed(): number {
  return this.baseSpeed * this.speedMultiplier;
}

/**
 * Set whether player is currently in the level-up state
 */
setLevelingUp(isLevelingUp: boolean): void {
  this.isLevelingUp = isLevelingUp;
}



//Check if player is currently in the level-up state
isInLevelUpState(): boolean {
  return this.isLevelingUp;
}


unlockForceUpgrade(): void {
  this.hasForceUpgrade = true;
}


hasForceAbility(): boolean {
  return this.hasForceUpgrade;
}


unlockProjectile(type: string) {
  this.unlockedProjectiles.add(type);
}

unlockBlasterUpgrade(): void {
  this.hasBlasterUpgrade = true;
}

hasBlasterAbility(): boolean {
  return this.hasBlasterUpgrade;
}

getBlasterDamage(): number {
  return this.baseBlasterDamage * (1 * this.damageBlasterMultiplier);
}

increaseBlasterDamage(multiplier: number): void {
  this.damageBlasterMultiplier += multiplier;
  // Blaster damage increased
}


unlockR2D2Upgrade() {
  this.hasR2D2Upgrade = true;
  // R2D2 upgrade unlocked
}

hasR2D2Ability(): boolean {
  return this.hasR2D2Upgrade;
}

unlockBB8Upgrade(): void {
  this.hasBB8Upgrade = true;
  // BB-8 upgrade unlocked
}

hasBB8Ability(): boolean {
  return this.hasBB8Upgrade;
}

unlockLaserCannonUpgrade(): void {
  this.hasLaserCannonUpgrade = true;
}

hasLaserCannonAbility(): boolean {
  return this.hasLaserCannonUpgrade;
}

unlockSaberUpgrade(): void {
  this.hasSaberUpgrade = true;
  this.switchToSaberAnimation();
  // Saber upgrade unlocked
}

/**
 * Switch to saber animation
 */
private switchToSaberAnimation(): void {
  this.currentAnimationKey = 'player_walk_right_with_saber';
  // If currently moving, immediately switch to the new animation
  if (this.sprite.anims && this.sprite.anims.isPlaying && this.sprite.anims.exists(this.currentAnimationKey)) {
    this.sprite.anims.play(this.currentAnimationKey, true);
  }
}

hasSaberAbility(): boolean {
  return this.hasSaberUpgrade;
}

/**
 * Add a relic to the player's collection
 */
addRelic(relicId: string): void {
  this.relics.add(relicId);
  this.applyRelicEffect(relicId);
  // Relic collected
}

/**
 * Check if player has a specific relic
 */
hasRelic(relicId: string): boolean {
  return this.relics.has(relicId);
}

/**
 * Apply the effect of a specific relic
 */
private applyRelicEffect(relicId: string): void {
  switch (relicId) {
    case 'kyber_crystal':
      // Increase all weapon damage by 25%
      this.damageBlasterMultiplier *= 1.25;
      this.saberDamageMultiplier *= 1.25;
      this.forceDamageMultiplier *= 1.25;
      this.R2D2DamageMultiplier *= 1.25;
      break;
      
    case 'jedi_robes':
      // Reduce damage taken by 20%
      this.damageReduction += 0.2;
      // Damage reduction increased
      break;
      
    case 'force_sensitivity':
      // Increase Force abilities by 50%
      this.forceDamageMultiplier *= 1.5;
      this.forceSpeedMultiplier *= 1.5;
      break;
      
    case 'droid_companion':
      // R2-D2 abilities 30% more effective
      this.R2D2DamageMultiplier *= 1.3;
      this.R2D2SpeedMultiplier *= 1.3;
      break;
      
    case 'lightsaber_crystal':
      // Saber attacks have 15% chance to crit
      this.saberCritChance += 0.15;
      // Saber crit chance increased
      break;
  }
}

increaseR2D2Damage(multiplier: number): void {
  this.hasR2D2Upgrade = true;
  this.R2D2DamageMultiplier += multiplier;
  // Increased R2D2 damage
}

increaseBB8Speed(multiplier: number): void {
  this.hasBB8Upgrade = true;
  this.bb8SpeedMultiplier *= multiplier;
  // Increased BB-8 speed (reduces attack interval)
}

increaseBB8Damage(multiplier: number): void {
  this.hasBB8Upgrade = true;
  this.bb8DamageMultiplier += multiplier;
  // Increased BB-8 damage
}

// Get the multiplier for force strength
getR2D2StrengthMultiplier(): number {
  return this.R2D2StrengthMultiplier;
}


increaseForceDamage(multiplier: number): void {
  this.hasForceUpgrade = true;
  this.forceDamageMultiplier += multiplier;
  // Increased force damage
}

increaseDamageReduction(multiplier: number): void {
  this.damageReduction += multiplier;
  // Increased damage reduction
}

increaseSaberCritChance(multiplier: number): void {
  this.saberCritChance += multiplier;
  // Increased saber crit chance
}

increaseForceSpeed(multiplier: number): void {
  this.forceSpeedMultiplier *= multiplier;
  // Increased force speed
}

// Get the multiplier for force strength
getForceStrengthMultiplier(): number {
  return this.forceStrengthMultiplier;
}


//UPGRADEs
increaseSaberDamage(multiplier: number): void {
  this.saberDamageMultiplier += multiplier;
  // Increased saber damage
}

increaseSaberSpeed(multiplier: number): void {
  this.saberSpeedMultiplier *= multiplier;
  // Increased saber speed
}

deathVisual(): void {
  const scene = this.scene;

  // Create a graphics object to generate a cyan circle texture
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x00ffff); // Cyan
  graphics.fillCircle(8, 8, 8); // Circle radius 8
  graphics.generateTexture('cyan_circle', 16, 16);
  graphics.destroy();

  // Number of particles
  const numParticles = 20;

  for(let i = 0; i <numParticles; i++) {
  // Create a sprite at player's position
  if (this.sprite.body) {
    const particle = scene.physics.add.image(this.sprite.body.x, this.sprite.body.y, 'cyan_circle');

    // Scale it if needed
    particle.setScale(2);

    // Random velocity in all directions
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.Between(500, 1000);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    particle.setVelocity(vx, vy);

    // Optional: Fade and destroy after time
    scene.tweens.add({
      targets: particle,
      alpha: 0,
      scale: 0,
      duration: 900,
      repeat: false,
      onComplete: () => {
        particle.destroy();
        this.scene.physics.pause();
        this.scene.time.paused = true; // Pause the game
      }
    });
  }
}
  }



  update(): void {

  // Stop all player logic if defeated
  if (this.dead) {
    if (this.sprite && this.sprite.body) {
      this.sprite.setActive(false);
      this.sprite.setVisible(false);
      this.sprite.setVelocity(0, 0);
    }
    return;
  }

  // Skip update if player is in level-up state
  if(this.isLevelingUp) {
    if (this.sprite && this.sprite.body) {
      this.sprite.setVelocity(0, 0);
    }
    return;
  }

  // Update dash cooldown
  this.updateDashCooldown();

  // Handle dash state
  if (this.isDashing) {
    this.handleDash();
    return; // Skip normal movement during dash
  }

  const direction = this.getInputDirection();
  if (direction.x !== 0 || direction.y !== 0) {
    this.lastDirection.copy(direction);
  }

  if (direction.x !== 0 || direction.y !== 0) {
    // Normalize for diagonal movement
    const normalized = normalizeVector(direction.x, direction.y);

    // Apply movement with speed multiplier
    if (this.sprite && this.sprite.body) {
      // Ensure sprite/body are enabled without logging
      if (!this.sprite.active) {
        this.sprite.setActive(true);
      }
      if (!this.sprite.body.enable) {
        this.sprite.body.enable = true;
      }

      this.sprite.setVelocity(
        normalized.x * this.getSpeed(),
        normalized.y * this.getSpeed()
      );
    }
  } else {
    // No input, stop movement and switch to default attack animation
    if (this.sprite && this.sprite.body) {
      this.sprite.setVelocity(0, 0);
    }
    
    // Switch back to mech_attack animation when not moving (default state)
    this.updatePlayerSpriteFromLastDirection();
  }


  }

  /**
   * Attempt to dash - only works if cooldown is ready
   */
  private attemptDash(): void {
    // Check if dash is ready (cooldown complete)
    if (this.dashCooldown > 0) {
      return; // Dash on cooldown
    }

    // Can't dash if already dashing
    if (this.isDashing) {
      return;
    }

    // Get current movement direction (or last direction if not moving)
    let dashDirX = 0;
    let dashDirY = 0;

    const direction = this.getInputDirection();
    if (direction.x !== 0 || direction.y !== 0) {
      // Use current input direction
      dashDirX = direction.x;
      dashDirY = direction.y;
    } else if (this.lastDirection.x !== 0 || this.lastDirection.y !== 0) {
      // Use last direction if no current input
      dashDirX = this.lastDirection.x;
      dashDirY = this.lastDirection.y;
    } else {
      // Default to right if no direction
      dashDirX = 1;
      dashDirY = 0;
    }

    // Normalize direction
    const distance = Math.sqrt(dashDirX * dashDirX + dashDirY * dashDirY);
    if (distance > 0) {
      dashDirX /= distance;
      dashDirY /= distance;
    }

    // Start dash
    this.isDashing = true;
    this.dashStartTime = this.scene.time.now;
    this.dashDirection.set(dashDirX, dashDirY);

    // Set cooldown (with multiplier for upgrades)
    this.dashCooldown = this.dashCooldownMax * this.dashCooldownMultiplier;

    // Play dash animation
    if (this.sprite && this.sprite.anims && this.scene.anims.exists('mech_dash')) {
      this.sprite.anims.play('mech_dash', false);
      
      // Listen for animation complete to return to normal
      this.sprite.once('animationcomplete', () => {
        // Animation done, dash will end in handleDash
      });
    }
  }

  /**
   * Handle dash movement during dash state
   */
  private handleDash(): void {
    const currentTime = this.scene.time.now;
    const elapsed = currentTime - this.dashStartTime;
    const dashDuration = GAME_CONFIG.PLAYER.DASH.DURATION;

    if (elapsed >= dashDuration) {
      // Dash complete
      this.isDashing = false;
      
      // Return to normal animation based on movement state
      const direction = this.getInputDirection();
      if (direction.x !== 0 || direction.y !== 0) {
        // Moving - use walk animation
        this.updatePlayerSprite(this.isFlippedX ? 'left' : 'right');
      } else {
        // Not moving - use idle animation
        this.updatePlayerSpriteFromLastDirection();
      }
      
      return;
    }

    // Continue dash movement
    if (this.sprite && this.sprite.body) {
      const dashSpeed = this.getSpeed() * GAME_CONFIG.PLAYER.DASH.SPEED_MULTIPLIER * this.dashSpeedMultiplier;
      this.sprite.setVelocity(
        this.dashDirection.x * dashSpeed,
        this.dashDirection.y * dashSpeed
      );
    }
  }

  /**
   * Update dash cooldown timer
   */
  private updateDashCooldown(): void {
    if (this.dashCooldown > 0) {
      const currentTime = this.scene.time.now;
      const deltaTime = currentTime - this.lastUpdateTime;
      this.dashCooldown = Math.max(0, this.dashCooldown - deltaTime);
      this.lastUpdateTime = currentTime;
    } else {
      // Update time even when not on cooldown to keep tracking accurate
      this.lastUpdateTime = this.scene.time.now;
    }
  }

  /**
   * Get dash cooldown progress (0 to 1, where 1 = ready)
   */
  public getDashCooldownProgress(): number {
    if (this.dashCooldownMax <= 0) return 1; // Always ready if no cooldown
    return Math.max(0, Math.min(1, 1 - (this.dashCooldown / this.dashCooldownMax)));
  }

  /**
   * Check if dash is ready
   */
  public isDashReady(): boolean {
    return this.dashCooldown <= 0 && !this.isDashing;
  }

  /**
   * Increase movement speed
   */
  increaseSpeed(multiplier: number): void {
    this.speedMultiplier += multiplier;
  }

  /**
   * Increase max health
   */
  increaseMaxHealth(amount: number): void {
    this.maxHealth += amount;
    // When gaining max health, also restore health significantly
    // Heal by the amount gained + 50% of the amount (so +20 max health = +30 healing)
    // This makes health upgrades feel rewarding and helps sustain the player
    const healAmount = amount + Math.floor(amount * 0.5);
    this.health = Math.min(this.health + healAmount, this.maxHealth);
  }

  /**
   * Increase experience gain multiplier
   */
  increaseExperienceGain(multiplier: number): void {
    this.experienceMultiplier += multiplier;
  }

  /**
   * Increase projectile speed multiplier
   */
  increaseProjectileSpeed(multiplier: number): void {
    this.projectileSpeedMultiplier += multiplier;
  }

  /**
   * Increase dash speed multiplier
   */
  increaseDashSpeed(multiplier: number): void {
    this.dashSpeedMultiplier += multiplier;
  }

  /**
   * Reduce dash cooldown (multiplier < 1.0 reduces cooldown)
   */
  reduceDashCooldown(reduction: number): void {
    // reduction is a percentage (e.g., 0.15 = 15% reduction)
    // Lower multiplier = shorter cooldown
    this.dashCooldownMultiplier = Math.max(0.1, this.dashCooldownMultiplier - reduction);
  }

  /**
   * Set stress test mode (makes player invulnerable)
   */
  setStressTestMode(enabled: boolean): void {
    this.isStressTestMode = enabled;
  }

  /**
   * Check if stress test mode is active
   */
  isStressTestActive(): boolean {
    return this.isStressTestMode;
  }

} 