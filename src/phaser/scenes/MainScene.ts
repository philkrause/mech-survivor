import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnemySystem } from '../systems/EnemySystem';
import { AtEnemySystem } from '../systems/AtEnemySystem';
import { WalkerEnemySystem } from '../systems/WalkerEnemySystem';
import { GameUI } from '../ui/GameUI';
import { AssetManager } from '../systems/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { SaberSystem } from '../systems/SaberSystem';
import { ForceSystem } from '../systems/ForceSystem';
import { TfighterSystem } from '../systems/TfighterSystem';

import { R2D2System } from '../systems/R2D2System';
import { BB8System } from '../systems/BB8System';
import { LaserCannonSystem } from '../systems/LaserCannonSystem';
import { RelicSystem } from '../systems/RelicSystem';
import { ParticleEffects } from '../systems/ParticleEffects';

import { ExperienceSystem } from '../systems/ExperienceSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { UpgradeUI } from '../ui/UpgradeUI';
import { PlayerStatsPanel } from '../ui/PlayerStatsPanel';
import { PauseMenu } from '../ui/PauseMenu';
import { GAME_CONFIG } from '../config/GameConfig';
import { PerformanceMonitor } from '../systems/PerformanceMonitor';
import { StressTestController } from '../systems/StressTestController';
import { SoundManager } from '../utils/SoundManager';
import { StatsTracker } from '../systems/StatsTracker';
import StartScene from './StartScene';

/**
 * Main game scene that coordinates all game systems and entities
 */
export default class MainScene extends Phaser.Scene {
  // Core systems
  private assetManager!: AssetManager;
  private player!: Player;
  private enemySystem!: EnemySystem;
  private atEnemySystem!: AtEnemySystem;
  private walkerEnemySystem!: WalkerEnemySystem;
  private projectileSystem!: ProjectileSystem;
  private tfighterSystem!: TfighterSystem;
  private forceSystem!: ForceSystem;
  private saberSystem!: SaberSystem;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private R2D2System!: R2D2System;
  private bb8System!: BB8System;
  private laserCannonSystem!: LaserCannonSystem;
  private relicSystem!: RelicSystem;
  private particleEffects!: ParticleEffects;

  private experienceSystem!: ExperienceSystem;
  private upgradeSystem!: UpgradeSystem;
  private gameUI!: GameUI;
  private upgradeUI!: UpgradeUI;
  private playerStatsPanel!: PlayerStatsPanel;
  private pauseMenu!: PauseMenu;
  private background!: Phaser.GameObjects.TileSprite;
  private soundManager!: SoundManager;
  private enemyKillCount: number = 0; // Track total enemy kills
  private statsTracker!: StatsTracker;
  
  // Stress testing systems
  private performanceMonitor!: PerformanceMonitor;
  private stressTestController!: StressTestController;
  
  // Game state
  private isPaused: boolean = false;
  private playerOverlappingEnemies: boolean = false; // Track if player is overlapping any enemy (for damage)

  // Performance tracking
  private perfText!: Phaser.GameObjects.Text;
  private lastFpsUpdate: number = 0;
  private performanceLogs: Map<string, number[]> = new Map();
  private lastPerfLogTime: number = 0;
  private music!: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: 'MainScene' });
  }

  /**
   * Preload all game assets
   */
  preload(): void {
    // Initialize asset manager and load assets
    this.assetManager = new AssetManager(this);
    this.assetManager.preloadAssets();
    this.load.audio('game', '../../../assets/audio/sw-song1.mp3');
    this.load.audio('swing', '../../../assets/audio/swing.mp3');
  }




  /**
   * Create game objects and initialize systems
   */
  create(): void {
    // stop menu music
    
    if (this.music) {
      this.music.stop();
    }


    // Create the game world
    this.assetManager = new AssetManager(this);
    this.assetManager.createWorld();

    // Get the center coordinates for player placement
    const centerX = this.assetManager.getCameraWidth() / 2;
    const centerY = this.assetManager.getCameraHeight() / 2;


    if (this.input.keyboard) {
      this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    } else {
      console.warn("Keyboard input plugin not available");
    }


    // Create a tileSprite background
    this.background = this.add.tileSprite(
      0,
      0,
      this.cameras.main.width, // Full camera width
      this.cameras.main.height, // Full camera height
      'background' // Key for the background image
    )
      .setOrigin(0) // Align the background to the top-left corner
      .setScrollFactor(0) // Keep the background static relative to the camera
      .setScale(2); // Scale the background for zoom effect


    // Initialize global volume to 0 (muted) at start - this ensures all sounds respect the default muted state
    this.sound.volume = 0;

    // music
    this.music = this.sound.add('game', {
      loop: true,     // makes it loop
      volume: 0     // Start muted
    });

    this.music.play();

    // ****** Instatiate SYSTEMS******   

    this.projectileSystem = new ProjectileSystem(this);

    this.player = new Player(this, centerX, centerY, this.projectileSystem);
    
    // Initialize sound manager for centralized volume control
    this.soundManager = new SoundManager(this);
    
    this.enemySystem = new EnemySystem(this, this.player.getSprite(), this.player);

    this.atEnemySystem = new AtEnemySystem(this, this.player.getSprite(), this.player);

    this.walkerEnemySystem = new WalkerEnemySystem(this, this.player.getSprite(), this.player);

    this.tfighterSystem = new TfighterSystem(this, this.player.getSprite(), this.player);

    // Set enemy system references for player auto-targeting
    this.player.setEnemySystems(this.enemySystem, this.atEnemySystem, this.tfighterSystem);

    this.forceSystem = new ForceSystem(this, this.enemySystem, this.tfighterSystem, this.player);

    this.R2D2System = new R2D2System(this, this.enemySystem, this.tfighterSystem, this.player);

    this.bb8System = new BB8System(this, this.enemySystem, this.tfighterSystem, this.atEnemySystem, this.player);

    this.laserCannonSystem = new LaserCannonSystem(this, this.player);

    this.saberSystem = new SaberSystem(this, this.enemySystem, this.tfighterSystem, this.player, this.soundManager, this.atEnemySystem, this.walkerEnemySystem);
    
    // Set enemy systems for laser cannon
    this.laserCannonSystem.setEnemySystems(this.enemySystem, this.atEnemySystem, this.walkerEnemySystem, this.tfighterSystem);
    
    // Setup projectile collisions immediately after systems are created
    this.setupProjectileCollisions();





    // Create player at center of screen 
    this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);



    //setup animations
    Player.setupAnimations(this);
    EnemySystem.setupEnemyAnimations(this);
    AtEnemySystem.setupAtEnemyAnimations(this);
    WalkerEnemySystem.setupWalkerAnimations(this);
    TfighterSystem.setupTfighterAnimations(this);
    R2D2System.setupR2D2Animations(this);
    BB8System.setupAnimations(this);
    SaberSystem.setupFlamethrowerAnimations(this);
    
    // Start player idle animation after animations are set up
    this.player.startIdleAnimation();
    
    //setup saber attacks - only start if player has saber ability
    this.events.on('upgrade-saber', () => {
      const playerBody = this.player.getSprite();
      this.statsTracker.startWeaponTracking('flamethrower', 'Flamethrower', 1);

      this.saberSystem.startAutoSlash(() => ({
        x: playerBody.x,
        y: playerBody.y,
        facingLeft: playerBody.flipX
      }))
    });
    
    // Setup BB-8 upgrade event listener
    this.events.on('upgrade-bb8', () => {
      if (!this.bb8System.isActive()) {
        this.bb8System.unlockAndActivate();
        this.statsTracker.startWeaponTracking('bb8', 'Combat Drone', 1);
      }
    });

    // Track weapon unlocks
    this.events.on('upgrade-force', () => {
      this.statsTracker.startWeaponTracking('force', 'Plasma Blast', 1);
    });

    this.events.on('upgrade-r2d2', () => {
      this.statsTracker.startWeaponTracking('r2d2', 'Attack Chopper', 1);
    });

    this.events.on('upgrade-laser-cannon', () => {
      this.statsTracker.startWeaponTracking('laser_cannon', 'Laser Cannon', 1);
    });

    // Track relic collection - listen for when player adds relic
    this.events.on('relic-claimed', (relicId: string) => {
      this.statsTracker.recordRelic(relicId);
    });
    




    // Create experience system
    this.experienceSystem = new ExperienceSystem(this, this.player.getSprite());

    // Connect enemy system to experience system
    this.enemySystem.setExperienceSystem(this.experienceSystem);
    this.atEnemySystem.setExperienceSystem(this.experienceSystem);
    this.walkerEnemySystem.setExperienceSystem(this.experienceSystem);
    this.tfighterSystem.setExperienceSystem(this.experienceSystem);

    // Connect AT enemy system to projectile system for shooting
    this.atEnemySystem.setProjectileSystem(this.projectileSystem);


    // Create upgrade system
    this.upgradeSystem = new UpgradeSystem(this, this.player);


    // Create game UI
    this.gameUI = new GameUI(this, this.player);

    // Listen for enemy death events to track kills
    this.events.on('enemy-death', () => {
      this.enemyKillCount++;
      this.gameUI.updateKillCount(this.enemyKillCount);
      this.statsTracker.recordKill();
    });

    // Create relic system (needs GameUI reference)
    this.relicSystem = new RelicSystem(this, this.player, this.gameUI, this.upgradeSystem);

    // Initialize stats tracker
    this.statsTracker = new StatsTracker();
    // Blaster starts unlocked
    this.statsTracker.startWeaponTracking('blaster', 'Blaster', 1);

    // Initialize particle effects system
    this.particleEffects = new ParticleEffects(this);

    // Initialize stress testing systems (only in debug mode)
    if (GAME_CONFIG.DEBUG) {
      this.performanceMonitor = new PerformanceMonitor(this);
      this.performanceMonitor.show();
    }
    
    this.stressTestController = new StressTestController(this);
    
    // Set up stress test controller with system references
    this.stressTestController.setSystemReferences(
      this.player,
      this.enemySystem,
      this.atEnemySystem,
      this.tfighterSystem,
      this.projectileSystem,
      this.experienceSystem,
      this.particleEffects,
      this.relicSystem
    );

    // Create upgrade UI
    this.upgradeUI = new UpgradeUI(this, this.upgradeSystem);
    
    // Create player stats panel
    this.playerStatsPanel = new PlayerStatsPanel(this, this.player, this.upgradeSystem);
    this.playerStatsPanel.setPosition(10, 10); // Position on left side

    // Initialize pause menu
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.resumeGame(),
      onVolumeChange: (volume: number) => this.setMusicVolume(volume),
      onQuit: () => this.quitToMenu()
    });

    // Listen for upgrade UI events
    this.events.on('show-upgrade-ui', this.showUpgradeUI, this);

    // Listen for player level up events to adjust enemy spawn rate
    this.events.on('player-level-up', this.onPlayerLevelUp, this);

    // Listen for particle effect events
    this.events.on('enemy-death', (x: number, y: number, enemyType: string) => {
      this.particleEffects.createDeathEffect(x, y, enemyType);
    });

    this.events.on('projectile-hit', (x: number, y: number, isCritical: boolean) => {
      this.particleEffects.createHitEffect(x, y, isCritical);
    });

    this.events.on('saber-hit', (x: number, y: number, isCritical: boolean) => {
      this.particleEffects.createSaberImpact(x, y, isCritical);
    });

    this.events.on('force-push', (x: number, y: number) => {
      this.particleEffects.createForceEffect(x, y);
    });

    this.events.on('level-up', (x: number, y: number) => {
      this.particleEffects.createLevelUpEffect(x, y);
    });

    this.events.on('relic-collected', (x: number, y: number) => {
      this.particleEffects.createRelicEffect(x, y);
    });

    this.events.on('damage-number', (x: number, y: number, damage: number, isCritical: boolean) => {
      this.particleEffects.createDamageNumber(x, y, damage, isCritical);
    });

    // this.events.once('player-level-5', (player: Player) => {
    // });
    

    // Add performance monitor (only in debug mode)
    if (GAME_CONFIG.DEBUG) {
      this.perfText = this.add.text(10, this.cameras.main.height - 30, 'FPS: 0', {
        fontSize: '16px',
        color: '#00ff00',
        backgroundColor: '#000000'
      });
      this.perfText.setScrollFactor(0);
    }


  }

  public setupProjectileCollisions(): void {
    // We'll use overlap instead of collider for better control
    // and only check collisions between visible enemies and player
    //console.log("Setting up projectile collisions");
    
    // Set up projectile-enemy collisions for each projectile type
    const projectileGroup = this.projectileSystem.getProjectileGroup(GAME_CONFIG.BLASTER.PLAYER.KEY);

    if (projectileGroup) {
      //console.log("Setting up projectile-enemy collisions for blaster projectiles");
      //console.log("Projectile group size:", projectileGroup.getLength());
      //console.log("Enemy group size:", this.enemySystem.getEnemyGroup().getLength());
      
      this.physics.add.overlap(
        projectileGroup,
        this.enemySystem.getEnemyGroup(),
        this.handleProjectileEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        // Only check collisions for active projectiles and enemies
        (projectile, enemy) => {
          const pActive = (projectile as Phaser.Physics.Arcade.Sprite).active;
          const eActive = (enemy as Phaser.Physics.Arcade.Sprite).active;
          return pActive && eActive;
        },
        this
      );  
    } else {
      console.error("Projectile group not found!");
    }

    if (projectileGroup) {
      this.physics.add.overlap(
        projectileGroup,
        this.tfighterSystem.getEnemyGroup(),
        this.handleProjectileTfighterCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        // Only check collisions for active projectiles and enemies
        (projectile, enemy) => {
          return (projectile as Phaser.Physics.Arcade.Sprite).active &&
            (enemy as Phaser.Physics.Arcade.Sprite).active;
        },
        this
      );
    }

    // AT enemy collision detection
    if (projectileGroup) {
      this.physics.add.overlap(
        projectileGroup,
        this.atEnemySystem.getEnemyGroup(),
        this.handleProjectileAtEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        // Only check collisions for active projectiles and enemies
        (projectile, enemy) => {
          return (projectile as Phaser.Physics.Arcade.Sprite).active &&
            (enemy as Phaser.Physics.Arcade.Sprite).active;
        },
        this
      );
    }
    
    // Set up collisions between ground-based enemies
    // AT enemies collide with regular enemies (both are ground-based)
    this.physics.add.collider(
      this.atEnemySystem.getEnemyGroup(),
      this.enemySystem.getEnemyGroup()
    );
    
    // Set up player-enemy overlap detection (for damage over time)
    // Use Phaser's optimized overlap system instead of manual iteration
    this.physics.add.overlap(
      this.player.getSprite(),
      this.enemySystem.getEnemyGroup(),
      this.handlePlayerEnemyOverlapStart as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player.getSprite(),
      this.atEnemySystem.getEnemyGroup(),
      this.handlePlayerEnemyOverlapStart as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    if (this.tfighterSystem) {
      this.physics.add.overlap(
        this.player.getSprite(),
        this.tfighterSystem.getEnemyGroup(),
        this.handlePlayerEnemyOverlapStart as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }
    
    // Set up collision detection for enemy projectiles hitting player
    const enemyProjectileGroup = this.projectileSystem.getProjectileGroup('enemy_laser');
    if (enemyProjectileGroup) {
      this.physics.add.overlap(
        enemyProjectileGroup,
        this.player.getSprite(),
        this.handleEnemyProjectilePlayerCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        (player,projectile) => {
          // Ensure both bodies are active; note: params are in the same order as overlap objs
          const projActive = (projectile as Phaser.Physics.Arcade.Sprite).active;
          const plyrActive = (player as Phaser.Physics.Arcade.Sprite).active;
          return projActive && plyrActive;
        },
        this
      );
    }
    
  }

  /**
   * Handle collision between projectile and enemy
   */
  private handleProjectileEnemyCollision(
    projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): void {
    const p = projectile as Phaser.Physics.Arcade.Sprite;
    const e = enemy as Phaser.Physics.Arcade.Sprite;


    const damage: number = p.getData('damage');
    const isCritical: boolean = p.getData('critical') ?? false;
    
    // Emit hit effect event
    this.events.emit('projectile-hit', e.x, e.y, isCritical);
    
    // Track damage for stats
    this.statsTracker.recordWeaponDamage('blaster', damage);
    
    this.enemySystem.damageEnemy(e, damage, 0, isCritical);

    this.projectileSystem.deactivate(p);
  }

  private handleProjectileTfighterCollision(
    projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): void {
    const p = projectile as Phaser.Physics.Arcade.Sprite;
    const e = enemy as Phaser.Physics.Arcade.Sprite;

    const damage: number = p.getData('damage');
    const isCritical: boolean = p.getData('critical') ?? false;
    
    // Emit hit effect event
    this.events.emit('projectile-hit', e.x, e.y, isCritical);
    
    // Track damage for stats
    this.statsTracker.recordWeaponDamage('blaster', damage);
    
    this.tfighterSystem.damageEnemy(e, damage, 0, isCritical);

    this.projectileSystem.deactivate(p);
  }

  /**
   * Handle collision between projectile and AT enemy
   */
  private handleProjectileAtEnemyCollision(
    projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): void {
    const p = projectile as Phaser.Physics.Arcade.Sprite;
    const e = enemy as Phaser.Physics.Arcade.Sprite;

    const damage: number = p.getData('damage');
    const isCritical: boolean = p.getData('critical') ?? false;
    
    // Emit hit effect event
    this.events.emit('projectile-hit', e.x, e.y, isCritical);
    
    // Track damage for stats
    this.statsTracker.recordWeaponDamage('blaster', damage);
    
    // Damage the AT enemy
    const isDead = this.atEnemySystem.damageEnemy(e, damage, 50, isCritical);
    
    if (isDead) {
      // Emit death effect event
      this.events.emit('enemy-death', e.x, e.y, 'at_enemy');
    }
    
    // Deactivate projectile
    this.projectileSystem.deactivate(p);
  }

  /**
   * Handle collision between enemy projectile and player
   */
  private handleEnemyProjectilePlayerCollision(_player: Phaser.Physics.Arcade.Sprite, projectile: Phaser.Physics.Arcade.Sprite): void {
    // Check if projectile is still active (prevent multiple hits)
    if (!projectile.active) {
      return;
    }
    
    // Deactivate the projectile IMMEDIATELY to prevent multiple hits
    this.projectileSystem.deactivate(projectile);
    
    // Deal damage to player
    const damage = 10; // AT enemy projectile damage
    this.player.takeDamage(damage);
    
    // Emit hit effect
    this.events.emit('projectile-hit', projectile.x, projectile.y, false);
  }

    
  /**
   * Handle player-enemy overlap (called by Phaser's overlap system every frame during overlap)
   * This uses Phaser's optimized spatial partitioning instead of manual iteration
   */
  private handlePlayerEnemyOverlapStart(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): void {
    const p = player as Phaser.Physics.Arcade.Sprite;
    const e = enemy as Phaser.Physics.Arcade.Sprite;
    
    // Only process if both are active
    if (!p.active || !e.active) return;
    
    // Mark that player is overlapping with at least one enemy
    // This callback fires every frame while overlapping, so flag will be set correctly
    this.playerOverlappingEnemies = true;
  }
  
  /**
   * Pre-update: Reset overlap flag before Phaser processes physics
   * Phaser will call handlePlayerEnemyOverlapStart during physics step if overlap exists
   */
  preUpdate(): void {
    // Reset overlap flag - Phaser's overlap callbacks will set it during physics step if overlap exists
    this.playerOverlappingEnemies = false;
  }
  
  /**
   * Update player overlap state (called at end of update after physics has processed)
   */
  private updatePlayerOverlapState(): void {
    // Double-check overlap state by manually verifying against all enemy groups
    // Phaser's overlap callback might have timing issues, so we verify directly
    const playerSprite = this.player.getSprite();
    let actuallyOverlapping = false;
    
    // IMPORTANT: Use physics body bounds, not sprite visual bounds
    // Sprite.getBounds() returns visual bounds, but physics bodies have different bounds!
    if (!playerSprite.body) {
      this.player.setOverlapping(false);
      return;
    }
    
    const playerBody = playerSprite.body;
    const playerBounds = new Phaser.Geom.Rectangle(
      playerBody.x,
      playerBody.y,
      playerBody.width,
      playerBody.height
    );
    
    // Check regular enemies
    const visibleEnemies = this.enemySystem.getVisibleEnemies();
    for (const enemy of visibleEnemies) {
      if (!enemy.active || !enemy.body) continue;
      
      const enemyBody = enemy.body;
      const enemyBounds = new Phaser.Geom.Rectangle(
        enemyBody.x,
        enemyBody.y,
        enemyBody.width,
        enemyBody.height
      );
      
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, enemyBounds)) {
        actuallyOverlapping = true;
        break;
      }
    }
    
    // Check AT enemies
    if (!actuallyOverlapping) {
      const atEnemies = this.atEnemySystem.getVisibleEnemies();
      for (const enemy of atEnemies) {
        if (!enemy.active || !enemy.body) continue;
        
        const enemyBody = enemy.body;
        const enemyBounds = new Phaser.Geom.Rectangle(
          enemyBody.x,
          enemyBody.y,
          enemyBody.width,
          enemyBody.height
        );
        
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, enemyBounds)) {
          actuallyOverlapping = true;
          break;
        }
      }
    }
    
    // Check Walker enemies
    if (!actuallyOverlapping) {
      const walkerEnemies = this.walkerEnemySystem.getVisibleEnemies();
      for (const enemy of walkerEnemies) {
        if (!enemy.active || !enemy.body) continue;
        
        const enemyBody = enemy.body;
        const enemyBounds = new Phaser.Geom.Rectangle(
          enemyBody.x,
          enemyBody.y,
          enemyBody.width,
          enemyBody.height
        );
        
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, enemyBounds)) {
          actuallyOverlapping = true;
          break;
        }
      }
    }
    
    // Check T-Fighters
    if (!actuallyOverlapping && this.tfighterSystem) {
      const tfighters = this.tfighterSystem.getVisibleEnemies();
      for (const enemy of tfighters) {
        if (!enemy.active || !enemy.body) continue;
        
        const enemyBody = enemy.body;
        const enemyBounds = new Phaser.Geom.Rectangle(
          enemyBody.x,
          enemyBody.y,
          enemyBody.width,
          enemyBody.height
        );
        
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, enemyBounds)) {
          actuallyOverlapping = true;
          break;
        }
      }
    }
    
    // Use manual check result (ground truth) rather than callback flag
    // This ensures accurate overlap detection even if callback timing is off
    this.player.setOverlapping(actuallyOverlapping);
  }

  /**
   * Directly check if player is overlapping with any enemies
   * This is a safety check that doesn't rely on callback timing
   */
  public isPlayerOverlappingEnemies(): boolean {
    return this.playerOverlappingEnemies;
  }
  

  /**
   * Show the upgrade UI and pause the game
   */
  private showUpgradeUI(): void {
    // Pause the game without showing pause menu
    this.pauseGameWithoutMenu();

    this.upgradeSystem.dropFallingSprites(this, "byoda", 300)
    
    // Hide health and dash bars to prevent covering level up stats
    this.gameUI.hideBars();
    
    // Show stats panel
    this.playerStatsPanel.show();
    this.playerStatsPanel.updateStats();
    
    // Show upgrade UI
    this.upgradeUI.show(3, (upgradeId: string) => {
      // Apply the selected upgrade
      if (upgradeId) {
        this.upgradeSystem.applyUpgrade(upgradeId);
      }
      
      // Update stats panel
      this.playerStatsPanel.updateStats();
      
      // Hide stats panel
      this.playerStatsPanel.hide();
      
      // Show health and dash bars again
      this.gameUI.showBars();

      this.upgradeSystem.stopFallingSprites();
      // Resume the game
      this.resumeGame();

      // Notify player that upgrade is complete
      this.player.onUpgradeSelected();
    });
  }

  /**
   * Pause the game
   */
  private pauseGame(): void {
    this.isPaused = true;

    // Pause physics
    this.physics.pause();

    // Pause all timers
    this.time.paused = true;

    // Show pause menu
    this.pauseMenu.show();
  }

  private pauseGameWithoutMenu(): void {
    this.isPaused = true;

    // Pause physics
    this.physics.pause();

    // Pause all timers
    this.time.paused = true;
  }

  /**
   * Resume the game
   */
  private resumeGame(): void {
    this.isPaused = false;

    // Resume physics
    this.physics.resume();

    // Resume all timers
    this.time.paused = false;

    // Hide pause menu
    this.pauseMenu.hide();

    // Ensure UI elements reappear
    if (this.gameUI && (this.gameUI as any).ensureUIVisible) {
      (this.gameUI as any).ensureUIVisible();
      // Force a health/exp redraw using current values
      this.gameUI.updateHealth(this.player.getHealth(), this.player.getMaxHealth());
      this.gameUI.updateExperience(this.player.getExperience(), this.player.getExperienceToNextLevel(), this.player.getLevel());
    }

    // Ensure stress test UI reappears
    if (this.stressTestController && (this.stressTestController as any).ensureUIVisible) {
      (this.stressTestController as any).ensureUIVisible();
    }
  }

  /**
   * Set music volume
   */
  private setMusicVolume(volume: number): void {
    if (this.music) {
      (this.music as Phaser.Sound.WebAudioSound).setVolume(volume);
    }
    // Store volume for future music
    this.sound.volume = volume;
  }

  /**
   * Quit to main menu
   */
  private quitToMenu(): void {
    this.pauseMenu.hide();
    this.scene.stop('MainScene');
    this.scene.remove('StartScene');
    this.scene.add('StartScene', StartScene, true);
  }

  /**as
   * Main update loop
   */
  update(time: number, _delta: number): void {

    if(this.player.isDead()) {
      return;
    }

    // Disable ESC while relic screen is open or while paused
    const relicOpen = this.relicSystem && this.relicSystem.isScreenOpen && this.relicSystem.isScreenOpen();
    if (!this.isPaused && !relicOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.pauseGame();
      }
    }



    // Skip update if game is paused
    if (this.isPaused) return;

    // Performance profiling (when enabled)
    let perfStart = 0;
    if (GAME_CONFIG.PERFORMANCE_PROFILE) {
      perfStart = performance.now();
    }

    // Update player
    this.profileSystem('player.update', () => this.player.update());

    const parallaxFactor = 0.5; // Adjust this factor to control the scrolling speed
    this.background.tilePositionX = this.cameras.main.scrollX * parallaxFactor;
    this.background.tilePositionY = this.cameras.main.scrollY * parallaxFactor;


    if (this.player.hasBlasterAbility()) {
      this.profileSystem('projectileSystem.update', () => this.projectileSystem.update());
    }

    // Update enemy systems
    this.profileSystem('enemySystem.update', () => this.enemySystem.update(time, _delta));
    this.profileSystem('atEnemySystem.update', () => this.atEnemySystem.update(time, _delta));
    this.profileSystem('walkerEnemySystem.update', () => this.walkerEnemySystem.update(time, _delta));
    this.profileSystem('tfighterSystem.update', () => this.tfighterSystem.update(time, _delta));


    // Update experience system
    this.profileSystem('experienceSystem.update', () => this.experienceSystem.update());

    // Update performance monitoring (only in debug mode)
    if (GAME_CONFIG.DEBUG && this.performanceMonitor) {
      const totalEnemies = this.enemySystem.getEnemyCount() + this.atEnemySystem.getEnemyCount() + this.walkerEnemySystem.getEnemyCount() + this.tfighterSystem.getEnemyCount();
      this.performanceMonitor.update(totalEnemies);
    }

    //Update R2D2 system
    if (this.player.hasR2D2Ability()) {
      if (!this.R2D2System.isActive()) {
        this.R2D2System.unlockAndActivate();
      }

      this.profileSystem('R2D2System.update', () => this.R2D2System.update(_delta));
    }

    //Update BB-8 system
    if (this.player.hasBB8Ability()) {
      if (!this.bb8System.isActive()) {
        this.bb8System.unlockAndActivate();
      }

      this.profileSystem('bb8System.update', () => this.bb8System.update(time, _delta));
    }

    if (this.player.hasForceAbility()) {
      this.profileSystem('forceSystem.update', () => this.forceSystem.update(time));
    }

    // Update Laser Cannon system
    if (this.player.hasLaserCannonAbility()) {
      if (!this.laserCannonSystem.isActive()) {
        this.laserCannonSystem.unlockAndActivate();
      }
      this.profileSystem('laserCannonSystem.update', () => this.laserCannonSystem.update());
    }

    // Update player overlap state (uses Phaser's optimized overlap system)
    // No manual iteration needed - Phaser handles spatial partitioning automatically
    this.updatePlayerOverlapState();

    // Update UI elements
    this.updateUI();

    // Log performance stats periodically
    if (GAME_CONFIG.PERFORMANCE_PROFILE && perfStart > 0) {
      this.logPerformanceStats(time);
    }

    // Update FPS counter every 500ms
    if (time - this.lastFpsUpdate > 500) {
      if (GAME_CONFIG.DEBUG && this.perfText) {
        this.updateFpsCounter();
      }
      this.lastFpsUpdate = time;
    }

  }

  /**
   * Update UI elements
   */
  private updateUI(): void {

    // Update enemy count
    //this.gameUI.updateEnemyCount(this.enemySystem.getEnemyCount());

    // Update player health
    this.gameUI.updateHealth(this.player.getHealth(), this.player.getMaxHealth());

    // Update dash bar
    this.gameUI.updateDashBar();

    // Update player level
    //this.gameUI.updateLevel(this.player.getLevel());

    // Update experience bards
    this.gameUI.updateExperience(
      this.player.getExperience(),
      this.player.getExperienceToNextLevel(),
      this.player.getLevel()
    );

    // Update game timer
    this.gameUI.updateTimer();
  }

  /**
   * Profile a system's update time
   */
  private profileSystem(name: string, fn: () => void): void {
    if (GAME_CONFIG.PERFORMANCE_PROFILE) {
      const start = performance.now();
      fn();
      const duration = performance.now() - start;
      
      if (!this.performanceLogs.has(name)) {
        this.performanceLogs.set(name, []);
      }
      const logs = this.performanceLogs.get(name)!;
      logs.push(duration);
      
      // Keep only last 60 samples
      if (logs.length > 60) {
        logs.shift();
      }
    } else {
      fn();
    }
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(time: number): void {
    // Log every 2 seconds
    if (time - this.lastPerfLogTime < 2000) return;
    this.lastPerfLogTime = time;

    console.group('📊 Performance Profile (Chrome/Safari comparison)');
    const stats: Array<{ name: string; avg: number; max: number; min: number }> = [];
    
    this.performanceLogs.forEach((logs, name) => {
      if (logs.length === 0) return;
      const sum = logs.reduce((a, b) => a + b, 0);
      const avg = sum / logs.length;
      const max = Math.max(...logs);
      const min = Math.min(...logs);
      stats.push({ name, avg, max, min });
    });

    // Sort by average time (descending)
    stats.sort((a, b) => b.avg - a.avg);

    stats.forEach(stat => {
      const color = stat.avg > 1 ? '🔴' : stat.avg > 0.5 ? '🟡' : '🟢';
      console.log(`${color} ${stat.name}: avg ${stat.avg.toFixed(2)}ms | max ${stat.max.toFixed(2)}ms | min ${stat.min.toFixed(2)}ms`);
    });

    const total = stats.reduce((sum, s) => sum + s.avg, 0);
    console.log(`\n📈 Total JS frame time: ~${total.toFixed(2)}ms (target: <16.67ms for 60fps)`);
    console.log(`🎯 Current FPS (estimated from JS): ${total > 0 ? Math.round(1000 / total) : 'N/A'}`);
    
    // Render statistics
    const renderStats = this.getRenderStatistics();
    console.log(`\n🎨 Rendering Statistics:`);
    console.log(`   Active Sprites: ${renderStats.activeSprites}`);
    console.log(`   Active Enemies: ${renderStats.enemies}`);
    console.log(`   Active Projectiles: ${renderStats.projectiles}`);
    console.log(`   Active Particles: ${renderStats.particles}`);
    console.log(`   Health Bars: ${renderStats.healthBars}`);
    console.log(`   Actual FPS: ${Math.round(this.game.loop.actualFps || 0)}`);
    console.log(`\n💡 If actual FPS < 60 but JS time is low, the bottleneck is in rendering!`);
    console.groupEnd();
  }

  /**
   * Get render statistics
   */
  private getRenderStatistics(): {
    activeSprites: number;
    enemies: number;
    projectiles: number;
    particles: number;
    healthBars: number;
  } {
    return {
      activeSprites: this.children.list.filter((child: any) => child.active && child.visible).length,
      enemies: (this.enemySystem?.getEnemyCount() || 0) + 
               (this.atEnemySystem?.getEnemyCount() || 0) + 
               (this.tfighterSystem?.getEnemyCount() || 0),
      projectiles: this.projectileSystem?.getActiveProjectileCount() || 0,
      particles: this.children.list.filter((child: any) => child.type === 'ParticleEmitter' && child.active).length,
      healthBars: this.children.list.filter((child: any) => child.name === 'health-bar' && child.visible).length,
    };
  }

  /**
   * Update the FPS counter (only in debug mode)
   */
  private updateFpsCounter(): void {
    if (GAME_CONFIG.DEBUG && this.perfText) {
      this.perfText.setText(`FPS: ${Math.round(this.game.loop.actualFps)} | Enemies: ${this.enemySystem.getEnemyCount()} | Level: ${this.player.getLevel()}`);
    }
  }

  /**
   * Clean up resources before scene shutdown
   */
  shutdown(): void {
    // Remove event listeners
    this.events.off('show-upgrade-ui', this.showUpgradeUI, this);
    this.events.off('player-level-up', this.onPlayerLevelUp, this);
  }

  /**
   * Handle player level up event
   */
  private onPlayerLevelUp(level: number): void {
    // Update enemy spawn rate based on new player level
    this.enemySystem.updateSpawnRate();
    this.tfighterSystem.updateSpawnRate();
    this.atEnemySystem.updateSpawnRate();
    this.walkerEnemySystem.updateSpawnRate();
    
    // Emit level up particle effect
    const playerPos = this.player.getPosition();
    this.events.emit('level-up', playerPos.x, playerPos.y);
    
    console.log(`Player reached level ${level}! Adjusting enemy spawn rate.`);
  }

  /**
   * Show results screen when player dies
   */
  showResults(): void {
    // Get player level and relics
    const playerLevel = this.player.getLevel();
    const playerRelics = (this.player as any).relics as Set<string> | undefined;
    
    // Record relics in stats tracker
    if (playerRelics) {
      playerRelics.forEach(relicId => {
        this.statsTracker.recordRelic(relicId);
      });
    }
    
    // Get final game stats
    const gameStats = this.statsTracker.getGameStats(playerLevel);
    
    // Transition to results scene
    this.scene.start('ResultsScene', { gameStats, upgradeSystem: this.upgradeSystem });
  }

  destroy(): void {
    // Clean up event listeners
    this.events.off('show-upgrade-ui', this.showUpgradeUI, this);
    
    // Clean up stress testing systems
    if (this.performanceMonitor) {
      this.performanceMonitor.hide();
    }
    if (this.stressTestController) {
      this.stressTestController.destroy();
    }
    
    // Clean up pause menu
    if (this.pauseMenu) {
      this.pauseMenu.cleanup();
    }
  }
} 