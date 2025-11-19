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
  private scanlineGraphics!: Phaser.GameObjects.Graphics;

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

    // Dark sci-fi background with red tint
    this.add.rectangle(centerX, centerY, gameWidth, gameHeight, 0x0a0a0f, 1).setDepth(0);
    
    // Add red vignette effect
    const vignette = this.add.graphics();
    vignette.fillStyle(0x330000, 0.3);
    vignette.fillRect(0, 0, gameWidth, gameHeight * 0.15); // Top
    vignette.fillRect(0, gameHeight * 0.85, gameWidth, gameHeight * 0.15); // Bottom
    vignette.setDepth(1);
    
    // Add animated scanlines
    this.scanlineGraphics = this.add.graphics();
    this.scanlineGraphics.setDepth(100);
    this.createScanlines();
    
    // Add corner brackets for tech feel
    this.createCornerBrackets(centerX, centerY, gameWidth, gameHeight);

    // Title - dramatic mech-themed with glow
    const titleY = gameHeight * 0.08; // 8% from top
    const title = this.add.text(centerX, titleY, '[ MISSION REPORT ]', {
      fontSize: '64px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#ff0000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5).setDepth(101);
    
    // Add subtitle
    this.add.text(centerX, titleY + 40, 'PILOT STATUS: K.I.A.', {
      fontSize: '24px',
      color: '#ff3333',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setDepth(101);
    
    // Pulse effect on title
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Left panel - Game stats with tech panel
    const leftPanelX = gameWidth * 0.08; // 8% from left edge
    let currentY = gameHeight * 0.20; // Start at 20% from top
    
    // Draw tech panel background
    const panelWidth = gameWidth * 0.85;
    const panelHeight = gameHeight * 0.65;
    const panelGraphics = this.add.graphics();
    panelGraphics.fillStyle(0x001a2e, 0.6);
    panelGraphics.fillRect(leftPanelX - 20, currentY - 30, panelWidth, panelHeight);
    panelGraphics.lineStyle(2, 0x00ffff, 0.8);
    panelGraphics.strokeRect(leftPanelX - 20, currentY - 30, panelWidth, panelHeight);
    panelGraphics.setDepth(2);

    // Basic stats - use proportional spacing between labels and values
    const valueX = gameWidth * 0.55; // 55% from left (responsive for mobile)
    
    // Calculate responsive font size based on screen width
    const baseFontSize = Math.max(24, Math.min(32, gameWidth * 0.03)); // Scale between 24-32px
    const headingFontSize = Math.max(20, Math.min(24, gameWidth * 0.025)); // Scale between 20-24px
    const rowSpacing = gameHeight * 0.05; // 5% of screen height between rows

    this.add.text(leftPanelX, currentY, 'TIME SURVIVED:', {
      fontSize: `${baseFontSize}px`,
      color: '#00ddff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(3);
    
    const survivalMinutes = Math.floor(this.gameStats.survivalTime / 60000);
    const survivalSeconds = Math.floor((this.gameStats.survivalTime % 60000) / 1000);
    this.add.text(valueX, currentY, `${survivalMinutes}:${survivalSeconds.toString().padStart(2, '0')}`, {
      fontSize: `${baseFontSize}px`,
      color: '#ffaa00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
    currentY += rowSpacing;

    this.add.text(leftPanelX, currentY, 'PILOT LEVEL:', {
      fontSize: `${baseFontSize}px`,
      color: '#00ddff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(3);
    this.add.text(valueX, currentY, `${this.gameStats.levelReached}`, {
      fontSize: `${baseFontSize}px`,
      color: '#ffaa00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
    currentY += rowSpacing;

    this.add.text(leftPanelX, currentY, 'HOSTILES ELIMINATED:', {
      fontSize: `${baseFontSize}px`,
      color: '#00ddff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(3);
    this.add.text(valueX, currentY, `${this.gameStats.enemiesDefeated}`, {
      fontSize: `${baseFontSize}px`,
      color: '#ffaa00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
    currentY += rowSpacing * 1.5;

    // Weapon stats table header with separator
    const weaponCol1 = leftPanelX; // Weapon name (left-aligned)
    const weaponCol2 = gameWidth * 0.35; // LV (right-aligned, responsive)
    const weaponCol3 = gameWidth * 0.48; // Damage (right-aligned, responsive)
    const weaponCol4 = gameWidth * 0.62; // Time (right-aligned, responsive)
    const weaponCol5 = gameWidth * 0.75; // DPS (right-aligned, responsive)
    
    // Draw separator line
    const separatorGraphics = this.add.graphics();
    separatorGraphics.lineStyle(2, 0x00ffff, 0.5);
    separatorGraphics.lineBetween(leftPanelX, currentY - 10, gameWidth * 0.9, currentY - 10);
    separatorGraphics.setDepth(3);
    
    this.add.text(weaponCol1, currentY, 'WEAPON SYSTEMS', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(3);
    this.add.text(weaponCol2, currentY, 'LV', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
    this.add.text(weaponCol3, currentY, 'DMG', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
    this.add.text(weaponCol4, currentY, 'TIME', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
    this.add.text(weaponCol5, currentY, 'DPS', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
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
      const weaponNameText = this.add.text(weaponCol1, currentY, weapon.name.toUpperCase(), {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#aaaaaa',
        fontFamily: 'monospace',
        fixedWidth: weaponNameMaxWidth
      }).setOrigin(0, 0.5).setDepth(3);
      
      // If name is too long, truncate it
      if (weaponNameText.width > weaponNameMaxWidth) {
        const maxChars = Math.floor(weaponNameMaxWidth / (headingFontSize * 0.85 * 0.6));
        weaponNameText.setText(weapon.name.substring(0, maxChars).toUpperCase() + '...');
      }
      
      this.add.text(weaponCol2, currentY, weapon.level > 0 ? `${weapon.level}` : '—', {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffaa00',
        fontFamily: 'monospace'
      }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
      
      this.add.text(weaponCol3, currentY, damageStr, {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffaa00',
        fontFamily: 'monospace'
      }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
      
      this.add.text(weaponCol4, currentY, timeStr, {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffaa00',
        fontFamily: 'monospace'
      }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
      
      this.add.text(weaponCol5, currentY, dpsStr, {
        fontSize: `${headingFontSize * 0.85}px`,
        color: '#ffaa00',
        fontFamily: 'monospace'
      }).setOrigin(1, 0.5).setDepth(3); // Right-aligned
      
      currentY += rowSpacing * 0.5;
    });

    // Relics section (below weapon stats)
    currentY += rowSpacing * 0.5; // Add spacing after weapons
    
    // Add separator line for relics
    const relicSeparatorGraphics = this.add.graphics();
    relicSeparatorGraphics.lineStyle(2, 0x00ffff, 0.5);
    relicSeparatorGraphics.lineBetween(leftPanelX, currentY, gameWidth * 0.9, currentY);
    relicSeparatorGraphics.setDepth(3);

    currentY += rowSpacing * 0.8; // Space after separator

    this.add.text(leftPanelX, currentY, 'RELICS ACQUIRED:', {
      fontSize: `${baseFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(3);
    currentY += rowSpacing * 0.8;

    // Display relics - get names from upgrade system
    if (this.gameStats.relics.length === 0) {
      this.add.text(leftPanelX, currentY, '[ NONE ]', {
        fontSize: `${headingFontSize}px`,
        color: '#666666',
        fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setDepth(3);
    } else {
      this.gameStats.relics.forEach(relicId => {
        let relicName = relicId;
        if (this.upgradeSystem) {
          const upgrade = this.upgradeSystem.getUpgradeById(relicId);
          if (upgrade) {
            relicName = upgrade.name;
          }
        }
        this.add.text(leftPanelX, currentY, `> ${relicName.toUpperCase()}`, {
          fontSize: `${headingFontSize * 0.85}px`,
          color: '#ffaa00',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setDepth(3);
        currentY += rowSpacing * 0.5;
      });
    }

    // Play Again button at bottom - mech-themed
    const buttonY = gameHeight * 0.92; // 92% from top
    const buttonWidth = Math.min(400, gameWidth * 0.5); // Responsive width, max 400px
    const buttonHeight = Math.min(70, gameHeight * 0.09); // Responsive height, max 70px
    const buttonFontSize = Math.max(24, Math.min(36, gameWidth * 0.035)); // Responsive font size
    
    const playAgainButton = this.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, 0x003344, 0.8)
      .setStrokeStyle(3, 0x00ffff, 1)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);

    const playAgainText = this.add.text(centerX, buttonY, '[ REDEPLOY TITAN ]', {
      fontSize: `${buttonFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(102);

    // Button interactions
    playAgainButton.on('pointerover', () => {
      playAgainButton.setFillStyle(0x005566, 1);
      playAgainButton.setStrokeStyle(3, 0xffaa00, 1);
      playAgainText.setStyle({ color: '#ffaa00' });
    });

    playAgainButton.on('pointerout', () => {
      playAgainButton.setFillStyle(0x003344, 0.8);
      playAgainButton.setStrokeStyle(3, 0x00ffff, 1);
      playAgainText.setStyle({ color: '#00ffff' });
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

  /**
   * Create animated scanlines effect
   */
  private createScanlines(): void {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    // Draw horizontal scanlines
    this.scanlineGraphics.clear();
    this.scanlineGraphics.lineStyle(1, 0x00ffff, 0.1);
    
    for (let y = 0; y < gameHeight; y += 4) {
      this.scanlineGraphics.lineBetween(0, y, gameWidth, y);
    }
    
    // Animate scanlines by pulsing alpha
    this.tweens.add({
      targets: this.scanlineGraphics,
      alpha: 0.5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Create corner brackets for tech aesthetic
   */
  private createCornerBrackets(_centerX: number, _centerY: number, gameWidth: number, gameHeight: number): void {
    const brackets = this.add.graphics();
    brackets.lineStyle(3, 0xff0000, 0.8);
    
    const cornerSize = 40;
    const margin = 20;
    
    // Top-left
    brackets.lineBetween(margin, margin, margin + cornerSize, margin);
    brackets.lineBetween(margin, margin, margin, margin + cornerSize);
    
    // Top-right
    brackets.lineBetween(gameWidth - margin, margin, gameWidth - margin - cornerSize, margin);
    brackets.lineBetween(gameWidth - margin, margin, gameWidth - margin, margin + cornerSize);
    
    // Bottom-left
    brackets.lineBetween(margin, gameHeight - margin, margin + cornerSize, gameHeight - margin);
    brackets.lineBetween(margin, gameHeight - margin, margin, gameHeight - margin - cornerSize);
    
    // Bottom-right
    brackets.lineBetween(gameWidth - margin, gameHeight - margin, gameWidth - margin - cornerSize, gameHeight - margin);
    brackets.lineBetween(gameWidth - margin, gameHeight - margin, gameWidth - margin, gameHeight - margin - cornerSize);
    
    brackets.setDepth(101);
  }
}
