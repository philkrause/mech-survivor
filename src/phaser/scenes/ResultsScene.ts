import Phaser from 'phaser';
import { GameStats } from '../systems/StatsTracker';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import StartScene from './StartScene';
import MainScene from './MainScene';

/**
 * Results screen showing game statistics after death
 */
export default class ResultsScene extends Phaser.Scene {
  private gameStats!: GameStats;
  private upgradeSystem!: UpgradeSystem;

  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data: { gameStats: GameStats; upgradeSystem?: UpgradeSystem }): void {
    this.gameStats = data.gameStats;
    // Get upgrade system from MainScene if available
    const mainScene = this.scene.get('MainScene') as any;
    this.upgradeSystem = data.upgradeSystem || mainScene?.upgradeSystem || null;
  }

  create(): void {
    // Use scale dimensions for proper centering (works with RESIZE mode)
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const centerX = gameWidth / 2;
    const centerY = gameHeight / 2;

    // Background
    this.add.rectangle(centerX, centerY, gameWidth, gameHeight, 0x1a2332, 1).setDepth(0);

    // Title - use proportional positioning
    const titleY = gameHeight * 0.05; // 5% from top
    this.add.text(centerX, titleY, 'RESULTS', {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setDepth(1);

    // Left panel - Game stats - use proportional positioning for mobile
    const leftPanelX = gameWidth * 0.08; // 8% from left edge
    let currentY = gameHeight * 0.15; // Start at 15% from top

    // Basic stats - use proportional spacing between labels and values
    // Values should be right-aligned at a consistent position with adequate spacing
    const valueX = gameWidth * 0.55; // 55% from left (responsive for mobile)
    
    // Calculate responsive font size based on screen width
    const baseFontSize = Math.max(24, Math.min(32, gameWidth * 0.03)); // Scale between 24-32px
    const headingFontSize = Math.max(20, Math.min(24, gameWidth * 0.025)); // Scale between 20-24px
    const rowSpacing = gameHeight * 0.05; // 5% of screen height between rows

    this.add.text(leftPanelX, currentY, 'Survived:', {
      fontSize: `${baseFontSize}px`,
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    
    const survivalMinutes = Math.floor(this.gameStats.survivalTime / 60000);
    const survivalSeconds = Math.floor((this.gameStats.survivalTime % 60000) / 1000);
    this.add.text(valueX, currentY, `${survivalMinutes}:${survivalSeconds.toString().padStart(2, '0')}`, {
      fontSize: `${baseFontSize}px`,
      color: '#ffff00'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += rowSpacing;

    this.add.text(leftPanelX, currentY, 'Level Reached:', {
      fontSize: `${baseFontSize}px`,
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(valueX, currentY, `${this.gameStats.levelReached}`, {
      fontSize: `${baseFontSize}px`,
      color: '#ffff00'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += rowSpacing;

    this.add.text(leftPanelX, currentY, 'Enemies Defeated:', {
      fontSize: `${baseFontSize}px`,
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(valueX, currentY, `${this.gameStats.enemiesDefeated}`, {
      fontSize: `${baseFontSize}px`,
      color: '#ffff00'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += rowSpacing * 1.5;

    // Weapon stats table header - use proportional column spacing for mobile
    const weaponCol1 = leftPanelX; // Weapon name (left-aligned)
    const weaponCol2 = gameWidth * 0.35; // LV (right-aligned, responsive)
    const weaponCol3 = gameWidth * 0.48; // Damage (right-aligned, responsive)
    const weaponCol4 = gameWidth * 0.62; // Time (right-aligned, responsive)
    const weaponCol5 = gameWidth * 0.75; // DPS (right-aligned, responsive)
    
    this.add.text(weaponCol1, currentY, 'Weapon', {
      fontSize: `${headingFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(weaponCol2, currentY, 'LV', {
      fontSize: `${headingFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    this.add.text(weaponCol3, currentY, 'Damage', {
      fontSize: `${headingFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    this.add.text(weaponCol4, currentY, 'Time', {
      fontSize: `${headingFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    this.add.text(weaponCol5, currentY, 'DPS', {
      fontSize: `${headingFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += rowSpacing * 0.75;

    // Weapon stats rows
    this.gameStats.weapons.forEach(weapon => {
      const damageStr = (weapon.totalDamage / 1000).toFixed(1) + 'k';
      const timeMinutes = Math.floor(weapon.activeTime / 60000);
      const timeSeconds = Math.floor((weapon.activeTime % 60000) / 1000);
      const timeStr = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
      const dpsStr = weapon.dps.toFixed(1);

      // Weapon name - use responsive width based on screen size
      const weaponNameMaxWidth = gameWidth * 0.25; // 25% of screen width
      const weaponNameText = this.add.text(weaponCol1, currentY, weapon.name, {
        fontSize: `${headingFontSize * 0.85}px`, // Slightly smaller than heading
        color: '#ffffff',
        fixedWidth: weaponNameMaxWidth
      }).setOrigin(0, 0.5);
      
      // If name is too long, truncate it
      if (weaponNameText.width > weaponNameMaxWidth) {
        const maxChars = Math.floor(weaponNameMaxWidth / (headingFontSize * 0.85 * 0.6)); // Approximate chars
        weaponNameText.setText(weapon.name.substring(0, maxChars) + '...');
      }
      
      this.add.text(weaponCol2, currentY, weapon.level > 0 ? `${weapon.level}` : '—', {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      this.add.text(weaponCol3, currentY, damageStr, {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      this.add.text(weaponCol4, currentY, timeStr, {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      this.add.text(weaponCol5, currentY, dpsStr, {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      currentY += rowSpacing * 0.5;
    });

    // Right panel - Relics (use proportional positioning for mobile)
    const rightPanelX = gameWidth * 0.82; // 82% from left (responsive)
    currentY = gameHeight * 0.15; // Start at 15% from top

    this.add.text(rightPanelX, currentY, 'Relics Found:', {
      fontSize: `${baseFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    currentY += rowSpacing;

    // Display relics - get names from upgrade system
    if (this.gameStats.relics.length === 0) {
      this.add.text(rightPanelX, currentY, 'None', {
        fontSize: `${headingFontSize}px`,
        color: '#888888'
      }).setOrigin(0, 0.5);
    } else {
      this.gameStats.relics.forEach(relicId => {
        let relicName = relicId;
        if (this.upgradeSystem) {
          const upgrade = this.upgradeSystem.getUpgradeById(relicId);
          if (upgrade) {
            relicName = upgrade.name;
          }
        }
        this.add.text(rightPanelX, currentY, `• ${relicName}`, {
          fontSize: `${headingFontSize * 0.85}px`,
          color: '#ffff00'
        }).setOrigin(0, 0.5);
        currentY += rowSpacing * 0.5;
      });
    }

    // Play Again button at bottom - use proportional positioning
    const buttonY = gameHeight * 0.9; // 90% from top
    const buttonWidth = Math.min(300, gameWidth * 0.4); // Responsive width, max 300px
    const buttonHeight = Math.min(60, gameHeight * 0.08); // Responsive height, max 60px
    const buttonFontSize = Math.max(24, Math.min(36, gameWidth * 0.035)); // Responsive font size
    
    const playAgainButton = this.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x5a9dd5, 1)
      .setStrokeStyle(4, 0xffd700)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    const playAgainText = this.add.text(centerX, buttonY, 'PLAY AGAIN', {
      fontSize: `${buttonFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(2);

    // Button interactions
    playAgainButton.on('pointerover', () => {
      playAgainButton.setFillStyle(0x6ab8e5);
      playAgainText.setStyle({ color: '#ffff00' });
    });

    playAgainButton.on('pointerout', () => {
      playAgainButton.setFillStyle(0x5a9dd5);
      playAgainText.setStyle({ color: '#ffffff' });
    });

    playAgainButton.on('pointerdown', () => {
      // Stop ResultsScene
      this.scene.stop('ResultsScene');
      
      // Stop and remove MainScene to ensure it gets fully reinitialized
      this.scene.stop('MainScene');
      if (this.scene.get('MainScene')) {
        this.scene.remove('MainScene');
      }
      
      // Re-add MainScene so StartScene can start it later (don't start it yet)
      this.scene.add('MainScene', MainScene, false);
      
      // Stop and remove StartScene if it exists
      if (this.scene.isActive('StartScene')) {
        this.scene.stop('StartScene');
      }
      if (this.scene.get('StartScene')) {
        this.scene.remove('StartScene');
      }
      
      // Re-add and start StartScene fresh (same pattern as quitToMenu in MainScene)
      this.scene.add('StartScene', StartScene, true);
    });
  }
}
