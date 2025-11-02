import Phaser from 'phaser';

/**
 * Enhanced particle effects system for satisfying visual feedback
 */
export class ParticleEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTextures();
  }

  /**
   * Create custom particle textures for better visual effects
   */
  private createParticleTextures(): void {
    // Create spark texture
    const sparkGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    sparkGraphics.fillStyle(0xffffff);
    sparkGraphics.fillCircle(2, 2, 2);
    sparkGraphics.generateTexture('spark', 4, 4);
    sparkGraphics.destroy();

    // Create explosion texture
    const explosionGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    explosionGraphics.fillStyle(0xff6b35);
    explosionGraphics.fillCircle(3, 3, 3);
    explosionGraphics.generateTexture('explosion_particle', 6, 6);
    explosionGraphics.destroy();

    // Create hit effect texture
    const hitGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    hitGraphics.fillStyle(0x00ff00);
    hitGraphics.fillCircle(1, 1, 1);
    hitGraphics.generateTexture('hit_particle', 2, 2);
    hitGraphics.destroy();

    // Create critical hit texture
    const critGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    critGraphics.fillStyle(0xffd700);
    critGraphics.fillCircle(2, 2, 2);
    critGraphics.generateTexture('crit_particle', 4, 4);
    critGraphics.destroy();
  }

  /**
   * Create satisfying death explosion effect
   */
  public createDeathEffect(x: number, y: number, _enemyType: string = 'default'): void {
    if (!this.enabled) return;
    
    // Check if death is on-screen (within camera bounds + some margin)
    const camera = this.scene.cameras.main;
    const margin = 100; // Extra margin to include deaths just off-screen
    const isOnScreen = x >= camera.worldView.x - margin && 
                      x <= camera.worldView.x + camera.width + margin &&
                      y >= camera.worldView.y - margin && 
                      y <= camera.worldView.y + camera.height + margin;
    
    if (!isOnScreen) return; // Don't create effects for off-screen deaths
    
    // Main explosion particles
    const explosionParticles = this.scene.add.particles(x, y, 'explosion_particle', {
      speed: { min: 80, max: 150 },
      scale: { start: 0.8, end: 0 },
      quantity: 8,
      lifespan: 600,
      tint: [0xff6b35, 0xff8c42, 0xffa500], // Orange to yellow gradient
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // Sparks flying outward
    const sparkParticles = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      quantity: 12,
      lifespan: 800,
      tint: 0xffffff,
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // Light screen shake only for major impacts (on-screen only)
    this.scene.cameras.main.shake(50, 0.01);

    // Auto-destroy particles
    this.scene.time.delayedCall(800, () => {
      explosionParticles.destroy();
      sparkParticles.destroy();
    });
  }

  /**
   * Create hit effect when projectile hits enemy
   */
  public createHitEffect(x: number, y: number, isCritical: boolean = false): void {
    if (!this.enabled) return;
    
    // Check if hit is on-screen (within camera bounds + some margin)
    const camera = this.scene.cameras.main;
    const margin = 100;
    const isOnScreen = x >= camera.worldView.x - margin && 
                      x <= camera.worldView.x + camera.width + margin &&
                      y >= camera.worldView.y - margin && 
                      y <= camera.worldView.y + camera.height + margin;
    
    if (!isOnScreen) return; // Don't create effects for off-screen hits
    
    const particleKey = isCritical ? 'crit_particle' : 'hit_particle';
    const particleColor = isCritical ? 0xffd700 : 0x00ff00;
    const particleCount = isCritical ? 6 : 3;
    const particleScale = isCritical ? 1.2 : 0.8;

    const hitParticles = this.scene.add.particles(x, y, particleKey, {
      speed: { min: 30, max: 80 },
      scale: { start: particleScale, end: 0 },
      quantity: particleCount,
      lifespan: 300,
      tint: particleColor,
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // No screen shake for regular hits, only for critical hits
    if (isCritical) {
      this.scene.cameras.main.shake(30, 0.005);
    }

    // Auto-destroy particles
    this.scene.time.delayedCall(300, () => {
      hitParticles.destroy();
    });
  }

  /**
   * Create saber slash impact effect
   */
  public createSaberImpact(x: number, y: number, isCritical: boolean = false): void {
    if (!this.enabled) return;
    
    // Check if impact is on-screen (within camera bounds + some margin)
    const camera = this.scene.cameras.main;
    const margin = 100;
    const isOnScreen = x >= camera.worldView.x - margin && 
                      x <= camera.worldView.x + camera.width + margin &&
                      y >= camera.worldView.y - margin && 
                      y <= camera.worldView.y + camera.height + margin;
    
    if (!isOnScreen) return; // Don't create effects for off-screen impacts
    
    const color = isCritical ? 0x00ffff : 0x0088ff; // Cyan for crit, blue for normal
    const particleCount = isCritical ? 10 : 6;

    const saberParticles = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 50, max: 120 },
      scale: { start: 0.6, end: 0 },
      quantity: particleCount,
      lifespan: 400,
      tint: color,
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // Light screen shake for saber hits
    this.scene.cameras.main.shake(40, 0.008);

    // Auto-destroy particles
    this.scene.time.delayedCall(400, () => {
      saberParticles.destroy();
    });
  }

  /**
   * Create force push effect
   */
  public createForceEffect(x: number, y: number): void {
    const forceParticles = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 100 },
      scale: { start: 0.4, end: 0 },
      quantity: 8,
      lifespan: 500,
      tint: 0xaa00ff, // Purple
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // Auto-destroy particles
    this.scene.time.delayedCall(500, () => {
      forceParticles.destroy();
    });
  }

  /**
   * Create level up celebration effect
   */
  public createLevelUpEffect(x: number, y: number): void {
    // Confetti-like particles
    const confettiParticles = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 60, max: 120 },
      scale: { start: 0.8, end: 0 },
      quantity: 15,
      lifespan: 1000,
      tint: [0xffd700, 0xff6b35, 0x00ff00, 0x0088ff], // Multiple colors
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // Screen shake for level up
    this.scene.cameras.main.shake(200, 0.03);

    // Auto-destroy particles
    this.scene.time.delayedCall(1000, () => {
      confettiParticles.destroy();
    });
  }

  /**
   * Create relic collection effect
   */
  public createRelicEffect(x: number, y: number): void {
    const relicParticles = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 80 },
      scale: { start: 1.0, end: 0 },
      quantity: 10,
      lifespan: 600,
      tint: 0xffd700, // Gold
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    // Gentle screen shake
    this.scene.cameras.main.shake(150, 0.02);

    // Auto-destroy particles
    this.scene.time.delayedCall(600, () => {
      relicParticles.destroy();
    });
  }

  /**
   * Create damage number floating effect
   */
  public createDamageNumber(x: number, y: number, damage: number, isCritical: boolean = false): void {
    const color = isCritical ? '#ffd700' : '#ffffff';
    const fontSize = isCritical ? '24px' : '18px';
    
    const damageText = this.scene.add.text(x, y, damage.toString(), {
      fontSize: fontSize,
      color: color,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5).setDepth(1000);

    // Animate the damage number
    this.scene.tweens.add({
      targets: damageText,
      y: y - 50,
      alpha: 0,
      scale: isCritical ? 1.5 : 1.2,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  /**
   * Enable or disable particle effects for performance
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private enabled: boolean = true;
}
