import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnemySystem } from './EnemySystem';
import { TfighterSystem } from './TfighterSystem';
import { AtEnemySystem } from './AtEnemySystem';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * BB-8 Rolling Slash System
 * BB-8 rolls forward in a line, slicing through enemies, then returns to player
 */
export class BB8System {
  private scene: Phaser.Scene;
  private enemySystem: EnemySystem;
  private tfighterSystem: TfighterSystem;
  private atEnemySystem: AtEnemySystem;
  private player: Player;
  private sprite?: Phaser.GameObjects.Sprite;
  
  private active: boolean = false;
  private isRolling: boolean = false;
  private isReturning: boolean = false;
  
  // Rolling state
  private startX: number = 0;
  private startY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  
  // Configuration
  private baseDamage: number = GAME_CONFIG.BB8.BASEDAMAGE;
  private rollSpeed: number = GAME_CONFIG.BB8.ROLL_SPEED;
  private rollDistance: number = GAME_CONFIG.BB8.ROLL_DISTANCE;
  private attackInterval: number = GAME_CONFIG.BB8.ATTACK_INTERVAL;
  private hitRadius: number = GAME_CONFIG.BB8.HIT_RADIUS;
  private followOffset: number = GAME_CONFIG.BB8.FOLLOW_OFFSET;
  private lazyFollowSmoothing: number = GAME_CONFIG.BB8.LAZY_FOLLOW_SMOOTHING;
  private idleWobble: number = GAME_CONFIG.BB8.IDLE_WOBBLE;
  
  // Timing
  private lastAttackTime: number = 0;
  
  // Track enemies hit during this roll to prevent multiple hits
  private hitEnemiesThisRoll: WeakSet<Phaser.Physics.Arcade.Sprite> = new WeakSet();
  
  // Trail effect
  private trailEffect?: Phaser.GameObjects.Graphics;
  
  // Glow effect
  private glowEffect?: Phaser.GameObjects.Graphics;
  private glowTween?: Phaser.Tweens.Tween;
  private glowAlpha: number = 0.6;

  constructor(
    scene: Phaser.Scene,
    enemySystem: EnemySystem,
    tfighterSystem: TfighterSystem,
    atEnemySystem: AtEnemySystem,
    player: Player
  ) {
    this.scene = scene;
    this.enemySystem = enemySystem;
    this.tfighterSystem = tfighterSystem;
    this.atEnemySystem = atEnemySystem;
    this.player = player;
  }

  /**
   * Setup BattleDrone walk animation
   */
  public static setupAnimations(scene: Phaser.Scene): void {
    // Create walk animation for BattleDrone (4 frames)
    if (!scene.anims.exists('battledrone_walk')) {
      scene.anims.create({
        key: 'battledrone_walk',
        frames: scene.anims.generateFrameNumbers('battledrone', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  /**
   * Unlock and activate BB-8
   */
  unlockAndActivate(): void {
    if (this.active) return;
    
    const { x, y } = this.player.getPosition();
    
    // Create sprite using BattleDrone spritesheet
    this.sprite = this.scene.add.sprite(x, y, 'battledrone', 0);
    this.sprite.setScale(GAME_CONFIG.BB8.SCALE);
    this.sprite.setDepth(GAME_CONFIG.BB8.DEPTH);
    
    // Play walk animation
    if (this.scene.anims.exists('battledrone_walk')) {
      this.sprite.anims.play('battledrone_walk', true);
    }
    
    // Create glow effect
    this.createGlow();
    
    this.active = true;
    this.lastAttackTime = this.scene.time.now;
    
    // Position at offset from player initially (to the right/behind player)
    this.currentX = x + this.followOffset;
    this.currentY = y - 20;
  }

  /**
   * Check if BB-8 is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Update BB-8 system
   */
  update(time: number, delta: number): void {
    if (!this.active || !this.sprite || !this.player) return;

    const { x: playerX, y: playerY } = this.player.getPosition();
    const actualInterval = this.attackInterval * this.player.bb8SpeedMultiplier;
    
    // Check if it's time to attack
    if (!this.isRolling && !this.isReturning && time - this.lastAttackTime >= actualInterval) {
      this.startRoll(playerX, playerY);
    }

    // Update rolling or returning
    if (this.isRolling) {
      this.updateRoll(delta);
    } else if (this.isReturning) {
      this.updateReturn(delta, playerX, playerY);
    } else {
      // Maintain offset distance from player when idle
      this.updateIdlePosition(delta, playerX, playerY);
    }

    // Update trail effect
    this.updateTrail();
    
    // Update glow effect position
    this.updateGlow();
  }

  /**
   * Start a rolling attack
   */
  private startRoll(startX: number, startY: number): void {
    this.startX = startX;
    this.startY = startY;
    this.currentX = startX;
    this.currentY = startY;
    this.isRolling = true;
    this.isReturning = false;
    this.hitEnemiesThisRoll = new WeakSet();

    // Find nearest enemy or roll in player's facing direction
    const nearestEnemy = this.findNearestEnemy(startX, startY);
    
    if (nearestEnemy) {
      // Roll toward nearest enemy
      const angle = Phaser.Math.Angle.Between(startX, startY, nearestEnemy.x, nearestEnemy.y);
      this.targetX = startX + Math.cos(angle) * this.rollDistance;
      this.targetY = startY + Math.sin(angle) * this.rollDistance;
    } else {
      // Roll in player's facing direction (right if not flipped, left if flipped)
      const facingDirection = this.player.getFlippedX() ? -1 : 1;
      this.targetX = startX + facingDirection * this.rollDistance;
      this.targetY = startY;
    }

    // Create trail effect
    this.createTrail();
  }

  /**
   * Update rolling movement
   */
  private updateRoll(delta: number): void {
    if (!this.sprite) return;

    // Calculate progress
    const distanceToTarget = Phaser.Math.Distance.Between(
      this.currentX,
      this.currentY,
      this.targetX,
      this.targetY
    );

    if (distanceToTarget < 5) {
      // Reached target, start returning
      this.isRolling = false;
      this.isReturning = true;
      this.lastAttackTime = this.scene.time.now;
      return;
    }

    // Move toward target
    const angle = Phaser.Math.Angle.Between(
      this.currentX,
      this.currentY,
      this.targetX,
      this.targetY
    );
    
    const speed = this.rollSpeed * (delta / 1000);
    this.currentX += Math.cos(angle) * speed;
    this.currentY += Math.sin(angle) * speed;

    // Update sprite position
    this.sprite.setPosition(this.currentX, this.currentY);
    
    // Update glow position
    this.updateGlowPosition();
    
    // Keep BB-8 upright during roll (no rotation)
    if (this.sprite.rotation !== undefined) {
      this.sprite.rotation = 0;
    }

    // Check for enemy collisions
    this.checkEnemyCollisions();
  }

  /**
   * Update returning to follow position near player
   */
  private updateReturn(delta: number, playerX: number, playerY: number): void {
    if (!this.sprite) return;

    // Calculate target position at offset from player (behind/to the right)
    const playerFacingLeft = this.player.getFlippedX();
    const offsetX = this.followOffset * (playerFacingLeft ? -1 : 1);
    const targetX = playerX + offsetX;
    const targetY = playerY;

    const distanceToTarget = Phaser.Math.Distance.Between(
      this.currentX,
      this.currentY,
      targetX,
      targetY
    );

    if (distanceToTarget < 5) {
      // Reached follow position, reset
      this.isReturning = false;
      this.currentX = targetX;
      this.currentY = targetY;
      if (this.sprite) {
        this.sprite.setPosition(targetX, targetY);
        this.sprite.rotation = 0;
      }
      this.destroyTrail();
      return;
    }

    // Move toward follow position
    const angle = Phaser.Math.Angle.Between(
      this.currentX,
      this.currentY,
      targetX,
      targetY
    );
    
    const returnSpeed = this.rollSpeed * 1.5 * (delta / 1000); // Faster return
    this.currentX += Math.cos(angle) * returnSpeed;
    this.currentY += Math.sin(angle) * returnSpeed;

    // Update sprite position
    this.sprite.setPosition(this.currentX, this.currentY);
    
    // Update glow position
    this.updateGlowPosition();
    
    // Keep BB-8 upright (no rotation while returning)
    if (this.sprite.rotation !== undefined) {
      this.sprite.rotation = 0;
    }
  }

  /**
   * Update idle position with lazy follow using lerp (simple, smooth, reliable)
   */
  private updateIdlePosition(delta: number, playerX: number, playerY: number): void {
    if (!this.sprite) return;

    // Calculate target position at offset from player (behind/to the right)
    const playerFacingLeft = this.player.getFlippedX();
    const offsetX = this.followOffset * (playerFacingLeft ? -1 : 1);
    const targetX = playerX + offsetX;
    const targetY = playerY - 20; // Match the initial Y offset from user's change

    // Use lerp for smooth, lazy follow
    // The smoothing factor controls how "lazy" it is (lower = more lag, more lazy feel)
    // Scale by delta time to make it frame-rate independent
    const lerpFactor = Math.min(1, this.lazyFollowSmoothing * (delta / 16)); // Normalize to ~60fps
    
    // Interpolate position toward target
    this.currentX = Phaser.Math.Linear(this.currentX, targetX, lerpFactor);
    this.currentY = Phaser.Math.Linear(this.currentY, targetY, lerpFactor);

    // Calculate distance to see if we should add wobble
    const distanceToTarget = Phaser.Math.Distance.Between(this.currentX, this.currentY, targetX, targetY);
    
    // Add subtle wobble when very close to target (makes it feel alive)
    if (distanceToTarget < 15 && distanceToTarget > 1) {
      // Time-based wobble (more consistent than random)
      const time = this.scene.time.now * 0.003; // Slow oscillation
      const wobbleX = Math.sin(time) * this.idleWobble * 0.5;
      const wobbleY = Math.cos(time * 1.3) * this.idleWobble * 0.5;
      this.currentX += wobbleX;
      this.currentY += wobbleY;
    }

    // Keep BB-8 upright (no rotation)
    if (this.sprite.rotation !== undefined) {
      this.sprite.rotation = 0;
    }

    // Update sprite position
    this.sprite.setPosition(this.currentX, this.currentY);
    
    // Update glow position
    this.updateGlowPosition();
  }

  /**
   * Check for enemy collisions during roll
   */
  private checkEnemyCollisions(): void {
    if (!this.sprite) return;

    const damage = this.baseDamage * this.player.bb8DamageMultiplier;

    // Check regular enemies
    const enemies = this.enemySystem.getVisibleEnemies();
    enemies.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(
        this.currentX,
        this.currentY,
        enemy.x,
        enemy.y
      );
      
      if (dist < this.hitRadius && !this.hitEnemiesThisRoll.has(enemy)) {
        this.enemySystem.damageEnemy(enemy, damage, 0, false);
        this.hitEnemiesThisRoll.add(enemy);
        // Emit hit effect
        this.scene.events.emit('bb8-hit', enemy.x, enemy.y);
      }
    });

    // Check T-Fighters
    const tfighters = this.tfighterSystem.getVisibleEnemies();
    tfighters.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(
        this.currentX,
        this.currentY,
        enemy.x,
        enemy.y
      );
      
      if (dist < this.hitRadius && !this.hitEnemiesThisRoll.has(enemy)) {
        this.tfighterSystem.damageEnemy(enemy, damage, 0, false);
        this.hitEnemiesThisRoll.add(enemy);
        this.scene.events.emit('bb8-hit', enemy.x, enemy.y);
      }
    });

    // Check AT enemies
    const atEnemies = this.atEnemySystem.getVisibleEnemies();
    atEnemies.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(
        this.currentX,
        this.currentY,
        enemy.x,
        enemy.y
      );
      
      if (dist < this.hitRadius && !this.hitEnemiesThisRoll.has(enemy)) {
        this.atEnemySystem.damageEnemy(enemy, damage, 0, false);
        this.hitEnemiesThisRoll.add(enemy);
        this.scene.events.emit('bb8-hit', enemy.x, enemy.y);
      }
    });
  }

  /**
   * Find nearest enemy to roll toward
   */
  private findNearestEnemy(x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let nearestDist = Infinity;

    // Check all enemy types
    const allEnemies = [
      ...this.enemySystem.getVisibleEnemies(),
      ...this.tfighterSystem.getVisibleEnemies(),
      ...this.atEnemySystem.getVisibleEnemies()
    ];

    allEnemies.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < nearestDist && dist < this.rollDistance * 1.5) {
        nearestDist = dist;
        nearest = enemy;
      }
    });

    return nearest;
  }

  /**
   * Create trail effect
   */
  private createTrail(): void {
    if (this.trailEffect) {
      this.trailEffect.destroy();
    }
    
    this.trailEffect = this.scene.add.graphics();
    this.trailEffect.setDepth(GAME_CONFIG.BB8.DEPTH - 1);
  }

  /**
   * Update trail effect
   */
  private updateTrail(): void {
    if (!this.trailEffect || !this.sprite || !this.isRolling) {
      return;
    }

    // Draw orange/white trail
    this.trailEffect.clear();
    this.trailEffect.lineStyle(4, 0xff6600, 0.6); // Orange trail
    this.trailEffect.lineBetween(
      this.startX,
      this.startY,
      this.currentX,
      this.currentY
    );
    
    // Add white highlight
    this.trailEffect.lineStyle(2, 0xffffff, 0.8);
    this.trailEffect.lineBetween(
      this.startX,
      this.startY,
      this.currentX,
      this.currentY
    );
  }

  /**
   * Destroy trail effect
   */
  private destroyTrail(): void {
    if (this.trailEffect) {
      this.trailEffect.destroy();
      this.trailEffect = undefined;
    }
  }

  /**
   * Create glow effect around combat drone
   */
  private createGlow(): void {
    if (!this.sprite) return;
    
    // Create graphics object for glow
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(GAME_CONFIG.BB8.DEPTH - 1); // Behind the drone sprite
    
    // Draw initial glow (will be updated in updateGlow)
    this.updateGlow();
    
    // Create pulsing tween for glow
    const glowObj = { alpha: 0.6 };
    this.glowTween = this.scene.tweens.add({
      targets: glowObj,
      alpha: { from: 0.4, to: 0.8 },
      duration: 1500,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true,
      onUpdate: () => {
        if (this.glowEffect && glowObj) {
          this.glowAlpha = glowObj.alpha;
          this.updateGlow(this.glowAlpha);
        }
      }
    });
  }

  /**
   * Update glow effect
   */
  private updateGlow(alpha: number = 0.6): void {
    if (!this.glowEffect || !this.sprite) return;
    
    this.glowEffect.clear();
    
    // Draw outer glow (orange/yellow)
    this.glowEffect.fillStyle(0xff8800, alpha); // Orange glow
    this.glowEffect.fillCircle(this.currentX, this.currentY, 32); // Larger outer glow
    
    // Draw inner glow (white/brighter)
    this.glowEffect.fillStyle(0xffffff, alpha * 0.5); // White inner glow
    this.glowEffect.fillCircle(this.currentX, this.currentY, 20); // Smaller inner glow
  }

  /**
   * Update glow position to follow sprite
   */
  private updateGlowPosition(): void {
    if (!this.glowEffect || !this.sprite) return;
    
    // Glow position is updated in updateGlow using currentX/currentY
    // Use current glow alpha value
    this.updateGlow(this.glowAlpha);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = undefined;
    }
    this.destroyTrail();
    
    // Destroy glow effect
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = undefined;
    }
    if (this.glowEffect) {
      this.glowEffect.destroy();
      this.glowEffect = undefined;
    }
    
    this.active = false;
  }
}

