import Phaser from 'phaser';

/**
 * Configuration for projectile pools
 */
export interface ProjectileConfig {
  key: string;
  speed: number;
  lifespan: number;
  scale: number;
  damage: number;
  rotateToDirection: boolean;
  maxSize: number;
  maxCount: number;
  tint?: number;
  depth: number;
}


/**
 * Manages efficient creation and recycling of game projectiles
 * Optimized for handling hundreds of active projectiles
 */
export class ProjectileSystem {
  private scene: Phaser.Scene;
  private player: any; // Player reference for speed multiplier
  public pools: Map<string, Phaser.Physics.Arcade.Group> = new Map();
  private configs: Map<string, ProjectileConfig> = new Map();
  private vectorBuffer = new Phaser.Math.Vector2();
  private visibleProjectiles: Phaser.Physics.Arcade.Sprite[] = [];



  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Set the player reference for speed multiplier
   */
  setPlayer(player: any): void {
    this.player = player;
  }



  createPool(config: ProjectileConfig): void {
    this.configs.set(config.key, config);

    const group = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: config.maxSize,
      active: false,
      visible: false,
      key: config.key
    });

    for (let i = 0; i < config.maxSize; i++) {
      const projectile = group.create(0, 0, config.key) as Phaser.Physics.Arcade.Sprite;

      // Make sure projectile is not null before configuring
      if (projectile) {
        projectile.setActive(false);
        projectile.setVisible(false);
        projectile.setScale(config.scale);
        projectile.setDepth(config.depth);

        if (config.tint !== undefined) {
          projectile.setTint(config.tint);
        }

        if (projectile.body) {
          projectile.body.enable = false; // Disable physics body initially
          projectile.body.setSize(projectile.width, projectile.height); // Set proper body size
        }

        // Store lifespan data in a custom property
        (projectile as any).lifespan = config.lifespan;
        (projectile as any).createdAt = 0;
      }
    }


    this.pools.set(config.key, group);
  }

  // private configureProjectile(
  //   projectile: Phaser.Physics.Arcade.Sprite,
  //   config: ProjectileConfig
  // ): void {
  //   projectile.setScale(config.scale);
  //   projectile.setDepth(config.depth);

  //   if (config.tint !== undefined) {
  //     projectile.setTint(config.tint);
  //   }

  //   // Store the projectile type on the instance for later reference
  //   (projectile as any).projectileType = config.key;
  //   (projectile as any).rotateToDirection = config.rotateToDirection || false;
  // }


  fire(
    key: string,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    projectileType: string = 'blaster'
  ): Phaser.Physics.Arcade.Sprite | null {
    const group = this.pools.get(key);
    const config = this.configs.get(key);

    if (!group || !config) {
      console.log("GROUP OR CONFIG NOT FOUND", group, config);
      return null;
    }

    const projectile = group.get(x, y) as Phaser.Physics.Arcade.Sprite;
    if (!projectile) {
      console.warn("PROJECTILE IN GROUP NOT FOUND");
      return null;
    }

    // Reset and configure the projectile
    projectile.setActive(true).setVisible(true);
    projectile.setPosition(x, y); // Set position
    projectile.setTexture(config.key); // Ensure the correct texture is applied
    projectile.setScale(config.scale);
    projectile.setDepth(config.depth);
    
    // Apply tint if specified (only for non-blaster projectiles)
    // Blaster uses original red image color, so skip tint for better visibility
    if (config.tint !== undefined && key !== 'blaster') {
      projectile.setTint(config.tint);
    }
    
    if (projectile.body) {
      projectile.body.enable = true; // Enable physics body
      projectile.setVelocity(0, 0); // Reset velocity
      projectile.body.setSize(projectile.width, projectile.height); // Ensure proper body size
    }

    // Set velocity based on direction with player speed multiplier
    const dir = this.vectorBuffer.set(dirX, dirY).normalize();
    const speedMultiplier = this.player?.projectileSpeedMultiplier || 1.0;
    const finalSpeed = config.speed * speedMultiplier;
    projectile.setVelocity(dir.x * finalSpeed, dir.y * finalSpeed);

    // Set rotation if needed
    if (config.rotateToDirection) {
      projectile.setRotation(Math.atan2(dirY, dirX));
    }

    // Set custom data with damage multiplier applied
    projectile.setData('lifespan', config.lifespan);
    projectile.setData('createdAt', this.scene.time.now);
    
    // Apply damage multiplier based on projectile type
    let damageMultiplier = 1.0;
    if (this.player) {
      switch (projectileType) {
        case 'blaster':
          damageMultiplier = this.player.damageBlasterMultiplier || 1.0;
          break;
        case 'force':
          damageMultiplier = this.player.forceDamageMultiplier || 1.0;
          break;
        case 'attack_chopper':
          damageMultiplier = this.player.attackChopperDamageMultiplier || 1.0;
          break;
        case 'flamethrower':
          damageMultiplier = this.player.flamethrowerDamageMultiplier || 1.0;
          break;
      }
    }
    
    const finalDamage = (config.damage || 1) * damageMultiplier;
    projectile.setData('damage', finalDamage);

    return projectile;
  }

  update(): void {
    // Clear visible projectiles array
    this.visibleProjectiles.length = 0;
    // Get the camera's world bounds
    const cameraBounds = this.scene.cameras.main.worldView;

    // Process each projectile pool
    for (const [_, group] of this.pools) {
      const projectiles = group.getChildren();
      for (let i = 0; i < projectiles.length; i++) {
        const projectile = projectiles[i] as Phaser.Physics.Arcade.Sprite;

        // Skip inactive projectiles
        if (!projectile.active) continue;
        
        if (
          projectile.x < cameraBounds.left || // Off-screen (left)
          projectile.x > cameraBounds.right || // Off-screen (right)
          projectile.y < cameraBounds.top || // Off-screen (top)
          projectile.y > cameraBounds.bottom // Off-screen (bottom)
        ) {
          this.deactivate(projectile);
          continue;
        }

        // Add to visible projectiles array if still active and on-screen
        this.visibleProjectiles.push(projectile);
      }
    }
  }

  deactivate(projectile: Phaser.Physics.Arcade.Sprite): void {
    if (!projectile.active) {
      // If the projectile is already inactive, skip deactivation
      return;
    }

    // Clean up any visual effects
    const trail = (projectile as any).trail;
    if (trail && trail.active) {
      trail.stop();
      trail.destroy();
      (projectile as any).trail = null;
    }
    
    // Clean up trail graphics
    const trailGraphics = (projectile as any).trailGraphics;
    if (trailGraphics && trailGraphics.active) {
      trailGraphics.destroy();
      (projectile as any).trailGraphics = null;
    }
    
    // Kill any tweens on the projectile
    this.scene.tweens.killTweensOf(projectile);
    (projectile as any).trailTween = null;

    // Mark the projectile as inactive and invisible
    projectile.setActive(false).setVisible(false);

    if (projectile.body) {
      projectile.body.enable = false; // Disable physics body
      projectile.setVelocity(0, 0); // Reset velocity
    }

  }

  /**
   * Hard-kill a projectile on impact (disable body + hide immediately)
   */
  kill(projectile: Phaser.Physics.Arcade.Sprite): void {
    // Destroy trail effect if it exists
    const trail = (projectile as any).trail;
    if (trail && trail.active) {
      trail.stop();
      trail.destroy();
      (projectile as any).trail = null;
    }
    
    // Safe path: just disable body and hide, let pool reuse the sprite
    if ((projectile as any).disableBody) {
      (projectile as any).disableBody(true, true);
    }
    projectile.setActive(false).setVisible(false);
    if (projectile.body) {
      projectile.body.enable = false;
      projectile.setVelocity(0, 0);
    }
  }

  getVisibleProjectiles(): Phaser.Physics.Arcade.Sprite[] {
    return this.visibleProjectiles;
  }


  // /**
  //  * Get a specific projectile group
  //  */
  getProjectileGroup(key: string): Phaser.Physics.Arcade.Group | undefined {
    return this.pools.get(key);
  }

  // /**
  //  * Get all projectile groups
  //  */
  getAllProjectileGroups(): Phaser.Physics.Arcade.Group[] {
    return Array.from(this.pools.values());
  }

  // /**
  //  * Clean up all projectiles
  //  */
  cleanup(): void {
    for (const [_, group] of this.pools) {
      const projectiles = group.getChildren();

      for (let i = 0; i < projectiles.length; i++) {
        const projectile = projectiles[i] as Phaser.Physics.Arcade.Sprite;
        this.deactivate(projectile);
      }
    }
  }

  /**
   * Apply stress test configuration
   */
  setStressTestConfig(config: {
    maxCount: number;
  }): void {
    // Update max count for all pools
    for (const [_key, group] of this.pools) {
      if (config.maxCount > group.maxSize) {
        group.maxSize = config.maxCount;
      }
    }
  }

  /**
   * Get total projectile count across all pools
   */
  getTotalProjectileCount(): number {
    let total = 0;
    for (const [_key, group] of this.pools) {
      total += group.children.size;
    }
    return total;
  }

  /**
   * Get active projectile count across all pools
   */
  getActiveProjectileCount(): number {
    let active = 0;
    for (const [_key, group] of this.pools) {
      active += group.getTotalUsed();
    }
    return active;
  }
} 