import Phaser from 'phaser';
import { STRESS_TEST_CONFIGS, StressTestLevel } from '../config/StressTestConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { EnemySystem } from './EnemySystem';
import { AtEnemySystem } from './AtEnemySystem';
import { TfighterSystem } from './TfighterSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { ExperienceSystem } from './ExperienceSystem';
import { ParticleEffects } from './ParticleEffects';
import { RelicSystem } from './RelicSystem';
import { Player } from '../entities/Player';

/**
 * Controller for managing stress test configurations
 */
export class StressTestController {
  private scene: Phaser.Scene;
  private currentLevel: StressTestLevel = 'NORMAL';
  private isStressTestMode: boolean = false;
  
  // System references
  private player!: Player;
  private enemySystem!: EnemySystem;
  private atEnemySystem!: AtEnemySystem;
  private tFighterSystem!: TfighterSystem;
  private projectileSystem!: ProjectileSystem;
  private experienceSystem!: ExperienceSystem;
  private particleEffects!: ParticleEffects;
  private relicSystem!: RelicSystem;

  // UI elements (removed - stress test UI is now hidden)

  // Keyboard controls
  private stressTestKeys!: {
    toggle: Phaser.Input.Keyboard.Key;
    next: Phaser.Input.Keyboard.Key;
    prev: Phaser.Input.Keyboard.Key;
    reset: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboardControls();
    this.createUI();
  }

  public setSystemReferences(
    player: Player,
    enemySystem: EnemySystem,
    atEnemySystem: AtEnemySystem,
    tFighterSystem: TfighterSystem,
    projectileSystem: ProjectileSystem,
    experienceSystem: ExperienceSystem,
    particleEffects: ParticleEffects,
    relicSystem: RelicSystem
  ): void {
    this.player = player;
    this.enemySystem = enemySystem;
    this.atEnemySystem = atEnemySystem;
    this.tFighterSystem = tFighterSystem;
    this.projectileSystem = projectileSystem;
    this.experienceSystem = experienceSystem;
    this.particleEffects = particleEffects;
    this.relicSystem = relicSystem;
  }

  private setupKeyboardControls(): void {
    this.stressTestKeys = {
      toggle: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
      next: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F2),
      prev: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F3),
      reset: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F4)
    };

    // Add event listeners
    this.stressTestKeys.toggle.on('down', () => this.toggleStressTestMode());
    this.stressTestKeys.next.on('down', () => this.nextStressLevel());
    this.stressTestKeys.prev.on('down', () => this.previousStressLevel());
    this.stressTestKeys.reset.on('down', () => this.resetToNormal());
  }

  private createUI(): void {
    // Stress test UI removed - no longer showing on screen
    // Stress test functionality still works via keyboard shortcuts but UI is hidden
  }

  public ensureUIVisible(): void {
    // UI is now hidden - stress test functionality still works via keyboard shortcuts
  }

  private updateUI(): void {
    // UI is now hidden - stress test functionality still works via keyboard shortcuts
  }

  public toggleStressTestMode(): void {
    this.isStressTestMode = !this.isStressTestMode;
    
    // Set player invulnerability based on stress test mode
    this.player.setStressTestMode(this.isStressTestMode);
    
    // Set relic system stress test mode
    this.relicSystem.setStressTestMode(this.isStressTestMode);
    
    if (this.isStressTestMode) {
      this.applyStressTestConfig();
    } else {
      this.resetToNormal();
    }
  }

  public nextStressLevel(): void {
    if (!this.isStressTestMode) return;

    const levels: StressTestLevel[] = ['NORMAL', 'MODERATE', 'HIGH', 'EXTREME', 'INSANE', 'NIGHTMARE'];
    const currentIndex = levels.indexOf(this.currentLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    
    this.currentLevel = levels[nextIndex];
    this.applyStressTestConfig();
  }

  public previousStressLevel(): void {
    if (!this.isStressTestMode) return;

    const levels: StressTestLevel[] = ['NORMAL', 'MODERATE', 'HIGH', 'EXTREME', 'INSANE', 'NIGHTMARE'];
    const currentIndex = levels.indexOf(this.currentLevel);
    const prevIndex = currentIndex === 0 ? levels.length - 1 : currentIndex - 1;
    
    this.currentLevel = levels[prevIndex];
    this.applyStressTestConfig();
  }

  public resetToNormal(): void {
    this.currentLevel = 'NORMAL';
    this.isStressTestMode = false;
    
    // Disable player invulnerability
    this.player.setStressTestMode(false);
    
    // Disable relic system stress test mode
    this.relicSystem.setStressTestMode(false);
    
    this.applyNormalConfig();
    this.updateUI();
  }

  private applyStressTestConfig(): void {
    const config = STRESS_TEST_CONFIGS[this.currentLevel];
    
    // Apply enemy system changes
    if (this.enemySystem) {
      this.enemySystem.setStressTestConfig({
        spawnInterval: config.enemySpawnInterval,
        maxCount: config.enemyMaxCount,
        healthBarsEnabled: config.healthBarsEnabled
      });
    }

    // Apply AT enemy system changes
    if (this.atEnemySystem) {
      this.atEnemySystem.setStressTestConfig({
        spawnInterval: config.atEnemySpawnInterval,
        maxCount: config.atEnemyMaxCount,
        healthBarsEnabled: config.healthBarsEnabled
      });
    }

    // Apply T-fighter system changes
    if (this.tFighterSystem) {
      this.tFighterSystem.setStressTestConfig({
        spawnInterval: config.tFighterSpawnInterval,
        maxCount: config.tFighterMaxCount
      });
    }

    // Apply projectile system changes
    if (this.projectileSystem) {
      this.projectileSystem.setStressTestConfig({
        maxCount: config.projectileMaxCount
      });
    }

    // Apply experience system changes
    if (this.experienceSystem) {
      this.experienceSystem.setStressTestConfig({
        maxCount: config.experienceOrbMaxCount
      });
    }

    // Apply particle effects changes
    if (this.particleEffects) {
      this.particleEffects.setEnabled(config.particleEffectsEnabled);
    }

    // Apply screen shake setting
    if (!config.screenShakeEnabled) {
      // Disable screen shake by overriding the method
      this.scene.cameras.main.shake = () => this.scene.cameras.main;
    }

    console.log(`Applied stress test config: ${config.name}`);
  }

  private applyNormalConfig(): void {
    // Reset to normal GAME_CONFIG values
    if (this.enemySystem) {
      this.enemySystem.setStressTestConfig({
        spawnInterval: GAME_CONFIG.ENEMY.SPAWN_INTERVAL,
        maxCount: GAME_CONFIG.ENEMY.MAX_COUNT,
        healthBarsEnabled: true
      });
    }

    // Reset AT enemy system to normal values
    if (this.atEnemySystem) {
      this.atEnemySystem.setStressTestConfig({
        spawnInterval: GAME_CONFIG.AT.SPAWN_INTERVAL, // Base interval
        maxCount: GAME_CONFIG.AT.MAX_COUNT,
        healthBarsEnabled: true
      });
      // Update spawn rate to use calculated interval based on current player level
      this.atEnemySystem.updateSpawnRate();
    }

    if (this.tFighterSystem) {
      this.tFighterSystem.setStressTestConfig({
        spawnInterval: GAME_CONFIG.TFIGHTER.SPAWN_INTERVAL,
        maxCount: GAME_CONFIG.TFIGHTER.MAX_COUNT
      });
    }

    if (this.projectileSystem) {
      this.projectileSystem.setStressTestConfig({
        maxCount: GAME_CONFIG.BLASTER.PLAYER.MAX_COUNT
      });
    }

    if (this.experienceSystem) {
      this.experienceSystem.setStressTestConfig({
        maxCount: GAME_CONFIG.EXPERIENCE_ORB.MAX_COUNT
      });
    }

    if (this.particleEffects) {
      this.particleEffects.setEnabled(true);
    }

    console.log('Reset to normal configuration');
  }

  public getCurrentLevel(): StressTestLevel {
    return this.currentLevel;
  }

  public isActive(): boolean {
    return this.isStressTestMode;
  }

  public destroy(): void {
    // UI elements removed - nothing to destroy
  }
}
