import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_CONFIG } from '../config/GameConfig';
/**
 * Represents an upgrade that can be chosen by the player
 */
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  apply: (player: Player) => void;
  isAvailable?: (player: Player) => boolean;
  isRelic?: boolean; // Marks this as a relic upgrade
}

/**
 * System responsible for managing available upgrades and their effects
 */
export class UpgradeSystem {
  private player: Player;
  private scene: Phaser.Scene;
  private availableUpgrades: Upgrade[] = [];
  private acquiredUpgrades: Map<string, number> = new Map();
  private fallingTweens: Phaser.Tweens.Tween[] = [];
  private spriteGroup: Phaser.GameObjects.Group; // Group to hold falling sprites
  private fallingSpritesTimer: Phaser.Time.TimerEvent | null = null; // Timer for steady stream
  private isSpawningCoins: boolean = false; // Flag to control continuous spawning
  // Group to hold falling sprites


  constructor(scene: Phaser.Scene, player: Player) {
    this.player = player;
    this.spriteGroup = scene.add.group(); // Initialize the group
    this.scene = scene;
    // Initialize available upgrades
    this.initializeUpgrades();
  }

  /**
   * Initialize the list of available upgrades
   */



  private initializeUpgrades(): void {

    // FLAMETHROWER UPGRADES
    this.availableUpgrades.push({
      id: 'saber_speed',
      name: 'Rapid Ignition System',
      description: "Increase Flamethrower fire rate by 10%",
      icon: 'saber_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseSaberSpeed(0.9);
        this.scene.events.emit('upgrade-saber');
      },
      isAvailable: (player) => player.hasSaberAbility()
    });

    this.availableUpgrades.push({
      id: 'saber_damage',
      name: 'Flamethrower Mastery',
      description: "Increase Flamethrower Damage by 15%",
      icon: 'saber_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        console.log("The increase saber damage function was called")
        player.increaseSaberDamage(0.25);  // Activate the flamethrower and set strength
      },
      isAvailable: (player) => player.hasSaberAbility()
    });

    // ** FLAMETHROWER UNLOCK **
    this.availableUpgrades.push({
      id: 'unlock_saber',
      name: 'Flamethrower Unlock',
      description: "Unlock the legendary flamethrower weapon.",
      icon: 'saber_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.unlockSaberUpgrade();
        this.scene.events.emit('upgrade-saber');
      },
      isAvailable: (player) => player.getLevel() >= GAME_CONFIG.ABILITIES.SABER_UNLOCK_LEVEL
    });

    // ** PLASMA BLAST UNLOCK **
    this.availableUpgrades.push({
      id: 'unlock_force',
      name: 'Plasma Blast System',
      description: "Damage and push back enemies with energy waves.",
      icon: 'force_unlock_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.unlockForceUpgrade();
      },
      isAvailable: (player) => player.getLevel() >= GAME_CONFIG.ABILITIES.FORCE_UNLOCK_LEVEL
    });
    // // Add attack speed upgrade
    this.availableUpgrades.push({
      id: 'force_speed',
      name: 'Plasma Accelerator',
      description: "Increase Plasma Blast fire rate by 10%",
      icon: 'speed_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseForceSpeed(0.9);  // Activate the plasma blast and set strength
      },
      isAvailable: (player) => player.hasForceAbility() // ✅ Evaluated when needed
    });

    this.availableUpgrades.push({
      id: 'force_damage',
      name: 'Plasma Mastery',
      description: "Increase Plasma Blast Damage by 15%",
      icon: 'speed_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        console.log("The increase force damage function was called")
        player.increaseForceDamage(0.25);  // Activate the plasma blast and set strength
      },
      isAvailable: (player) => player.hasForceAbility() // ✅ Evaluated when needed
    });

    // this.availableUpgrades.push({
    //   id: 'force_radius',
    //   name: 'Increase Force Radius',
    //   description: "Increase Force Radius by 15%",
    //   icon: 'speed_icon',
    //   level: 0,
    //   maxLevel: 5,
    //   apply: (player) => {
    //     console.log("The increase force radius function was called")
    //     player.increaseForceDamage(1.25);  // Activate the force and set strength
    //   },
    //   isAvailable: (player) => player.hasForceAbility() // ✅ Evaluated when needed
    // });

    // ** ATTACK CHOPPER UNLOCK **
    this.availableUpgrades.push({
      id: 'unlock_r2d2',
      name: 'Unlock Attack Chopper',
      description: "Deploys an attack chopper that damages nearby enemies.",
      icon: 'r2d2_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.unlockR2D2Upgrade();
      },
      isAvailable: (player) => player.getLevel() >= GAME_CONFIG.ABILITIES.R2D2_UNLOCK_LEVEL
    });

    this.availableUpgrades.push({
      id: 'r2d2_damage',
      name: 'Drone Combat Protocols',
      description: "Increase Attack Chopper damage by 25%.",
      icon: 'r2d2_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseR2D2Damage(.25);
      },
      isAvailable: (player) => player.hasR2D2Ability()
    });

    // ** COMBAT DRONE UNLOCK **
    this.availableUpgrades.push({
      id: 'unlock_bb8',
      name: 'Combat Drone Deploy',
      description: "Deploy a combat drone for rolling slash attacks.",
      icon: 'bb88_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.unlockBB8Upgrade();
        this.scene.events.emit('upgrade-bb8');
      },
      isAvailable: (player) => player.getLevel() >= GAME_CONFIG.ABILITIES.BB8_UNLOCK_LEVEL
    });

    // ** LASER CANNON **
    this.availableUpgrades.push({
      id: 'unlock_laser_cannon',
      name: 'Laser Cannon System',
      description: 'Unlock Laser Cannon ability - fires a devastating laser beam',
      icon: 'blaster_icon', // Using blaster icon for now
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.unlockLaserCannonUpgrade();
        this.scene.events.emit('upgrade-laser-cannon');
      },
      isAvailable: (player) => player.getLevel() >= GAME_CONFIG.ABILITIES.LASER_CANNON_UNLOCK_LEVEL && !player.hasLaserCannonAbility()
    });

    // ** COMBAT DRONE UPGRADES **
    this.availableUpgrades.push({
      id: 'bb8_speed',
      name: 'Drone Acceleration',
      description: "Increase Combat Drone attack speed by 15%.",
      icon: 'speed_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseBB8Speed(0.85); // Reduces interval by 15%
      },
      isAvailable: (player) => player.hasBB8Ability()
    });

    this.availableUpgrades.push({
      id: 'bb8_damage',
      name: 'Drone Combat Upgrade',
      description: "Increase Combat Drone damage by 25%.",
      icon: 'damage_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseBB8Damage(.25);
      },
      isAvailable: (player) => player.hasBB8Ability()
    });

    // ** BLASTER **
    this.availableUpgrades.push({
      id: 'damage',
      name: 'Blaster Calibration',
      description: 'Increase projectile damage by 25%',
      icon: 'damage_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseBlasterDamage(1.25);
      },
      isAvailable: (player) => player.hasBlasterAbility() // ✅ Evaluated when needed
    });


    //Add attack speed upgrade
    this.availableUpgrades.push({
      id: 'projectile_speed',
      name: 'Rapid Fire Training',
      description: 'Increase attack speed by 15%',
      icon: 'speed_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseBlasterSpeed(0.15);
      },
      isAvailable: (player) => player.hasBlasterAbility()
    });

    // Add projectile count upgrade
    this.availableUpgrades.push({
      id: 'projectile_count',
      name: 'Multi-Shot Module',
      description: 'Fire an additional projectile',
      icon: 'multishot_icon',
      level: 0,
      maxLevel: 10,
      apply: (player) => {
        player.increaseProjectileCount(1);
      },
      isAvailable: (player) => player.hasBlasterAbility()
    });

    //Add health upgrade
    this.availableUpgrades.push({
      id: 'max_health',
      name: 'Mech Durability',
      description: 'Increase maximum health by 20',
      icon: 'health_icon',
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseMaxHealth(20);
      },
      isAvailable: () => true // ✅ Evaluated when needed
    });

    // //Add movement speed upgrade
    this.availableUpgrades.push({
      id: 'movement_speed',
      name: 'Moon Boots',
      description: 'Increase movement speed by 15%',
      icon: 'movement_icon',
      level: 0,
      maxLevel: 3,
      apply: (player) => {
        player.increaseMovementSpeed(0.15);
      },
      isAvailable: () => true // ✅ Evaluated when needed
    });

    // ** DASH UPGRADES **
    // Dash cooldown reduction
    this.availableUpgrades.push({
      id: 'dash_cooldown',
      name: 'Dash Accelerator',
      description: 'Reduce dash cooldown by 15%',
      icon: 'movement_icon', // Using movement icon for now
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.reduceDashCooldown(0.15);
      },
      isAvailable: () => true // Available from start
    });

    // Dash speed increase
    this.availableUpgrades.push({
      id: 'dash_speed',
      name: 'Dash Booster',
      description: 'Increase dash speed by 25%',
      icon: 'movement_icon', // Using movement icon for now
      level: 0,
      maxLevel: 5,
      apply: (player) => {
        player.increaseDashSpeed(0.25);
      },
      isAvailable: () => true // Available from start
    });

    // RELIC UPGRADES - These are special items that drop from enemies
    this.availableUpgrades.push({
      id: 'jedi_robes',
      name: 'Combat Armor',
      description: 'Heavy combat armor that reduces incoming damage by 15%',
      icon: 'jedi_robes_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseDamageReduction(0.15);
      },
      isAvailable: () => true,
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'lightsaber_crystal',
      name: 'Plasma Core',
      description: 'A rare plasma core that increases flamethrower critical hit chance by 20%',
      icon: 'crystal_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseSaberCritChance(0.20);
      },
      isAvailable: (player) => player.hasSaberAbility(),
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'force_medallion',
      name: 'Plasma Amplifier',
      description: 'An amplifier that increases plasma blast damage by 25%',
      icon: 'medallion_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseForceDamage(0.25);
      },
      isAvailable: (player) => player.hasForceAbility(),
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'r2d2_upgrade',
      name: 'Attack Chopper Enhancement',
      description: 'An enhancement that increases Attack Chopper damage by 30%',
      icon: 'r2d2_upgrade_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseR2D2Damage(0.30);
      },
      isAvailable: (player) => player.hasR2D2Ability(),
      isRelic: true
    });

    // Add more creative relics focused on speed, defense, and other stats
    this.availableUpgrades.push({
      id: 'speed_boosters',
      name: 'Speed Boosters',
      description: 'Jet boots that increase movement speed by 25%',
      icon: 'speed_boosters_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseSpeed(0.25);
      },
      isAvailable: () => true,
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'armor_plating',
      name: 'Armor Plating',
      description: 'Heavy armor that increases max health by 50',
      icon: 'armor_plating_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseMaxHealth(50);
      },
      isAvailable: () => true,
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'energy_core',
      name: 'Energy Core',
      description: 'A power core that increases experience gain by 30%',
      icon: 'energy_core_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseExperienceGain(0.30);
      },
      isAvailable: () => true,
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'reflex_enhancer',
      name: 'Reflex Enhancer',
      description: 'A neural implant that increases projectile speed by 40%',
      icon: 'reflex_enhancer_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseProjectileSpeed(0.40);
      },
      isAvailable: (player) => player.hasBlasterAbility(),
      isRelic: true
    });

    this.availableUpgrades.push({
      id: 'shield_generator',
      name: 'Shield Generator',
      description: 'A personal shield that reduces damage by 20%',
      icon: 'shield_generator_icon',
      level: 0,
      maxLevel: 1,
      apply: (player) => {
        player.increaseDamageReduction(0.20);
      },
      isAvailable: () => true,
      isRelic: true
    });
  }

  /**
   * Get a random selection of upgrades to choose from
   */
  getRandomUpgrades(count: number = 4): Upgrade[] {
    // Filter upgrades that haven't reached max level and are NOT relics
    const availableUpgrades = this.availableUpgrades.filter(upgrade => {
      const currentLevel = this.acquiredUpgrades.get(upgrade.id) || 0;
      //check if the upgrade is available
      const isUnlocked = upgrade.isAvailable ? upgrade.isAvailable(this.player) : true;
      // Exclude relics from level-up screen (relics are only available from relic chests)
      const isNotRelic = !upgrade.isRelic;
      return currentLevel < upgrade.maxLevel && isUnlocked && isNotRelic;
    });

    // If no upgrades available, return empty array
    if (availableUpgrades.length === 0) {
      return [];
    }

    // Shuffle available upgrades
    const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5);

    // Return requested number of upgrades (or all if less are available)
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Apply an upgrade to the player
   */
  applyUpgrade(upgradeId: string): void {
    // Find the upgrade
    const upgrade = this.availableUpgrades.find(u => u.id === upgradeId);
    //console.log("Upgrade ID: ", upgradeId)
    if (!upgrade) {
      console.warn(`Upgrade with id ${upgradeId} not found`);
      return;
    }

    // Get current level of this upgrade
    const currentLevel = this.acquiredUpgrades.get(upgradeId) || 0;

    // Check if already at max level
    if (currentLevel >= upgrade.maxLevel) {
      console.warn(`Upgrade ${upgradeId} already at max level`);
      return;
    }

    // Apply the upgrade effect
    upgrade.apply(this.player);

    // Update acquired upgrades
    this.acquiredUpgrades.set(upgradeId, currentLevel + 1);

    // Emit event for UI to update upgrade icons
    this.scene.events.emit('upgrade-applied', upgradeId);

    //console.log(`Applied upgrade: ${upgrade.name} (Level ${currentLevel + 1})`);
  }

  /**
   * Get the current level of an upgrade
   */
  getUpgradeLevel(upgradeId: string): number {
    return this.acquiredUpgrades.get(upgradeId) || 0;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear upgrade data
    this.availableUpgrades = [];
    this.acquiredUpgrades.clear();
  }


  dropFallingSprites(scene: Phaser.Scene, spriteKey: string, count: number): boolean {
    // Stop any existing timer
    if (this.fallingSpritesTimer) {
      this.fallingSpritesTimer.remove(false);
      this.fallingSpritesTimer = null;
    }

    const cameraHeight = scene.cameras.main.height;
    const cameraWidth = scene.cameras.main.width;

    // Create a steady stream by spawning coins at regular intervals
    // Spawn coins more frequently for a dense stream
    const spawnInterval = 60; // Spawn a new coin every 60ms for dense continuous stream
    
    // Helper function to spawn a single coin
    const spawnCoin = () => {
      const camera = scene.cameras.main;

      // Random initial scale (different sizes)
      const initialScale = Phaser.Math.FloatBetween(0.08, 0.18);
      
      // For level-up screen with scrollFactor(0), use viewport coordinates (0 to camera.width/height)
      // Spawn from top of viewport (negative to start above visible)
      const startY = -50; // Start above the visible area (viewport coordinates)
      const startX = Phaser.Math.Between(0, cameraWidth); // Random X across entire screen width (viewport coordinates)
      
      // Create a sprite at a random position at the top of the viewport
      const sprite = scene.add.sprite(startX, startY, spriteKey);
      sprite.setScale(initialScale); // Start with random size
      sprite.setScrollFactor(0); // Fixed to camera viewport for level-up screen

      this.spriteGroup.add(sprite);

      // Set random spin
      sprite.setAngle(Phaser.Math.Between(0, 360)); // Random initial rotation
      
      // Random fall speed (different speeds)
      const fallSpeed = Phaser.Math.Between(4000, 8000); // Slower = longer duration
      
      // Get bottom of screen for target Y (viewport coordinates)
      const targetY = cameraHeight + 100; // Fall past the screen (viewport coordinates)
      
      // Manual animation for coins that works even when scene time is paused
      // Store animation state
      const coinState = {
        startY: startY,
        targetY: targetY,
        startScale: initialScale,
        targetScale: initialScale * 0.2,
        startTime: Date.now(),
        fallSpeed: fallSpeed,
        rotationSpeed: Phaser.Math.Between(2, 6), // Degrees per frame
        currentRotation: sprite.angle
      };
      
      (sprite as any).coinState = coinState;
      
      // Manual update function that runs independent of Phaser time
      const updateCoin = () => {
        if (!sprite.active || !(sprite as any).coinState) {
          return;
        }
        
        const state = (sprite as any).coinState;
        const elapsed = Date.now() - state.startTime;
        const progress = Math.min(elapsed / state.fallSpeed, 1);
        
        // Update position
        sprite.y = state.startY + (state.targetY - state.startY) * progress;
        
        // Update scale (shrinking as it falls)
        sprite.scale = state.startScale + (state.targetScale - state.startScale) * progress;
        
        // Update rotation
        state.currentRotation += state.rotationSpeed;
        sprite.angle = state.currentRotation;
        
        // Check if off screen or too small
        if (sprite.y > targetY || sprite.scale < 0.015 || progress >= 1) {
          if (sprite.active) {
            sprite.destroy();
          }
          return;
        }
        
        // Continue updating
        window.requestAnimationFrame(updateCoin);
      };
      
      // Start manual animation loop
      window.requestAnimationFrame(updateCoin);
    };

    // Start spawning coins continuously - use simple recursive setTimeout loop
    // This works even when scene.time.paused = true
    this.isSpawningCoins = true;
    
    const spawnLoop = () => {
      // Check if we should continue spawning
      if (!this.isSpawningCoins) {
        return; // Stop spawning
      }
      
      // Spawn a coin
      spawnCoin();
      
      // Schedule next spawn - use setTimeout to bypass scene time pause
      const timeoutId = window.setTimeout(() => {
        spawnLoop();
      }, spawnInterval);
      
      // Store timeout ID for cleanup
      if (!(this as any).fallingSpawnTimeouts) {
        (this as any).fallingSpawnTimeouts = [];
      }
      (this as any).fallingSpawnTimeouts.push(timeoutId);
    };
    
    // Start the continuous spawning loop immediately
    spawnLoop();
    
    // Create a dummy timer event just for tracking (won't be used for actual spawning)
    this.fallingSpritesTimer = scene.time.addEvent({
      delay: 999999, // Very long delay, won't fire
      callback: () => {},
      loop: false,
      startAt: 0
    } as any);
    
    // Spawn initial batch of coins immediately to fill the screen
    const initialSpawn = 30; // Spawn 30 coins immediately for immediate visual impact
    for (let i = 0; i < initialSpawn; i++) {
      // Use setTimeout to bypass scene time pause for immediate spawns
      window.setTimeout(() => {
        spawnCoin();
      }, i * 30);
    }

    return true;
  }


  stopFallingSprites(): void {
    // Stop the spawning flag
    this.isSpawningCoins = false;
    
    // Stop the timer (if it exists)
    if (this.fallingSpritesTimer) {
      this.fallingSpritesTimer.remove(false);
      this.fallingSpritesTimer = null;
    }
    
    // Clear any setTimeout-based spawn loops
    if ((this as any).fallingSpawnTimeouts) {
      (this as any).fallingSpawnTimeouts.forEach((timeoutId: number) => {
        window.clearTimeout(timeoutId);
      });
      (this as any).fallingSpawnTimeouts = [];
    }

    this.spriteGroup.clear(true, true); // Destroy all sprites in the group

    this.fallingTweens.forEach((tween) => tween.stop());
    this.fallingTweens = []; // Clear the tween references
    //console.log('All falling sprites stopped.');
  }

  /**
   * Get all available upgrades (for RelicSystem)
   */
  getAllUpgrades(): Upgrade[] {
    return this.availableUpgrades;
  }

  /**
   * Get upgrade by ID (for RelicSystem)
   */
  getUpgradeById(id: string): Upgrade | undefined {
    return this.availableUpgrades.find(upgrade => upgrade.id === id);
  }
} 