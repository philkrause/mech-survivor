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

    // Left panel - Game stats (moved further left to use more screen width)
    const leftPanelX = 80; // Start from left edge with padding
    let currentY = 120;

    // Basic stats - use wider spacing between labels and values
    // "Enemies Defeated:" is the longest label (~300px at 32px font), so we need enough space for it
    // Values should be right-aligned at a consistent position with adequate spacing
    const valueX = leftPanelX + 450; // Fixed X position for all values (right-aligned, 450px from left to prevent overlap)
    
    this.add.text(leftPanelX, currentY, 'Survived:', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    
    const survivalMinutes = Math.floor(this.gameStats.survivalTime / 60000);
    const survivalSeconds = Math.floor((this.gameStats.survivalTime % 60000) / 1000);
    this.add.text(valueX, currentY, `${survivalMinutes}:${survivalSeconds.toString().padStart(2, '0')}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += 40;

    this.add.text(leftPanelX, currentY, 'Level Reached:', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(valueX, currentY, `${this.gameStats.levelReached}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += 40;

    this.add.text(leftPanelX, currentY, 'Enemies Defeated:', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(valueX, currentY, `${this.gameStats.enemiesDefeated}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += 60;

    // Weapon stats table header - adjust column spacing with more room to prevent overlap
    // Moved further left and increased spacing between LV and Damage columns
    const weaponCol1 = leftPanelX; // Weapon name (left-aligned)
    const weaponCol2 = leftPanelX + 180; // LV (right-aligned, more space for long weapon names)
    const weaponCol3 = weaponCol2 + 110; // Damage (right-aligned, 110px gap from LV to prevent overlap)
    const weaponCol4 = weaponCol3 + 100; // Time (right-aligned, 100px gap from Damage)
    const weaponCol5 = weaponCol4 + 90; // DPS (right-aligned, 90px gap from Time)
    
    this.add.text(weaponCol1, currentY, 'Weapon', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(weaponCol2, currentY, 'LV', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    this.add.text(weaponCol3, currentY, 'Damage', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    this.add.text(weaponCol4, currentY, 'Time', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    this.add.text(weaponCol5, currentY, 'DPS', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5); // Right-aligned
    currentY += 30;

    // Weapon stats rows
    this.gameStats.weapons.forEach(weapon => {
      const damageStr = (weapon.totalDamage / 1000).toFixed(1) + 'k';
      const timeMinutes = Math.floor(weapon.activeTime / 60000);
      const timeSeconds = Math.floor((weapon.activeTime % 60000) / 1000);
      const timeStr = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
      const dpsStr = weapon.dps.toFixed(1);

      // Weapon name - limit width to prevent overlap with LV column
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
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      this.add.text(weaponCol3, currentY, damageStr, {
        fontSize: '20px',
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      this.add.text(weaponCol4, currentY, timeStr, {
        fontSize: '20px',
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      this.add.text(weaponCol5, currentY, dpsStr, {
        fontSize: '20px',
        color: '#ffff00'
      }).setOrigin(1, 0.5); // Right-aligned
      
      currentY += 25;
    });

    // Right panel - Relics (moved further right to avoid overlap with weapon stats)
    const rightPanelX = 720; // Positioned on the right side, leaving space from weapon table
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
