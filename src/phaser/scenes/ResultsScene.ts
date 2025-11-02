import Phaser from 'phaser';
import { GameStats } from '../systems/StatsTracker';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import StartScene from './StartScene';

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
    const cam = this.cameras.main;
    const centerX = cam.centerX;
    const centerY = cam.centerY;

    // Background
    this.add.rectangle(centerX, centerY, cam.width, cam.height, 0x1a2332, 1).setDepth(0);

    // Title
    this.add.text(centerX, 40, 'RESULTS', {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setDepth(1);

    // Left panel - Game stats
    const leftPanelX = centerX - 300;
    let currentY = 120;

    // Basic stats - use wider spacing between labels and values
    const labelWidth = 250; // Width for labels to prevent overlap
    
    this.add.text(leftPanelX, currentY, 'Survived:', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    
    const survivalMinutes = Math.floor(this.gameStats.survivalTime / 60000);
    const survivalSeconds = Math.floor((this.gameStats.survivalTime % 60000) / 1000);
    this.add.text(leftPanelX + labelWidth, currentY, `${survivalMinutes}:${survivalSeconds.toString().padStart(2, '0')}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(0, 0.5);
    currentY += 40;

    this.add.text(leftPanelX, currentY, 'Level Reached:', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(leftPanelX + labelWidth, currentY, `${this.gameStats.levelReached}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(0, 0.5);
    currentY += 40;

    this.add.text(leftPanelX, currentY, 'Enemies Defeated:', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(leftPanelX + labelWidth, currentY, `${this.gameStats.enemiesDefeated}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(0, 0.5);
    currentY += 60;

    // Weapon stats table header - adjust column spacing
    const weaponCol1 = leftPanelX; // Weapon name
    const weaponCol2 = leftPanelX + 180; // LV (more space for long weapon names)
    const weaponCol3 = leftPanelX + 210; // Damage
    const weaponCol4 = leftPanelX + 280; // Time
    const weaponCol5 = leftPanelX + 340; // DPS
    
    this.add.text(weaponCol1, currentY, 'Weapon', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(weaponCol2, currentY, 'LV', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(weaponCol3, currentY, 'Damage', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(weaponCol4, currentY, 'Time', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(weaponCol5, currentY, 'DPS', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    currentY += 30;

    // Weapon stats rows
    this.gameStats.weapons.forEach(weapon => {
      const damageStr = (weapon.totalDamage / 1000).toFixed(1) + 'k';
      const timeMinutes = Math.floor(weapon.activeTime / 60000);
      const timeSeconds = Math.floor((weapon.activeTime % 60000) / 1000);
      const timeStr = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
      const dpsStr = weapon.dps.toFixed(1);

      // Weapon name - limit width to prevent overlap
      const weaponNameText = this.add.text(weaponCol1, currentY, weapon.name, {
        fontSize: '20px',
        color: '#ffffff',
        fixedWidth: 170 // Limit width to prevent overlap with LV column
      }).setOrigin(0, 0.5);
      
      // If name is too long, truncate it
      if (weaponNameText.width > 170) {
        weaponNameText.setText(weapon.name.substring(0, 12) + '...');
      }
      
      this.add.text(weaponCol2, currentY, weapon.level > 0 ? `${weapon.level}` : '—', {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      
      this.add.text(weaponCol3, currentY, damageStr, {
        fontSize: '20px',
        color: '#ffff00'
      }).setOrigin(0, 0.5);
      
      this.add.text(weaponCol4, currentY, timeStr, {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      
      this.add.text(weaponCol5, currentY, dpsStr, {
        fontSize: '20px',
        color: '#ffff00'
      }).setOrigin(0, 0.5);
      
      currentY += 25;
    });

    // Right panel - Relics
    const rightPanelX = centerX + 150;
    currentY = 120;

    this.add.text(rightPanelX, currentY, 'Relics Found:', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    currentY += 40;

    // Display relics - get names from upgrade system
    if (this.gameStats.relics.length === 0) {
      this.add.text(rightPanelX, currentY, 'None', {
        fontSize: '24px',
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
          fontSize: '20px',
          color: '#ffff00'
        }).setOrigin(0, 0.5);
        currentY += 25;
      });
    }

    // Play Again button at bottom
    const playAgainButton = this.add.rectangle(centerX, cam.height - 80, 300, 60, 0x5a9dd5, 1)
      .setStrokeStyle(4, 0xffd700)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    const playAgainText = this.add.text(centerX, cam.height - 80, 'PLAY AGAIN', {
      fontSize: '36px',
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
      this.scene.stop('ResultsScene');
      this.scene.stop('MainScene');
      this.scene.remove('StartScene');
      this.scene.add('StartScene', StartScene, true);
    });
  }
}
