import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnemySystem } from './EnemySystem';
import { AtEnemySystem } from './AtEnemySystem';
import { WalkerEnemySystem } from './WalkerEnemySystem';
import { TfighterSystem } from './TfighterSystem';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Interface for an active air strike
 */
interface AirStrike {
  missile: Phaser.GameObjects.Sprite;
  targetX: number;
  targetY: number;
  indicator: Phaser.GameObjects.Ellipse;
  indicatorTween: Phaser.Tweens.Tween | null;
  startTime: number;
  impactTime: number;
  explosion: Phaser.GameObjects.Sprite | null;
}

/**
 * System responsible for player's Air Strike weapon
 * Drops missiles from the top of the screen that explode on impact
 */
export class AirStrikeSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemySystem: EnemySystem | null = null;
  private atEnemySystem: AtEnemySystem | null = null;
  private walkerEnemySystem: WalkerEnemySystem | null = null;
  private tfighterSystem: TfighterSystem | null = null;
  
  private active: boolean = false;
  private fireTimer: Phaser.Time.TimerEvent | null = null;
  
  // Active air strikes
  private activeStrikes: AirStrike[] = [];
  
  // Configuration
  private baseDamage: number = GAME_CONFIG.AIR_STRIKE.BASEDAMAGE;
  private fireInterval: number = GAME_CONFIG.AIR_STRIKE.FIRE_INTERVAL;
  private missileSpeed: number = GAME_CONFIG.AIR_STRIKE.MISSILE_SPEED;
  private impactRadius: number = GAME_CONFIG.AIR_STRIKE.IMPACT_RADIUS;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  /**
   * Setup Air Strike animations
   */
  public static setupAnimations(scene: Phaser.Scene): void {
    // Create explosion animation for air strike (10 frames)
    if (!scene.anims.exists('explosion_airstrike')) {
      scene.anims.create({
        key: 'explosion_airstrike',
        frames: scene.anims.generateFrameNumbers('explosion_airstrike', { start: 0, end: 9 }),
        frameRate: 20,
        repeat: 0
      });
    }
  }

  /**
   * Set enemy system references for finding targets
   */
  public setEnemySystems(
    enemySystem: EnemySystem,
    atEnemySystem: AtEnemySystem,
    walkerEnemySystem: WalkerEnemySystem,
    tfighterSystem: TfighterSystem
  ): void {
    this.enemySystem = enemySystem;
    this.atEnemySystem = atEnemySystem;
    this.walkerEnemySystem = walkerEnemySystem;
    this.tfighterSystem = tfighterSystem;
  }

  /**
   * Activate the air strike system
   */
  public unlockAndActivate(): void {
    if (this.active) return;
    
    this.active = true;
    this.startFiring();
  }

  /**
   * Check if air strike is active
   */
  public isActive(): boolean {
    return this.active;
  }

  /**
   * Start automatic firing timer
   */
  private startFiring(): void {
    if (this.fireTimer) {
      this.fireTimer.destroy();
    }

    this.scheduleNextStrike();
  }

  /**
   * Schedule the next air strike
   */
  private scheduleNextStrike(): void {
    const speedMultiplier = this.player.airStrikeSpeedMultiplier || 1.0;
    const actualInterval = this.fireInterval * speedMultiplier;
    
    this.fireTimer = this.scene.time.addEvent({
      delay: actualInterval,
      callback: () => {
        this.fireAirStrike();
        // Schedule next strike
        this.scheduleNextStrike();
      },
      loop: false // Single shot, we'll reschedule
    });
  }

  /**
   * Fire an air strike at a random enemy position (or player position if no enemies)
   */
  private fireAirStrike(): void {
    if (!this.active || !this.player) return;
    
    // Find a target position (prefer enemy location, fallback to player)
    let targetX = this.player.getSprite().x;
    let targetY = this.player.getSprite().y;
    
    // Try to find an enemy to target
    const allEnemies: Phaser.Physics.Arcade.Sprite[] = [];
    
    if (this.enemySystem) {
      allEnemies.push(...this.enemySystem.getVisibleEnemies());
    }
    if (this.atEnemySystem) {
      allEnemies.push(...this.atEnemySystem.getVisibleEnemies());
    }
    if (this.walkerEnemySystem) {
      allEnemies.push(...this.walkerEnemySystem.getVisibleEnemies());
    }
    if (this.tfighterSystem) {
      allEnemies.push(...this.tfighterSystem.getVisibleEnemies());
    }
    
    // If we have enemies, target a random one
    if (allEnemies.length > 0) {
      const randomEnemy = Phaser.Utils.Array.GetRandom(allEnemies);
      targetX = randomEnemy.x;
      targetY = randomEnemy.y;
    }
    
    // Ensure target is within camera bounds
    const camera = this.scene.cameras.main;
    targetX = Phaser.Math.Clamp(targetX, camera.worldView.left + 50, camera.worldView.right - 50);
    targetY = Phaser.Math.Clamp(targetY, camera.worldView.top + 50, camera.worldView.bottom - 50);
    
    // Create air strike
    this.createAirStrike(targetX, targetY);
  }

  /**
   * Create an air strike at the target position
   */
  private createAirStrike(targetX: number, targetY: number): void {
    const camera = this.scene.cameras.main;
    
    // Start missile from top of screen (above camera view)
    const startX = targetX;
    const startY = camera.worldView.top - 100;
    
    // Create missile sprite - 1/10 of original size
    const missile = this.scene.add.sprite(startX, startY, 'missile', 0);
    missile.setRotation(Math.PI); // Rotate 180 degrees (pointing down)
    missile.setDepth(10);
    missile.setScale(0.25); // 1/10 of original size
    
    // Create red oval indicator at target position - more visible
    const indicator = this.scene.add.ellipse(targetX, targetY, this.impactRadius * 2, this.impactRadius * 1.5, 0xff0000, 0.5);
    indicator.setStrokeStyle(4, 0xff0000, 1.0);
    indicator.setDepth(9);
    
    // Create pulsing/flashing animation for indicator - more dramatic
    const indicatorTween = this.scene.tweens.add({
      targets: indicator,
      scaleX: { from: 0.7, to: 1.3 },
      scaleY: { from: 0.7, to: 1.3 },
      alpha: { from: 0.4, to: 0.8 },
      duration: 400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Calculate impact time
    const distance = Math.abs(startY - targetY);
    const impactTime = (distance / this.missileSpeed) * 1000; // Convert to ms
    
    const airStrike: AirStrike = {
      missile,
      targetX,
      targetY,
      indicator,
      indicatorTween,
      startTime: this.scene.time.now,
      impactTime,
      explosion: null
    };
    
    this.activeStrikes.push(airStrike);
    
    // Animate missile falling - faster travel
    this.scene.tweens.add({
      targets: missile,
      y: targetY,
      duration: impactTime,
      ease: 'Linear',
      onComplete: () => {
        this.onImpact(airStrike);
      }
    });
    
    // Also destroy indicator when missile impacts (they should explode together)
    // The indicator will be destroyed in onImpact, but we ensure it happens at the same time
  }

  /**
   * Handle missile impact - missile explodes the red circle
   */
  private onImpact(airStrike: AirStrike): void {
    // Remove missile first (it explodes)
    if (airStrike.missile) {
      airStrike.missile.destroy();
    }
    
    // Remove indicator (it gets "exploded" by the missile)
    if (airStrike.indicator) {
      if (airStrike.indicatorTween) {
        airStrike.indicatorTween.destroy();
      }
      airStrike.indicator.destroy();
    }
    
    // Create explosion animation at the impact point
    const explosion = this.scene.add.sprite(airStrike.targetX, airStrike.targetY, 'explosion_airstrike', 0);
    explosion.setDepth(10);
    explosion.setScale(1.0);
    
    // Play explosion animation
    if (this.scene.anims.exists('explosion_airstrike')) {
      explosion.play('explosion_airstrike');
      
      explosion.on('animationcomplete', () => {
        explosion.destroy();
      });
    }
    
    airStrike.explosion = explosion;
    
    // Deal damage to enemies in radius
    this.dealDamage(airStrike.targetX, airStrike.targetY);
    
    // Remove from active strikes after a delay (to allow explosion to play)
    this.scene.time.delayedCall(1000, () => {
      const index = this.activeStrikes.indexOf(airStrike);
      if (index !== -1) {
        this.activeStrikes.splice(index, 1);
      }
      if (explosion && explosion.active) {
        explosion.destroy();
      }
    });
  }

  /**
   * Deal damage to enemies within impact radius
   */
  private dealDamage(centerX: number, centerY: number): void {
    const damage = this.baseDamage * (this.player.airStrikeDamageMultiplier || 1.0);
    const radius = this.impactRadius;
    
    // Track damage for stats
    const statsTracker = (this.scene as any).statsTracker;
    let totalDamageDealt = 0;
    
    // Check regular enemies
    if (this.enemySystem) {
      const enemies = this.enemySystem.getVisibleEnemies();
      enemies.forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(centerX, centerY, enemy.x, enemy.y);
        if (dist <= radius) {
          this.enemySystem!.damageEnemy(enemy, damage, 0, false);
          totalDamageDealt += damage;
        }
      });
    }
    
    // Check AT enemies
    if (this.atEnemySystem) {
      const atEnemies = this.atEnemySystem.getVisibleEnemies();
      atEnemies.forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(centerX, centerY, enemy.x, enemy.y);
        if (dist <= radius) {
          this.atEnemySystem!.damageEnemy(enemy, damage, 0, false);
          totalDamageDealt += damage;
        }
      });
    }
    
    // Check Walker enemies
    if (this.walkerEnemySystem) {
      const walkerEnemies = this.walkerEnemySystem.getVisibleEnemies();
      walkerEnemies.forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(centerX, centerY, enemy.x, enemy.y);
        if (dist <= radius) {
          this.walkerEnemySystem!.damageEnemy(enemy, damage, 0, false);
          totalDamageDealt += damage;
        }
      });
    }
    
    // Check T-Fighter enemies
    if (this.tfighterSystem) {
      const tfighters = this.tfighterSystem.getVisibleEnemies();
      tfighters.forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(centerX, centerY, enemy.x, enemy.y);
        if (dist <= radius) {
          this.tfighterSystem!.damageEnemy(enemy, damage, 0, false);
          totalDamageDealt += damage;
        }
      });
    }
    
    // Record damage for stats
    if (statsTracker && totalDamageDealt > 0) {
      statsTracker.recordWeaponDamage('air_strike', totalDamageDealt);
    }
  }

  /**
   * Update the air strike system
   */
  public update(): void {
    // Clean up any expired strikes
    this.activeStrikes = this.activeStrikes.filter(strike => {
      // Keep strikes that haven't impacted yet or are still showing explosion
      if (!strike.explosion) {
        return true; // Still in flight
      }
      // If explosion exists, check if it's still active
      return strike.explosion.active;
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.fireTimer) {
      this.fireTimer.destroy();
      this.fireTimer = null;
    }
    
    // Clean up all active strikes
    this.activeStrikes.forEach(strike => {
      if (strike.missile) strike.missile.destroy();
      if (strike.indicator) {
        if (strike.indicatorTween) strike.indicatorTween.destroy();
        strike.indicator.destroy();
      }
      if (strike.explosion) strike.explosion.destroy();
    });
    this.activeStrikes = [];
    
    this.active = false;
  }
}

