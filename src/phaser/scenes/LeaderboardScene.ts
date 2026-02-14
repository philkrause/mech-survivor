import Phaser from 'phaser';
import { LeaderboardManager } from '../systems/LeaderboardManager';

/**
 * Leaderboard Scene - Display top 10 scores
 * Styled to match the sci-fi/mech theme of the results screen
 */
export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create(): void {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    // Dark background
    this.cameras.main.setBackgroundColor(0x0a0a0f);

    // Show loading state first
    this.showLoadingState(gameWidth, gameHeight);

    // Load leaderboard data asynchronously
    this.loadLeaderboardData(gameWidth, gameHeight);
  }

  /**
   * Show loading state while fetching from Firebase
   */
  private showLoadingState(gameWidth: number, gameHeight: number): void {
    const loadingText = this.add.text(gameWidth / 2, gameHeight / 2, 'LOADING...', {
      fontSize: '32px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    // Pulse animation
    this.tweens.add({
      targets: loadingText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Store reference to remove later
    (this as any).loadingText = loadingText;
  }

  /**
   * Load leaderboard data from Firebase and display
   */
  private async loadLeaderboardData(gameWidth: number, gameHeight: number): Promise<void> {
    try {
      // Fetch leaderboard from Firebase (force refresh to get latest)
      const leaderboard = await LeaderboardManager.getLeaderboard(true);

      // Remove loading text
      if ((this as any).loadingText) {
        (this as any).loadingText.destroy();
      }

      // Display the leaderboard
      this.displayLeaderboard(gameWidth, gameHeight, leaderboard);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);

      // Remove loading text
      if ((this as any).loadingText) {
        (this as any).loadingText.destroy();
      }

      // Show error message
      this.add.text(gameWidth / 2, gameHeight / 2, 'FAILED TO LOAD LEADERBOARD\n\nCHECK YOUR CONNECTION', {
        fontSize: '24px',
        color: '#ff0000',
        fontFamily: 'monospace',
        align: 'center'
      }).setOrigin(0.5).setDepth(100);

      // Still show the UI chrome (back button, etc.)
      this.displayLeaderboard(gameWidth, gameHeight, []);
    }
  }

  /**
   * Display the leaderboard UI
   */
  private displayLeaderboard(gameWidth: number, gameHeight: number, leaderboard: any[]): void {
    // Red vignette effect
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0xff0000, 0xff0000, 0xff0000, 0xff0000, 0, 0, 0.3, 0);
    vignette.fillRect(0, 0, gameWidth, gameHeight * 0.2);
    vignette.fillGradientStyle(0xff0000, 0xff0000, 0xff0000, 0xff0000, 0.3, 0, 0, 0);
    vignette.fillRect(0, gameHeight * 0.8, gameWidth, gameHeight * 0.2);
    vignette.setDepth(1);

    // Animated scanlines
    this.createScanlines(gameWidth, gameHeight);

    // Corner brackets
    this.createCornerBrackets(gameWidth, gameHeight);

    // Responsive sizing
    const baseFontSize = Math.min(24, gameWidth * 0.025);
    const titleFontSize = Math.min(48, gameWidth * 0.05);
    const headingFontSize = Math.min(20, gameWidth * 0.02);

    // Title
    const title = this.add.text(gameWidth / 2, gameHeight * 0.08, '[ TOP PILOTS ]', {
      fontSize: `${titleFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#ff0000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(3);

    // Add pulsing effect to title
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Subtitle
    this.add.text(gameWidth / 2, gameHeight * 0.13, 'HOSTILES ELIMINATED', {
      fontSize: `${headingFontSize}px`,
      color: '#ff6600',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);

    // Tech panel for leaderboard
    const panelWidth = Math.min(700, gameWidth * 0.8);
    const panelHeight = gameHeight * 0.6;
    const panelX = gameWidth / 2 - panelWidth / 2;
    const panelY = gameHeight * 0.20;

    // Panel background (dark with slight transparency)
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x001122, 0.6);
    panelBg.fillRect(panelX, panelY, panelWidth, panelHeight);
    panelBg.setDepth(2);

    // Panel border (glowing cyan)
    const panelBorder = this.add.graphics();
    panelBorder.lineStyle(3, 0x00ffff, 0.8);
    panelBorder.strokeRect(panelX, panelY, panelWidth, panelHeight);
    panelBorder.setDepth(2);

    // Corner accents
    const cornerSize = 15;
    panelBorder.lineStyle(4, 0x00ffff, 1);
    // Top-left
    panelBorder.lineBetween(panelX, panelY, panelX + cornerSize, panelY);
    panelBorder.lineBetween(panelX, panelY, panelX, panelY + cornerSize);
    // Top-right
    panelBorder.lineBetween(panelX + panelWidth, panelY, panelX + panelWidth - cornerSize, panelY);
    panelBorder.lineBetween(panelX + panelWidth, panelY, panelX + panelWidth, panelY + cornerSize);
    // Bottom-left
    panelBorder.lineBetween(panelX, panelY + panelHeight, panelX + cornerSize, panelY + panelHeight);
    panelBorder.lineBetween(panelX, panelY + panelHeight, panelX, panelY + panelHeight - cornerSize);
    // Bottom-right
    panelBorder.lineBetween(panelX + panelWidth, panelY + panelHeight, panelX + panelWidth - cornerSize, panelY + panelHeight);
    panelBorder.lineBetween(panelX + panelWidth, panelY + panelHeight, panelX + panelWidth, panelY + panelHeight - cornerSize);

    // Display leaderboard entries
    const rowSpacing = panelHeight / 12;
    let currentY = panelY + rowSpacing * 0.8;

    // Table header
    const headerLeftX = panelX + 30;
    const headerRightX = panelX + panelWidth - 30;

    this.add.text(headerLeftX, currentY, 'RANK  PILOT', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(3);

    this.add.text(headerRightX, currentY, 'KILLS', {
      fontSize: `${headingFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(3);

    currentY += rowSpacing * 0.6;

    // Separator line
    const separatorGraphics = this.add.graphics();
    separatorGraphics.lineStyle(2, 0x00ffff, 0.5);
    separatorGraphics.lineBetween(headerLeftX, currentY, headerRightX, currentY);
    separatorGraphics.setDepth(3);

    currentY += rowSpacing * 0.6;

    // Display leaderboard entries (or empty state)
    if (leaderboard.length === 0) {
      this.add.text(gameWidth / 2, panelY + panelHeight / 2, '[ NO RECORDS YET ]\n\nBE THE FIRST TO DEFEND EARTH!', {
        fontSize: `${baseFontSize}px`,
        color: '#666666',
        fontFamily: 'monospace',
        align: 'center'
      }).setOrigin(0.5).setDepth(3);
    } else {
      leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const rankColor = rank === 1 ? '#ffaa00' : rank === 2 ? '#cccccc' : rank === 3 ? '#cd7f32' : '#00ffff';
        
        // Rank and Name
        this.add.text(headerLeftX, currentY, `${rank.toString().padStart(2, ' ')}.   ${entry.name}`, {
          fontSize: `${baseFontSize}px`,
          color: rankColor,
          fontFamily: 'monospace',
          fontStyle: rank <= 3 ? 'bold' : 'normal'
        }).setOrigin(0, 0.5).setDepth(3);

        // Kills
        this.add.text(headerRightX, currentY, entry.kills.toString(), {
          fontSize: `${baseFontSize}px`,
          color: '#ffaa00',
          fontFamily: 'monospace',
          fontStyle: rank <= 3 ? 'bold' : 'normal'
        }).setOrigin(1, 0.5).setDepth(3);

        currentY += rowSpacing * 0.85;
      });
    }

    // Back button at bottom (higher on mobile to avoid toolbar)
    const isMobile = gameWidth < 768;
    const buttonY = isMobile ? gameHeight * 0.85 : gameHeight * 0.92;
    const buttonWidth = Math.min(300, gameWidth * 0.4);
    const buttonHeight = Math.min(60, gameHeight * 0.08);
    const buttonX = gameWidth / 2 - buttonWidth / 2;

    // Button background
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x003344, 0.8);
    buttonBg.fillRoundedRect(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8);
    buttonBg.lineStyle(3, 0x00aaaa, 0.9);
    buttonBg.strokeRoundedRect(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8);
    buttonBg.setDepth(3);
    buttonBg.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    // Button text
    const buttonText = this.add.text(gameWidth / 2, buttonY, '[ BACK ]', {
      fontSize: `${Math.min(28, gameWidth * 0.03)}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(4);

    // Button hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x00ffff, 0.3);
      buttonBg.fillRoundedRect(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8);
      buttonBg.lineStyle(4, 0x00ffff, 1);
      buttonBg.strokeRoundedRect(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8);
      buttonText.setScale(1.05);
      this.game.canvas.style.cursor = 'pointer';
    });

    buttonBg.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x003344, 0.8);
      buttonBg.fillRoundedRect(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8);
      buttonBg.lineStyle(3, 0x00aaaa, 0.9);
      buttonBg.strokeRoundedRect(buttonX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8);
      buttonText.setScale(1);
      this.game.canvas.style.cursor = 'default';
    });

    buttonBg.on('pointerdown', () => {
      this.scene.start('StartScene');
    });
  }

  private createScanlines(gameWidth: number, gameHeight: number): void {
    const scanlines = this.add.graphics();
    scanlines.lineStyle(1, 0xff0000, 0.1);
    
    for (let y = 0; y < gameHeight; y += 4) {
      scanlines.lineBetween(0, y, gameWidth, y);
    }
    scanlines.setDepth(10);

    // Animate scanlines moving down
    this.tweens.add({
      targets: scanlines,
      y: 4,
      duration: 100,
      repeat: -1,
      onRepeat: () => {
        scanlines.y = 0;
      }
    });
  }

  private createCornerBrackets(gameWidth: number, gameHeight: number): void {
    const brackets = this.add.graphics();
    brackets.lineStyle(3, 0xff0000, 0.6);
    
    const size = Math.min(50, gameWidth * 0.03);
    const offset = Math.min(20, gameWidth * 0.015);

    // Top-left
    brackets.lineBetween(offset, offset, offset + size, offset);
    brackets.lineBetween(offset, offset, offset, offset + size);
    
    // Top-right
    brackets.lineBetween(gameWidth - offset, offset, gameWidth - offset - size, offset);
    brackets.lineBetween(gameWidth - offset, offset, gameWidth - offset, offset + size);
    
    // Bottom-left
    brackets.lineBetween(offset, gameHeight - offset, offset + size, gameHeight - offset);
    brackets.lineBetween(offset, gameHeight - offset, offset, gameHeight - offset - size);
    
    // Bottom-right
    brackets.lineBetween(gameWidth - offset, gameHeight - offset, gameWidth - offset - size, gameHeight - offset);
    brackets.lineBetween(gameWidth - offset, gameHeight - offset, gameWidth - offset, gameHeight - offset - size);
    
    brackets.setDepth(5);

    // Pulse animation
    this.tweens.add({
      targets: brackets,
      alpha: 0.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}

