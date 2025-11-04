import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/GameConfig';
import { EnemySystem } from './EnemySystem';
import { AtEnemySystem } from './AtEnemySystem';
import { WalkerEnemySystem } from './WalkerEnemySystem';
import { TfighterSystem } from './TfighterSystem';

/**
 * Laser line interface for laser cannon attacks
 */
interface LaserLine {
  graphics: Phaser.GameObjects.Graphics;
  line: Phaser.Geom.Line;
  startTime: number;
  active: boolean;
  damageTimer: Phaser.Time.TimerEvent | null;
}

/**
 * System responsible for player's laser cannon weapon
 * Similar to walker enemy laser but fires from player toward nearest enemy
 */
export class LaserCannonSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemySystem: EnemySystem | null = null;
  private atEnemySystem: AtEnemySystem | null = null;
  private walkerEnemySystem: WalkerEnemySystem | null = null;
  private tfighterSystem: TfighterSystem | null = null;
  
  private active: boolean = false;
  private fireTimer: Phaser.Time.TimerEvent | null = null;
  
  // Laser lines (active laser attacks)
  private activeLasers: LaserLine[] = [];
  
  // Track hit enemies to prevent duplicate damage per laser
  private hitEnemiesPerLaser: Map<LaserLine, WeakSet<Phaser.Physics.Arcade.Sprite>> = new Map();

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
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
   * Activate the laser cannon system
   */
  public unlockAndActivate(): void {
    if (this.active) return;
    
    this.active = true;
    this.startFiring();
  }

  /**
   * Check if laser cannon is active
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

    this.fireTimer = this.scene.time.addEvent({
      delay: GAME_CONFIG.LASER_CANNON.FIRE_INTERVAL,
      callback: () => {
        this.fireLaser();
      },
      loop: true
    });
  }

  /**
   * Fire a laser line toward nearest enemy (or in facing direction)
   */
  private fireLaser(): void {
    if (!this.active || !this.player || !this.player.getSprite()) return;
    
    // Play laser cannon sound
    // Phaser multiplies config volume by global volume automatically
    this.scene.sound.play('laser_cannon', { volume: GAME_CONFIG.SOUNDS.LASER_CANNON });

    const playerSprite = this.player.getSprite();
    const playerPos = { x: playerSprite.x, y: playerSprite.y };
    
    // Find nearest enemy
    const nearestEnemy = this.findNearestEnemy();
    
    let dirX = 0;
    let dirY = 0;
    
    if (nearestEnemy) {
      // Fire toward nearest enemy
      const dx = nearestEnemy.x - playerPos.x;
      const dy = nearestEnemy.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        dirX = dx / distance;
        dirY = dy / distance;
      }
    } else {
      // Fire in player's facing direction if no enemy
      const facingLeft = playerSprite.flipX;
      dirX = facingLeft ? -1 : 1;
      dirY = 0;
    }
    
    // Create graphics object for laser line
    const graphics = this.scene.add.graphics();
    graphics.setDepth(1501); // Above enemies
    
    // Calculate laser line length
    const camera = this.scene.cameras.main;
    const screenDiagonal = Math.sqrt(camera.width * camera.width + camera.height * camera.height);
    const laserLength = screenDiagonal * 1.5; // Extend beyond screen edges
    
    // Start position (from player center)
    const startX = playerPos.x;
    const startY = playerPos.y;
    
    // End position (extends in direction of nearest enemy or facing direction)
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
      damageTimer: null
    };
    
    this.activeLasers.push(laserLine);
    
    // Initialize hit tracking for this laser
    this.hitEnemiesPerLaser.set(laserLine, new WeakSet());
    
    // Draw initial laser line
    this.drawLaserLine(laserLine);
    
    // Check for enemy collisions
    this.checkEnemyLaserCollision(laserLine);
    
    // Auto-cleanup after duration
    this.scene.time.delayedCall(GAME_CONFIG.LASER_CANNON.LASER_DURATION, () => {
      this.cleanupLaser(laserLine);
    });
  }

  /**
   * Find the nearest enemy from all enemy systems
   */
  private findNearestEnemy(): Phaser.Physics.Arcade.Sprite | null {
    if (!this.player || !this.player.getSprite()) return null;
    
    const playerPos = this.player.getPosition();
    let nearestEnemy: Phaser.Physics.Arcade.Sprite | null = null;
    let nearestDistance = Infinity;
    
    // Check regular enemies
    if (this.enemySystem) {
      const enemies = this.enemySystem.getVisibleEnemies();
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, enemy.x, enemy.y);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }
    }
    
    // Check AT enemies
    if (this.atEnemySystem) {
      const enemies = this.atEnemySystem.getVisibleEnemies();
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, enemy.x, enemy.y);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }
    }
    
    // Check Walker enemies
    if (this.walkerEnemySystem) {
      const enemies = this.walkerEnemySystem.getVisibleEnemies();
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, enemy.x, enemy.y);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }
    }
    
    // Check T-Fighters
    if (this.tfighterSystem) {
      const enemies = this.tfighterSystem.getVisibleEnemies();
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, enemy.x, enemy.y);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }
    }
    
    return nearestEnemy;
  }

  /**
   * Draw/update laser line
   */
  private drawLaserLine(laserLine: LaserLine): void {
    if (!laserLine.active || !laserLine.graphics.active) return;
    
    const graphics = laserLine.graphics;
    const line = laserLine.line;
    
    graphics.clear();
    
    // Calculate alpha based on time remaining
    const elapsed = this.scene.time.now - laserLine.startTime;
    const remaining = GAME_CONFIG.LASER_CANNON.LASER_DURATION - elapsed;
    const alpha = Math.max(0, Math.min(1, remaining / GAME_CONFIG.LASER_CANNON.LASER_DURATION));
    
    // Draw outer blue outline (thicker)
    graphics.lineStyle(10, 0x0066ff, alpha * 0.8); // Blue outline - increased from 6 to 10
    graphics.lineBetween(line.x1, line.y1, line.x2, line.y2);
    
    // Draw inner white line (brighter)
    graphics.lineStyle(5, 0xffffff, alpha); // White core - increased from 3 to 5
    graphics.lineBetween(line.x1, line.y1, line.x2, line.y2);
  }

  /**
   * Check enemy collision with laser line and apply damage
   */
  private checkEnemyLaserCollision(laserLine: LaserLine): void {
    if (!laserLine.active) return;
    
    const hitEnemies = this.hitEnemiesPerLaser.get(laserLine) || new WeakSet();
    
    // Check all enemy types
    this.checkEnemyGroupCollision(laserLine, this.enemySystem?.getVisibleEnemies() || [], hitEnemies);
    this.checkEnemyGroupCollision(laserLine, this.atEnemySystem?.getVisibleEnemies() || [], hitEnemies);
    this.checkEnemyGroupCollision(laserLine, this.walkerEnemySystem?.getVisibleEnemies() || [], hitEnemies);
    this.checkEnemyGroupCollision(laserLine, this.tfighterSystem?.getVisibleEnemies() || [], hitEnemies);
    
    // Start damage timer if not already running
    if (!laserLine.damageTimer) {
      laserLine.damageTimer = this.scene.time.addEvent({
        delay: GAME_CONFIG.LASER_CANNON.LASER_DAMAGE_INTERVAL,
        callback: () => {
          if (!laserLine.active) {
            if (laserLine.damageTimer) {
              laserLine.damageTimer.destroy();
              laserLine.damageTimer = null;
            }
            return;
          }
          
          // Check enemies again for continuous damage
          const currentHitEnemies = this.hitEnemiesPerLaser.get(laserLine) || new WeakSet();
          this.checkEnemyGroupCollision(laserLine, this.enemySystem?.getVisibleEnemies() || [], currentHitEnemies);
          this.checkEnemyGroupCollision(laserLine, this.atEnemySystem?.getVisibleEnemies() || [], currentHitEnemies);
          this.checkEnemyGroupCollision(laserLine, this.walkerEnemySystem?.getVisibleEnemies() || [], currentHitEnemies);
          this.checkEnemyGroupCollision(laserLine, this.tfighterSystem?.getVisibleEnemies() || [], currentHitEnemies);
        },
        loop: true
      });
    }
  }

  /**
   * Check collision for a group of enemies
   */
  private checkEnemyGroupCollision(
    laserLine: LaserLine,
    enemies: Phaser.Physics.Arcade.Sprite[],
    hitEnemies: WeakSet<Phaser.Physics.Arcade.Sprite>
  ): void {
    for (const enemy of enemies) {
      if (!enemy.active || !enemy.body) continue;
      if (hitEnemies.has(enemy)) continue; // Already hit in this tick
      
      // Get enemy body bounds
      const enemyBody = enemy.body;
      const enemyBounds = new Phaser.Geom.Rectangle(
        enemyBody.x,
        enemyBody.y,
        enemyBody.width,
        enemyBody.height
      );
      
      // Check if enemy intersects with laser line
      if (Phaser.Geom.Intersects.LineToRectangle(laserLine.line, enemyBounds)) {
        hitEnemies.add(enemy);
        
        // Calculate damage (with player multipliers)
        const baseDamage = GAME_CONFIG.LASER_CANNON.LASER_DAMAGE;
        // Use blaster damage multiplier for scaling
        const blasterDamageMultiplier = (this.player.getBlasterDamage() / GAME_CONFIG.BLASTER.PLAYER.DAMAGE);
        const damage = baseDamage * blasterDamageMultiplier;
        
        // Track damage for stats
        const statsTracker = (this.scene as any).statsTracker;
        
        // Damage enemy - check which system owns it
        let damaged = false;
        if (this.enemySystem) {
          const regularEnemies = this.enemySystem.getVisibleEnemies();
          if (regularEnemies.includes(enemy)) {
            this.enemySystem.damageEnemy(enemy, damage, 0, false);
            if (statsTracker) statsTracker.recordWeaponDamage('laser_cannon', damage);
            damaged = true;
          }
        }
        
        if (!damaged && this.atEnemySystem) {
          const atEnemies = this.atEnemySystem.getVisibleEnemies();
          if (atEnemies.includes(enemy)) {
            this.atEnemySystem.damageEnemy(enemy, damage, 0, false);
            if (statsTracker) statsTracker.recordWeaponDamage('laser_cannon', damage);
            damaged = true;
          }
        }
        
        if (!damaged && this.walkerEnemySystem) {
          const walkerEnemies = this.walkerEnemySystem.getVisibleEnemies();
          if (walkerEnemies.includes(enemy)) {
            this.walkerEnemySystem.damageEnemy(enemy, damage, 0, false);
            if (statsTracker) statsTracker.recordWeaponDamage('laser_cannon', damage);
            damaged = true;
          }
        }
        
        if (!damaged && this.tfighterSystem) {
          const tfighters = this.tfighterSystem.getVisibleEnemies();
          if (tfighters.includes(enemy)) {
            this.tfighterSystem.damageEnemy(enemy, damage, 0, false);
            if (statsTracker) statsTracker.recordWeaponDamage('laser_cannon', damage);
            damaged = true;
          }
        }
        
        // Reset hit tracking after a short delay to allow continuous damage
        this.scene.time.delayedCall(GAME_CONFIG.LASER_CANNON.LASER_DAMAGE_INTERVAL / 2, () => {
          hitEnemies.delete(enemy);
        });
      }
    }
  }

  /**
   * Update all active laser lines
   */
  public update(): void {
    if (!this.active) return;
    
    const currentTime = this.scene.time.now;
    
    // Update all active lasers
    for (let i = this.activeLasers.length - 1; i >= 0; i--) {
      const laserLine = this.activeLasers[i];
      
      if (!laserLine.active) {
        this.cleanupLaser(laserLine);
        this.activeLasers.splice(i, 1);
        continue;
      }
      
      // Update laser visuals (fade out over time)
      this.drawLaserLine(laserLine);
      
      // Check if laser has expired
      const elapsed = currentTime - laserLine.startTime;
      if (elapsed >= GAME_CONFIG.LASER_CANNON.LASER_DURATION) {
        this.cleanupLaser(laserLine);
        this.activeLasers.splice(i, 1);
      }
    }
  }

  /**
   * Clean up laser line
   */
  private cleanupLaser(laserLine: LaserLine): void {
    laserLine.active = false;
    
    // Stop damage timer
    if (laserLine.damageTimer) {
      laserLine.damageTimer.destroy();
      laserLine.damageTimer = null;
    }
    
    // Destroy graphics
    if (laserLine.graphics && laserLine.graphics.active) {
      laserLine.graphics.destroy();
    }
    
    // Remove from hit tracking
    this.hitEnemiesPerLaser.delete(laserLine);
  }

  /**
   * Clean up the system
   */
  public destroy(): void {
    // Clean up all lasers
    for (const laserLine of this.activeLasers) {
      this.cleanupLaser(laserLine);
    }
    this.activeLasers = [];
    
    // Destroy fire timer
    if (this.fireTimer) {
      this.fireTimer.destroy();
      this.fireTimer = null;
    }
    
    this.active = false;
  }
}

