import Phaser from 'phaser';
import { DEFAULT_DIMENSIONS } from '../config/GameConfig';

/**
 * Manages loading and creating game assets
 */
export class AssetManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Preload all game assets
   */
  preloadAssets(): void {


    // ********** PLAYER (MECH) **********
    // Load mech spritesheets - both have 6 frames, 96x96 each
    this.scene.load.spritesheet('mech_attack', 'assets/images/game/mech1/Attack.png', {
      frameWidth: 96,
      frameHeight: 96
    });

    this.scene.load.spritesheet('mech_walk_attack', 'assets/images/game/mech1/Walk_attack.png', {
      frameWidth: 96,
      frameHeight: 96
    });

    // Load mech dash animation (4 frames, 384x96 = 96x96 per frame)
    this.scene.load.spritesheet('mech_dash', 'assets/images/game/mech1/Fly_up.png', {
      frameWidth: 96,
      frameHeight: 96
    });

    // Fallback image for initial sprite (first frame of Attack)
    this.scene.load.image('player', 'assets/images/game/mech1/Attack.png');

    // this.scene.load.spritesheet('player_walk_right', 'assets/images/game/luke1_walk_right_trim.png', {
    //   frameWidth: 36,
    //   frameHeight: 34
    // });


    // ************** PLAYER ATTACKS **********
    this.scene.load.image('sword', 'assets/images/game/sword_attack.png');

    this.scene.load.image('blue_slash', 'assets/images/game/blue_slash_inv.png');

    // Load Flamethrower spritesheets (6 frames each, 384x64 total = 64x64 per frame)
    this.scene.load.spritesheet('flamethrower_start', 'assets/images/game/Flamethrower/Start1.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.scene.load.spritesheet('flamethrower_cycle', 'assets/images/game/Flamethrower/Cycle1.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.scene.load.spritesheet('flamethrower_finish', 'assets/images/game/Flamethrower/Finish1.png', {
      frameWidth: 64,
      frameHeight: 64
    });

    this.scene.load.image('blaster', 'assets/images/game/laser.png');
    this.scene.load.image('enemy_laser', 'assets/images/game/laser.png'); // Same texture, different key

    this.scene.load.spritesheet('force_anim', 'assets/images/game/force_anim1.png', {
      frameWidth: 48,
      frameHeight: 41
    });


    // Load police_copter Walk spritesheet (4 frames) for Attack Chopper
    this.scene.load.spritesheet('attack_chopper', 'assets/images/game/police_copter/Walk.png', {
      frameWidth: 96,
      frameHeight: 96
    });

    // Load BattleDrone spritesheet (4 frames for walk animation)
    this.scene.load.spritesheet('battledrone', 'assets/images/game/BattleDrone/Walk.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Load T-Fighter as chopper Walk spritesheet (4 frames, 384x96 = 96x96 per frame)
    this.scene.load.spritesheet('tfighter', 'assets/images/game/Drones/chopper/Walk.png', {
      frameWidth: 96,
      frameHeight: 96
    });

    this.scene.load.image('blue_particle', 'assets/images/game/blue.png');

    // ************* EXTRAS **************
    this.scene.load.image('byoda', 'assets/images/game/coin.png');
    this.scene.load.image('skull', 'assets/images/game/skull.png');
    this.scene.load.image('health_drop', 'assets/images/game/HP_Bonus.png');
    this.scene.load.image('blaster_icon', 'assets/images/game/blaster_icon_resize.png');
    this.scene.load.image('flamethrower_icon', 'assets/images/game/saber_icon.png');

    // ************* ENEMIES **************
    this.scene.load.spritesheet('steppercannon', 'assets/images/game/StepperCannon/Walk.png', {
      frameWidth: 48,
      frameHeight: 48
    });


    // Load ShockBot Walk spritesheet (6 frames, 288x48 = 48x48 per frame)
    this.scene.load.spritesheet('soldier1', 'assets/images/game/ShockBot/Walk.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    this.scene.load.spritesheet('hover', 'assets/images/game/Drones/hover/Fire2.png', {
      frameWidth: 48,
      frameHeight: 48
    });



    this.scene.load.image('enemy', 'assets/images/game/enemy.png');

    // Load AT enemy spritesheets (roller)
    this.scene.load.spritesheet('at_enemy_walk', 'assets/images/game/roller/Walk.png', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.scene.load.spritesheet('at_enemy_attack', 'assets/images/game/roller/Attack1.png', {
      frameWidth: 96,
      frameHeight: 96
    });
    // Keep at_enemy for backward compatibility (maps to attack)
    this.scene.load.spritesheet('at_enemy', 'assets/images/game/roller/Attack1.png', {
      frameWidth: 96,
      frameHeight: 96
    });

    // Load Walker enemy spritesheets (6 frames each, 432x72 total = 72x72 per frame)
    this.scene.load.spritesheet('walker_walk', 'assets/images/game/walker/Walk.png', {
      frameWidth: 72,
      frameHeight: 72
    });
    this.scene.load.spritesheet('walker_attack', 'assets/images/game/walker/Attack1.png', {
      frameWidth: 72,
      frameHeight: 72
    });

    // ****** ENVIRONMENT *******

    // Load world background
    this.scene.load.image('background', 'assets/images/game/desertlevel1.png');
    
    // ****** PARTICLES *******

    this.scene.load.image('spark', 'assets/images/game/spark1.png');

    // Load missile image for Air Strike
    this.scene.load.image('missile', 'assets/images/game/Missile_01.png');
    
    // ****** EXPLOSIONS *******
    // Load Air Strike explosion spritesheet (10 frames, 1280x128 = 128x128 per frame)
    this.scene.load.spritesheet('explosion_airstrike', 'assets/images/game/Explosion5.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    
    // Load explosion spritesheet (10 frames, 2560x256 = 256x256 per frame)
    this.scene.load.spritesheet('explosion', 'assets/images/game/Explosion3.png', {
      frameWidth: 256,
      frameHeight: 256
    });

    // ****** EXPERIENCE GEMS *******
    this.scene.load.image('gem', 'assets/images/game/gem.png');

    // ****** RELICS & CHESTS *******
    this.scene.load.image('chest', 'assets/images/game/chest.png');
    this.scene.load.image('chest_open', 'assets/images/game/chest_open.png');
    this.scene.load.image('arrow', 'assets/images/game/arrow.png');
    this.scene.load.spritesheet('relics', 'assets/images/game/relics.png', {
      frameWidth: 16,
      frameHeight: 16
    });

    // Create upgrade icons
    this.createUpgradeIcons();
  }




  /**
   * Create the game world
   */
  createWorld(): void {
    const width = this.getCameraWidth();
    const height = this.getCameraHeight();

    const backgroundScaleFactor = 2; // Adjust the scale factor for the background

    // Add and scale the background
    this.scene.add.image(width / 2, height / 2, 'background')
      .setOrigin(0.5, 0.5) // Center the background
      .setScale(backgroundScaleFactor); // Scale the background independently

    // Background dimensions after scaling

  }


  /**
   * Create upgrade icons as textures
   */
  private createUpgradeIcons(): void {
    // Create damage icon (red sword)
    this.createIconTexture('damage_icon', 0xff0000);

    // Create attack speed icon (yellow lightning)
    this.createIconTexture('speed_icon', 0xffff00);

    // Create multi-shot icon (blue triple dots)
    this.createIconTexture('multishot_icon', 0x0000ff);

    // Create size icon (green circle)
    this.createIconTexture('size_icon', 0x00ff00);

    // Create health icon (pink heart)
    this.createIconTexture('health_icon', 0xff00ff);

    // Create movement icon (cyan boots)
    this.createIconTexture('movement_icon', 0x00ffff);

    // NOTE: flamethrower_icon is loaded from saber_icon.png file, not created programmatically
    // Create force unlock icon (purple force)
    this.createIconTexture('force_unlock_icon', 0xaa00ff);

    // Create Attack Chopper icon (silver droid)
    this.createIconTexture('attack_chopper_icon', 0xcccccc);

    // Create Combat Drone icon (orange drone)
    this.createIconTexture('combat_drone_icon', 0xff6600);

    // Create Air Strike icon (red/orange missile)
    this.createIconTexture('air_strike_icon', 0xff4400);

    // Create blaster unlock icon (red blaster)
    this.createIconTexture('blaster_unlock_icon', 0xff0000);

    // Create relic icon (golden star)
    this.createIconTexture('relic_icon', 0xffd700);
  }

  /**
   * Create a simple colored icon texture
   */
  private createIconTexture(key: string, color: number): void {
    // Skip if texture already exists
    if (this.scene.textures.exists(key)) {
      return;
    }

    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Draw a filled circle with border
    graphics.fillStyle(color, 1);
    graphics.fillCircle(32, 32, 28);

    // Add border
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.strokeCircle(32, 32, 28);

    // Generate texture
    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  /**
   * Get camera width
   */
  getCameraWidth(): number {
    return this.scene.cameras.main?.width || DEFAULT_DIMENSIONS.WIDTH;
  }

  /**
   * Get camera height
   */
  getCameraHeight(): number {
    return this.scene.cameras.main?.height || DEFAULT_DIMENSIONS.HEIGHT;
  }
} 