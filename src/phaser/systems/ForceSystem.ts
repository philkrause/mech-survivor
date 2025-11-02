import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnemySystem } from '../systems/EnemySystem';
import { TfighterSystem } from '../systems/TfighterSystem';

import { GAME_CONFIG } from '../config/GameConfig';

export interface ForcePoolConfig {
  key?: string;
  baseDamage?: number; // Base damage value
  radius?: number;
  endradius?: number;
  strength?: number;
  fadeduration?: number;
  color?: number;
  alpha?: number;
  maxSize?: number;
  scale?: number;
  depth?: number;
  lifespan?: number;
  tint?: number;
  damage?: number;
}

export class ForceSystem {
  private scene: Phaser.Scene;
  private enemySystem: EnemySystem;
  private tfighterSystem: TfighterSystem;

  private player: Player;

  private forceConfig: ForcePoolConfig = {
    key: GAME_CONFIG.FORCE.PLAYER.KEY,
    baseDamage: GAME_CONFIG.FORCE.PLAYER.BASEDAMAGE,
    radius: GAME_CONFIG.FORCE.PLAYER.RADIUS,
    endradius: GAME_CONFIG.FORCE.PLAYER.ENDRADIUS,
    strength: GAME_CONFIG.FORCE.PLAYER.STRENGTH,
    fadeduration: GAME_CONFIG.FORCE.PLAYER.FADEDURATION,
    color: GAME_CONFIG.FORCE.PLAYER.COLOR,
    alpha: GAME_CONFIG.FORCE.PLAYER.ALPHA,
    maxSize: GAME_CONFIG.FORCE.PLAYER.MAXSIZE,
    scale: GAME_CONFIG.FORCE.PLAYER.SCALE,
    depth: GAME_CONFIG.FORCE.PLAYER.DEPTH,
    lifespan: GAME_CONFIG.FORCE.PLAYER.LIFESPAN,
    tint: GAME_CONFIG.FORCE.PLAYER.TINT,
  };

  private lastForceTime = 0;
  private baseForceInterval = 2000;
  private staticIndicator: Phaser.GameObjects.Graphics | null = null;
  private indicatorRadius: number = 60; // Static indicator radius
  private indicatorCircles: Phaser.GameObjects.Arc[] = []; // Multiple circles for visual appeal
  private circleTweens: Phaser.Tweens.Tween[] = []; // Store tweens for cleanup


  constructor(scene: Phaser.Scene, enemySystem: EnemySystem, tfighterSystem: TfighterSystem, player: Player) {
    this.scene = scene;
    this.enemySystem = enemySystem;
    this.tfighterSystem = tfighterSystem;
    this.player = player;

    // Create static indicator circle
    this.createStaticIndicator();
  }


  applyForce(time: number): void {
    if (!this.player) {
      console.error('Player is not initialized.');
      return;  // Early exit if player is undefined
    }

    const { x, y } = this.player.getPosition();
    const enemies = this.enemySystem.getVisibleEnemies();
    const tfighters = this.tfighterSystem.getVisibleEnemies();

    // Emit force push particle effect
    this.scene.events.emit('force-push', x, y);

    enemies.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

      if (dist - 10 <= this.forceConfig.endradius!) {
        this.enemySystem.damageEnemy(
          enemy,
          this.forceConfig.baseDamage! * this.player.forceDamageMultiplier,
          20,
          false
        );
      }
    });

    tfighters.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

      if (dist - 10 <= this.forceConfig.endradius!) {
        this.tfighterSystem.damageEnemy(
          enemy,
          this.forceConfig.baseDamage! * this.player.forceDamageMultiplier,
          20,
          false
        );
      }
    });

    this.createVisualEffect(x, y, this.forceConfig);
    this.lastForceTime = time;
  }



  /**
   * Create static indicator circles to show player has force ability
   */
  private createStaticIndicator(): void {
    // Destroy existing indicators if they exist
    this.destroyStaticIndicator();
    
    // Don't create if player doesn't have force ability yet
    if (!this.player.hasForceAbility()) {
      return;
    }

    const { x, y } = this.player.getPosition();
    const baseRadius = this.indicatorRadius;
    const forceColor = this.forceConfig.color!;

    // Create multiple circles with different sizes, opacities, and rotations
    // Outer circle - larger, more transparent, filled with color
    const outerCircle = this.scene.add.circle(x, y, baseRadius * 1.3, forceColor, 0.2);
    outerCircle.setDepth((this.forceConfig.depth ?? 10) - 1);
    outerCircle.setBlendMode(Phaser.BlendModes.ADD); // Glow effect
    outerCircle.setAlpha(0.4); // More transparent
    
    // Middle circle - medium size, semi-transparent
    const middleCircle = this.scene.add.circle(x, y, baseRadius, forceColor, 0.3);
    middleCircle.setDepth((this.forceConfig.depth ?? 10) - 1);
    middleCircle.setBlendMode(Phaser.BlendModes.ADD); // Glow effect
    middleCircle.setAlpha(0.6); // Medium transparency
    
    // Inner circle - smaller, more opaque
    const innerCircle = this.scene.add.circle(x, y, baseRadius * 0.7, forceColor, 0.4);
    innerCircle.setDepth((this.forceConfig.depth ?? 10) - 1);
    innerCircle.setBlendMode(Phaser.BlendModes.ADD); // Glow effect
    innerCircle.setAlpha(0.8); // Less transparent

    this.indicatorCircles = [outerCircle, middleCircle, innerCircle];

    // Create pulsing animations for each circle (out of phase)
    const outerPulse = this.scene.tweens.add({
      targets: outerCircle,
      scale: { from: 1.0, to: 1.2 },
      alpha: { from: 0.3, to: 0.5 }, // Pulse between these alpha values
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    const middlePulse = this.scene.tweens.add({
      targets: middleCircle,
      scale: { from: 1.0, to: 1.15 },
      alpha: { from: 0.5, to: 0.7 }, // Pulse between these alpha values
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 500 // Offset pulse
    });

    const innerPulse = this.scene.tweens.add({
      targets: innerCircle,
      scale: { from: 1.0, to: 1.1 },
      alpha: { from: 0.7, to: 1.0 }, // Pulse between these alpha values
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 1000 // Further offset
    });

    // Store tweens for cleanup
    this.circleTweens = [outerPulse, middlePulse, innerPulse];
  }

  /**
   * Destroy static indicator circles and animations
   */
  private destroyStaticIndicator(): void {
    // Stop and destroy all tweens
    this.circleTweens.forEach(tween => {
      if (tween) {
        tween.stop();
        tween.destroy();
      }
    });
    this.circleTweens = [];

    // Destroy all circles
    this.indicatorCircles.forEach(circle => {
      if (circle) {
        circle.destroy();
      }
    });
    this.indicatorCircles = [];

    // Destroy old graphics indicator if it exists
    if (this.staticIndicator) {
      this.staticIndicator.destroy();
      this.staticIndicator = null;
    }
  }

  /**
   * Update static indicator position and visibility
   */
  private updateStaticIndicator(): void {
    if (!this.player) {
      return;
    }

    // Only show if player has force ability
    if (!this.player.hasForceAbility()) {
      // Destroy circles if player lost force ability
      if (this.indicatorCircles.length > 0) {
        this.destroyStaticIndicator();
      }
      return;
    }

    // Create circles if they don't exist
    if (this.indicatorCircles.length === 0) {
      this.createStaticIndicator();
      return;
    }

    // Update circle positions to follow player
    const { x, y } = this.player.getPosition();
    this.indicatorCircles.forEach(circle => {
      if (circle && circle.active) {
        circle.setPosition(x, y);
      }
    });
  }

  private createVisualEffect(x: number, y: number, config: ForcePoolConfig): void {
    const circle = this.scene.add.circle(
      x,
      y,
      config.radius,
      config.color,
      config.alpha
    );

    circle.setDepth(config.depth ?? 10);
    circle.setBlendMode(Phaser.BlendModes.ADD);
    circle.setStrokeStyle(2, 0xffffff, 1);

    this.scene.tweens.add({
      targets: circle,
      radius: config.endradius,
      alpha: 0,
      duration: config.fadeduration,
      onComplete: () => {
        circle.destroy();
      }
    });

  }



  update(time: number): void {
    // Update static indicator position and visibility
    this.updateStaticIndicator();

    const actualInterval = this.baseForceInterval * this.player.forceSpeedMultiplier;
    if (time - this.lastForceTime >= actualInterval) {
      this.applyForce(time);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.destroyStaticIndicator();
  }
  
}
