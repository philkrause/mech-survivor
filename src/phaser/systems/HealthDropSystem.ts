import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * System for managing health drops that enemies can drop
 */
export class HealthDropSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private activeHealthDrops: Phaser.GameObjects.Group; // Non-physics group

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    // Create non-physics group for health drops (no physics = no conflicts)
    this.activeHealthDrops = this.scene.add.group({
      classType: Phaser.GameObjects.Sprite,
      runChildUpdate: false
    });

    // Listen for health drop events
    this.scene.events.on('health-dropped', this.spawnHealthDrop, this);
  }

  /**
   * Spawn a health drop at the specified position
   */
  private spawnHealthDrop(x: number, y: number): void {
    // Create NON-PHYSICS sprite (no physics body = no conflicts)
    const healthDrop = this.scene.add.sprite(x, y, 'health_drop');
    
    // Scale to 1/10 of original size
    healthDrop.setScale(0.1);
    healthDrop.setDepth(5);
    
    // Initialize collected flag
    healthDrop.setData('collected', false);
    
    // Store velocity for manual movement (no physics body needed)
    healthDrop.setData('vx', 0);
    healthDrop.setData('vy', 0);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: healthDrop,
      scale: { from: 0.1, to: 0.12 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add floating animation
    this.scene.tweens.add({
      targets: healthDrop,
      y: y - 10,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add to group
    this.activeHealthDrops.add(healthDrop);

    // Auto-destroy after 30 seconds if not collected
    this.scene.time.delayedCall(30000, () => {
      if (healthDrop.active) {
        healthDrop.destroy();
      }
    });
  }


  /**
   * Create visual effect when health is picked up
   */
  private createPickupEffect(x: number, y: number): void {
    // Create healing text
    const healText = this.scene.add.text(x, y, `+${GAME_CONFIG.ENEMY.HEALTH_DROP_HEAL_AMOUNT}`, {
      fontSize: '20px',
      color: '#00ff00',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });
    healText.setDepth(10);

    // Animate text upward
    this.scene.tweens.add({
      targets: healText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        healText.destroy();
      }
    });
  }

  /**
   * Update health drops (magnet effect and collection)
   */
  public update(_time?: number, delta?: number): void {
    const playerSprite = this.player.getSprite();
    if (!playerSprite) return;

    const playerX = playerSprite.x;
    const playerY = playerSprite.y;
    
    // Use same pickup and magnet radius as experience orbs
    const pickupRadius = GAME_CONFIG.PLAYER.EXPERIENCE.PICKUP_RADIUS;
    const magnetRadius = GAME_CONFIG.PLAYER.EXPERIENCE.MAGNET_RADIUS;
    
    // Use provided delta or fallback to scene delta
    const dt = delta ? delta / 1000 : (this.scene.game.loop.delta / 1000);

    // Apply magnet effect and check for collection
    this.activeHealthDrops.children.entries.forEach((drop: any) => {
      if (!drop.active || drop.getData('collected')) return;

      const dx = playerX - drop.x;
      const dy = playerY - drop.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for pickup (manual collision detection to avoid physics overlap conflicts)
      if (distance <= pickupRadius) {
        this.handleHealthPickup(drop);
        return; // Exit early to avoid processing magnet effect
      }

      // Apply magnet effect if within magnet radius (manual movement, no physics)
      if (distance < magnetRadius && distance > 0) {
        // Attract to player
        const magnetStrength = GAME_CONFIG.PLAYER.EXPERIENCE.MAGNET_SPEED;
        const angle = Math.atan2(dy, dx);
        
        // Store velocity for manual update
        drop.setData('vx', Math.cos(angle) * magnetStrength);
        drop.setData('vy', Math.sin(angle) * magnetStrength);
      } else {
        // Stop moving if far from player
        drop.setData('vx', 0);
        drop.setData('vy', 0);
      }
      
      // Apply manual movement (no physics needed)
      const vx = drop.getData('vx') || 0;
      const vy = drop.getData('vy') || 0;
      drop.x += vx * dt;
      drop.y += vy * dt;
    });
  }

  /**
   * Handle health pickup (called from update loop, not physics overlap)
   */
  private handleHealthPickup(drop: Phaser.GameObjects.Sprite): void {
    // Check if already collected (prevent multiple pickups)
    if (!drop.active || drop.getData('collected')) {
      return;
    }

    // Mark as collected immediately to prevent multiple callbacks
    drop.setData('collected', true);

    // Store position for visual effect before cleanup
    const x = drop.x;
    const y = drop.y;

    // Heal the player immediately (this is safe - it just modifies a number)
    const healAmount = GAME_CONFIG.ENEMY.HEALTH_DROP_HEAL_AMOUNT;
    this.player.heal(healAmount);

    // Visual feedback
    this.createPickupEffect(x, y);

    // Kill any tweens on this sprite
    this.scene.tweens.killTweensOf(drop);

    // Remove from group and destroy (no physics body to worry about)
    this.activeHealthDrops.remove(drop, true, true);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.activeHealthDrops.clear(true, true);
    this.scene.events.off('health-dropped', this.spawnHealthDrop, this);
  }
}

