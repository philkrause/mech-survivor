import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { EnemySystem } from './EnemySystem';
import { TfighterSystem } from './TfighterSystem';
import { AtEnemySystem } from './AtEnemySystem';
import { SoundManager } from '../utils/SoundManager';

import { Player } from '../entities/Player';

export interface SaberSlashConfig {
  key: string;                // Texture key
  duration: number;           // Animation duration (ms)
  scale: number;              // Initial scale
  depth: number;              // Render depth
  basedamage: number;             // Damage dealt
  width: number;              // Hitbox width
  height: number;             // Hitbox height
  offsetX: number;           // X offset from player
  offsetY: number;           // Y offset from player
  growScale: number;         // Optional: final scale
  interval: number;          // For auto attacks
  damageMultiplier?: number; // Damage multiplier
}

export class SaberSystem {
  private scene: Phaser.Scene;
  private slashes: Phaser.GameObjects.Sprite[] = [];
  private slashTimer?: Phaser.Time.TimerEvent;
  private enemySystem: EnemySystem;
  private atEnemySystem: AtEnemySystem | null = null;
  private tfighterSystem: TfighterSystem;
  private player: Player;
  private soundManager: SoundManager;



  // DEFAULT SABER CONFIG
  private saberSlashConfig: SaberSlashConfig = {
    key: 'blue_slash',
    duration: GAME_CONFIG.SABER.PLAYER.DURATION,
    scale: GAME_CONFIG.SABER.PLAYER.SCALE,
    depth: GAME_CONFIG.SABER.PLAYER.DEPTH,
    basedamage: GAME_CONFIG.SABER.PLAYER.BASEDAMAGE,
    width: GAME_CONFIG.SABER.PLAYER.WIDTH,
    height: GAME_CONFIG.SABER.PLAYER.HEIGHT,
    offsetX: GAME_CONFIG.SABER.PLAYER.OFFSETX,
    offsetY: GAME_CONFIG.SABER.PLAYER.OFFSETY,
    interval: GAME_CONFIG.SABER.PLAYER.INTERVAL,
    growScale: GAME_CONFIG.SABER.PLAYER.GROWSCALE,
    damageMultiplier: GAME_CONFIG.SABER.PLAYER.DAMAGEMULTIPLIER,
  };


  constructor(scene: Phaser.Scene, enemySystem: EnemySystem, tfighterSystem: TfighterSystem, player: Player, soundManager: SoundManager, atEnemySystem?: AtEnemySystem) {
    this.scene = scene;
    this.enemySystem = enemySystem;
    this.tfighterSystem = tfighterSystem;
    this.player = player;
    this.soundManager = soundManager;
    this.atEnemySystem = atEnemySystem || null;
    this.slashTimer = undefined;
  }

  /**
   * Setup flamethrower animations
   */
  public static setupFlamethrowerAnimations(scene: Phaser.Scene): void {
    // Start1 animation (6 frames, plays once)
    if (!scene.anims.exists('flamethrower_start')) {
      scene.anims.create({
        key: 'flamethrower_start',
        frames: scene.anims.generateFrameNumbers('flamethrower_start', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0 // Play once
      });
    }

    // Cycle1 animation (6 frames, will be played twice)
    if (!scene.anims.exists('flamethrower_cycle')) {
      scene.anims.create({
        key: 'flamethrower_cycle',
        frames: scene.anims.generateFrameNumbers('flamethrower_cycle', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0 // We'll handle repeat manually
      });
    }

    // Finish1 animation (6 frames, plays once)
    if (!scene.anims.exists('flamethrower_finish')) {
      scene.anims.create({
        key: 'flamethrower_finish',
        frames: scene.anims.generateFrameNumbers('flamethrower_finish', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0 // Play once
      });
    }
  }

  setTfighterSystem(tfighterSystem: TfighterSystem) {
    this.tfighterSystem = tfighterSystem;
  }


  /**
   * Starts repeating flamethrower attacks.
   */
  startAutoSlash(
    getPlayerData: () => { x: number; y: number; facingLeft: boolean },
    onHit?: (hitbox: Phaser.Geom.Rectangle) => void
  ): void {
    //console.log("Star Auto Slash is called")

    if (this.slashTimer) {
      //console.log("Slash timer destroyed")
      this.slashTimer.destroy();
    }

    // Store getPlayerData function for position updates
    (this as any).getPlayerDataFn = getPlayerData;

    // Fire immediately on unlock, then continue with interval
    const { x, y, facingLeft } = getPlayerData();
    const angle = facingLeft ? Math.PI : 0;
    this.slash(x, y, angle, onHit, getPlayerData);
    // Play sound using SoundManager to respect global volume
    this.soundManager.playSound('swing', 0.15);

    // Then set up repeating timer
    this.slashTimer = this.scene.time.addEvent({
      delay: this.saberSlashConfig.interval * this.player.saberSpeedMultiplier,
      loop: true,
      callback: () => {
        const { x, y, facingLeft } = getPlayerData();
        const angle = facingLeft ? Math.PI : 0;
        this.slash(x, y, angle, onHit, getPlayerData);
        // Play sound using SoundManager to respect global volume
        this.soundManager.playSound('swing', 0.15);
      }
    });
  }

  /**
   * Triggers a single flamethrower attack sequence.
   * Sequence: Start1 -> Cycle1 (x2) -> Finish1
   */
  slash(
    x: number,
    y: number,
    angle: number,
    onHit?: (hitbox: Phaser.Geom.Rectangle) => void,
    getPlayerData?: () => { x: number; y: number; facingLeft: boolean }
  ): void {
    const flipped = angle === Math.PI;
    const offsetX = this.saberSlashConfig.offsetX * (flipped ? -1 : 1);
    const offsetY = this.saberSlashConfig.offsetY;

    // Create flamethrower sprite
    const flamethrower = this.scene.add.sprite(x + offsetX, y + offsetY, 'flamethrower_start', 0)
      .setScale(this.saberSlashConfig.scale)
      .setDepth(this.saberSlashConfig.depth)
      .setAlpha(1)
      .setFlipX(flipped);

    this.slashes.push(flamethrower);

    // Store player data function for later use
    const getPlayerDataFn = getPlayerData || (this as any).getPlayerDataFn;

    // Wait for sprite to be fully initialized before accessing dimensions
    // Use a delayed call to ensure texture is loaded
    this.scene.time.delayedCall(0, () => {
      if (!flamethrower.active || !flamethrower.texture || !flamethrower.frame) return;
      
      // Create hitbox - same dimensions as saber
      // Use displayWidth/displayHeight which accounts for scale
      const displayWidth = flamethrower.displayWidth || flamethrower.width;
      const displayHeight = flamethrower.displayHeight || flamethrower.height;
      const hitbox = new Phaser.Geom.Rectangle(
        flamethrower.x - displayWidth * 1.5,
        flamethrower.y - displayHeight / 2,
        displayWidth * 2.5,
        displayHeight
      );

      // Continue with the rest of the initialization...
      this.initializeFlamethrowerSequence(flamethrower, hitbox, onHit, getPlayerDataFn);
    });
  }

  /**
   * Initialize flamethrower attack sequence after sprite is ready
   */
  private initializeFlamethrowerSequence(
    flamethrower: Phaser.GameObjects.Sprite,
    hitbox: Phaser.Geom.Rectangle,
    onHit?: (hitbox: Phaser.Geom.Rectangle) => void,
    getPlayerData?: () => { x: number; y: number; facingLeft: boolean }
  ): void {

    // Debug graphics for hitbox (updated continuously)
    let debugGraphics: Phaser.GameObjects.Graphics | null = null;
    if (GAME_CONFIG.DEBUG) {
      debugGraphics = this.scene.add.graphics();
      debugGraphics.setDepth(1500); // Above other graphics
    }

    // Track hit enemies to prevent duplicate damage per damage tick
    const hitEnemies = new Set<Phaser.Physics.Arcade.Sprite>();
    let hitboxActive = false;
    let hitboxCheckTimer: Phaser.Time.TimerEvent | null = null;
    let updatePositionTimer: Phaser.Time.TimerEvent | null = null;

    // Store player data function to update position during attack
    const getPlayerDataFn = getPlayerData || (this as any).getPlayerDataFn;
    
    // Function to update flamethrower position to follow player
    const updateFlamethrowerPosition = () => {
      if (!flamethrower || !flamethrower.active || !getPlayerDataFn) return;
      
      // Ensure sprite is fully initialized with frame data
      if (!flamethrower.texture || !flamethrower.frame) return;
      
      const playerData = getPlayerDataFn();
      const playerOffsetX = this.saberSlashConfig.offsetX * (playerData.facingLeft ? -1 : 1);
      const playerOffsetY = this.saberSlashConfig.offsetY;
      
      flamethrower.x = playerData.x + playerOffsetX;
      flamethrower.y = playerData.y + playerOffsetY;
      flamethrower.setFlipX(playerData.facingLeft);
      
      // Update hitbox position to follow flamethrower sprite
      // Use displayWidth/displayHeight which accounts for scale
      // Make hitbox closer to sprite size (1.2x width, 1.0x height for slight overlap)
      const displayWidth = flamethrower.displayWidth || flamethrower.width;
      const displayHeight = flamethrower.displayHeight || flamethrower.height;
      
      // Calculate hitbox dimensions
      const hitboxWidth = displayWidth * 1.2; // 1.2x width for slight overlap with sprite
      const hitboxHeight = displayHeight; // Match sprite height
      
      // Center hitbox on flamethrower sprite
      // Sprite position is already offset from player, so center directly on sprite
      hitbox.x = flamethrower.x - (hitboxWidth / 2);
      hitbox.y = flamethrower.y - (hitboxHeight / 2);
      hitbox.width = hitboxWidth;
      hitbox.height = hitboxHeight;
      
      // Update debug graphics
      if (debugGraphics && GAME_CONFIG.DEBUG) {
        debugGraphics.clear();
        debugGraphics.lineStyle(2, 0xff0000, 1); // red outline
        debugGraphics.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      }
    };

    // Function to check and deal damage during hitbox active period
    const checkHitboxDamage = () => {
      // Always update position first
      updateFlamethrowerPosition();
      
      if (!hitboxActive || !flamethrower || !flamethrower.active) {
        return;
      }

      if (onHit) onHit(hitbox);

      // Get enemies in range
      const enemies = this.enemySystem.getEnemiesNear(flamethrower.x, flamethrower.y, 150);
      const tfighters = this.tfighterSystem.getEnemiesNear(flamethrower.x, flamethrower.y, 150);
      const atEnemies = this.atEnemySystem ? this.atEnemySystem.getVisibleEnemies() : [];
      const dmgData = this.calculateSlashDamage(this.saberSlashConfig);
      const dmg = dmgData.damage;
      const isCritical = dmgData.isCritical;

      // Deal damage to enemies in hitbox (avoid duplicates per frame)
      enemies.forEach((enemy) => {
        if (!hitEnemies.has(enemy) && hitbox.contains(enemy.x, enemy.y)) {
          hitEnemies.add(enemy);
          this.scene.events.emit('saber-hit', enemy.x, enemy.y, isCritical);
          this.enemySystem.damageEnemy(enemy, dmg, 0, isCritical);
          // Reset hit tracking after a short delay to allow continuous damage
          this.scene.time.delayedCall(100, () => {
            hitEnemies.delete(enemy);
          });
        }
      });

      tfighters.forEach((enemy) => {
        if (!hitEnemies.has(enemy) && hitbox.contains(enemy.x, enemy.y)) {
          hitEnemies.add(enemy);
          this.scene.events.emit('saber-hit', enemy.x, enemy.y, isCritical);
          this.tfighterSystem.damageEnemy(enemy, dmg, 0, isCritical);
          // Reset hit tracking after a short delay to allow continuous damage
          this.scene.time.delayedCall(100, () => {
            hitEnemies.delete(enemy);
          });
        }
      });

      // Deal damage to AT enemies in hitbox
      if (this.atEnemySystem) {
        atEnemies.forEach((enemy) => {
          if (!hitEnemies.has(enemy) && hitbox.contains(enemy.x, enemy.y)) {
            hitEnemies.add(enemy);
            this.scene.events.emit('saber-hit', enemy.x, enemy.y, isCritical);
            this.atEnemySystem!.damageEnemy(enemy, dmg, 0, isCritical);
            // Reset hit tracking after a short delay to allow continuous damage
            this.scene.time.delayedCall(100, () => {
              hitEnemies.delete(enemy);
            });
          }
        });
      }
    };

    // Ensure sprite is ready before starting animation
    // Wait one more frame to ensure frame data is available
    this.scene.time.delayedCall(16, () => {
      if (!flamethrower.active || !flamethrower.texture || !flamethrower.frame) return;
      
      // Play Start1 animation
      flamethrower.anims.play('flamethrower_start', false);
      
      // Start updating position to follow player (update every frame)
      updatePositionTimer = this.scene.time.addEvent({
        delay: 16, // ~60fps
        callback: updateFlamethrowerPosition,
        callbackScope: this,
        loop: true
      });
      
      // When Start1 completes, start Cycle1
      flamethrower.once('animationcomplete', () => {
      hitboxActive = true; // Activate hitbox when cycle starts
      
      // Start hitbox damage checking during Cycle1 (checks every 50ms)
      hitboxCheckTimer = this.scene.time.addEvent({
        delay: 50, // Check every 50ms for smooth continuous damage
        callback: checkHitboxDamage,
        callbackScope: this,
        loop: true
      });

      // Play Cycle1 first time
      flamethrower.anims.play('flamethrower_cycle', false);
      
      let cycleCount = 0;
      flamethrower.on('animationcomplete', () => {
        const currentAnim = flamethrower.anims.currentAnim;
        if (currentAnim && currentAnim.key === 'flamethrower_cycle') {
          cycleCount++;
          if (cycleCount < 2) {
            // Play Cycle1 second time
            flamethrower.anims.play('flamethrower_cycle', false);
          } else {
            // Both cycles done, deactivate hitbox and play Finish1
            hitboxActive = false;
            if (hitboxCheckTimer) {
              hitboxCheckTimer.destroy();
              hitboxCheckTimer = null;
            }
            // Clean up debug graphics
            if (debugGraphics) {
              debugGraphics.destroy();
              debugGraphics = null;
            }
            flamethrower.anims.play('flamethrower_finish', false);
          }
        } else if (currentAnim && currentAnim.key === 'flamethrower_finish') {
          // Finish1 complete, clean up
          if (updatePositionTimer) {
            updatePositionTimer.destroy();
            updatePositionTimer = null;
          }
          if (hitboxCheckTimer) {
            hitboxCheckTimer.destroy();
            hitboxCheckTimer = null;
          }
          // Clean up debug graphics
          if (debugGraphics) {
            debugGraphics.destroy();
            debugGraphics = null;
          }
          flamethrower.destroy();
          this.slashes = this.slashes.filter(s => s !== flamethrower);
        }
      });
    });
    });
  }

  private calculateSlashDamage(config: SaberSlashConfig): { damage: number; isCritical: boolean } {
    const base = config.basedamage;
    const damageMultiplier = this.player.saberDamageMultiplier;
    const critChance = 0.2 + this.player.saberCritChance; // Base 20% + relic bonus
    const critMultiplier = 1.5;

    let damage = (base) * damageMultiplier;
    let isCritical = false;

    if (Math.random() < critChance) {
      damage *= critMultiplier;
      isCritical = true;
    }

    return {
      damage: Math.round(damage),
      isCritical
    };
  }

  slashEffects() {

  }



  /**
   * Stops the auto slashing timer.
   */
  stopAutoSlash(): void {
    if (this.slashTimer) {
      this.slashTimer.remove(false);
      this.slashTimer = undefined;
    }
  }

  /**
   * Cleans up all slashes and timers.
   */
  cleanup(): void {
    this.slashes.forEach(s => s.destroy());
    this.slashes = [];
    this.stopAutoSlash();
  }







}
