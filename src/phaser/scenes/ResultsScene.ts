import Phaser from 'phaser';
import { GameStats } from '../systems/StatsTracker';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { LeaderboardManager } from '../systems/LeaderboardManager';
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

    // Title - dramatic mech-themed with glow (responsive for mobile)
    const isMobile = gameWidth < 768;
    const titleY = gameHeight * 0.08; // 8% from top
    const titleFontSize = isMobile ? Math.min(36, gameWidth * 0.08) : 64;
    const subtitleFontSize = isMobile ? Math.min(16, gameWidth * 0.04) : 24;
    
    const title = this.add.text(centerX, titleY, '[ MISSION REPORT ]', {
      fontSize: `${titleFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#ff0000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5).setDepth(101);
    
    // Add subtitle
    this.add.text(centerX, titleY + (isMobile ? 25 : 40), 'PILOT STATUS: K.I.A.', {
      fontSize: `${subtitleFontSize}px`,
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

    // Detect mobile
    const isMobile = gameWidth < 768;
    
    // Basic stats - use proportional spacing between labels and values
    const valueX = isMobile ? gameWidth * 0.70 : gameWidth * 0.55; // Move values further right on mobile
    
    // Calculate responsive font size based on screen width (smaller on mobile)
    const baseFontSize = isMobile ? Math.max(16, gameWidth * 0.025) : Math.max(24, Math.min(32, gameWidth * 0.03));
    const headingFontSize = isMobile ? Math.max(14, gameWidth * 0.022) : Math.max(20, Math.min(24, gameWidth * 0.025));
    const rowSpacing = isMobile ? gameHeight * 0.04 : gameHeight * 0.05; // Tighter spacing on mobile

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

    // Weapon stats table header with separator - adjust for mobile
    const weaponCol1 = leftPanelX; // Weapon name (left-aligned)
    const weaponCol2 = isMobile ? gameWidth * 0.42 : gameWidth * 0.35; // LV
    const weaponCol3 = isMobile ? gameWidth * 0.58 : gameWidth * 0.48; // Damage
    const weaponCol4 = isMobile ? gameWidth * 0.72 : gameWidth * 0.62; // Time
    const weaponCol5 = isMobile ? gameWidth * 0.86 : gameWidth * 0.75; // DPS
    
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

    // Check if player qualifies for leaderboard (top 10) - async
    this.checkLeaderboardQualification(centerX, gameWidth, gameHeight, baseFontSize);
  }

  /**
   * Check if player qualifies for leaderboard (async)
   */
  private async checkLeaderboardQualification(
    centerX: number, 
    gameWidth: number, 
    gameHeight: number, 
    baseFontSize: number
  ): Promise<void> {
    // Show checking message
    const checkingY = gameHeight * 0.82;
    const checkingText = this.add.text(centerX, checkingY, 'CHECKING LEADERBOARD...', {
      fontSize: `${baseFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);

    // Pulse animation
    this.tweens.add({
      targets: checkingText,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    try {
      const isTopTen = await LeaderboardManager.isTopTen(this.gameStats.enemiesDefeated);
      
      // Remove checking text
      checkingText.destroy();
      
      if (isTopTen) {
        // Show "NEW RECORD!" message
        const recordY = gameHeight * 0.82;
        this.add.text(centerX, recordY, '>>> NEW RECORD! <<<', {
          fontSize: `${baseFontSize * 1.3}px`,
          color: '#ffaa00',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          stroke: '#ff0000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(3);

        // Prompt for name
        this.promptForName(centerX, recordY + 40, baseFontSize);
      } else {
        // Show regular play again button
        this.createPlayAgainButton(centerX, gameWidth, gameHeight, baseFontSize);
      }
    } catch (error) {
      console.error('Failed to check leaderboard:', error);
      // Remove checking text
      checkingText.destroy();
      // Show play again button even if check fails
      this.createPlayAgainButton(centerX, gameWidth, gameHeight, baseFontSize);
    }
  }

  /**
   * Detect if the device is mobile
   */
  private isMobileDevice(): boolean {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    return (hasTouch && isSmallScreen) || isMobileUA;
  }

  /**
   * Prompt player to enter 3-letter name for leaderboard
   */
  private promptForName(x: number, y: number, baseFontSize: number): void {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const isMobile = this.isMobileDevice();

    // Instruction text
    this.add.text(x, y, 'ENTER PILOT NAME:', {
      fontSize: `${baseFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);

    // Name display (3 letters)
    let nameLetters = ['_', '_', '_'];
    let currentIndex = 0;

    const nameText = this.add.text(x, y + 40, nameLetters.join(' '), {
      fontSize: `${baseFontSize * 1.8}px`,
      color: '#ffaa00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      letterSpacing: 10
    }).setOrigin(0.5).setDepth(3);

    // Blinking cursor under current letter
    const cursorY = y + 65;
    const cursor = this.add.text(x - 40 + (currentIndex * 40), cursorY, '▲', {
      fontSize: `${baseFontSize}px`,
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(3);

    // Pulse animation for cursor
    this.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Function to add a letter
    const addLetter = (letter: string) => {
      if (currentIndex < 3) {
        nameLetters[currentIndex] = letter.toUpperCase();
        currentIndex++;
        nameText.setText(nameLetters.join(' '));
        
        // Update cursor position
        if (currentIndex < 3) {
          cursor.x = x - 40 + (currentIndex * 40);
        } else {
          cursor.setVisible(false); // Hide when all 3 letters entered
        }

        // If all 3 letters entered, save and show play button
        if (currentIndex === 3) {
          const name = nameLetters.join('');
          this.saveToLeaderboard(name);
          
          // Wait a moment then show play button
          this.time.delayedCall(800, () => {
            this.createPlayAgainButton(x, gameWidth, gameHeight, baseFontSize);
          });
        }
      }
    };

    // Function to delete last letter
    const deleteLetter = () => {
      if (currentIndex > 0) {
        currentIndex--;
        nameLetters[currentIndex] = '_';
        nameText.setText(nameLetters.join(' '));
        cursor.x = x - 40 + (currentIndex * 40);
        cursor.setVisible(true);
      }
    };

    if (isMobile) {
      // Mobile: Use native HTML input
      this.createNativeInput(x, y + 95, baseFontSize, (name: string) => {
        // Fill in the name
        for (let i = 0; i < Math.min(3, name.length); i++) {
          addLetter(name[i]);
        }
      });
      
      // Hint text for mobile
      this.add.text(x, y + 95, 'TAP TO ENTER NAME', {
        fontSize: `${baseFontSize * 0.7}px`,
        color: '#666666',
        fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(3);
    } else {
      // Desktop: Use keyboard input
      // Hint text for desktop
      this.add.text(x, y + 95, 'TYPE TO ENTER • BACKSPACE TO DELETE', {
        fontSize: `${baseFontSize * 0.7}px`,
        color: '#666666',
        fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(3);

      // Keyboard input handler
      this.input.keyboard?.on('keydown', (event: any) => {
        // Only accept A-Z keys
        if (event.key && event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
          addLetter(event.key);
        } else if (event.key === 'Backspace') {
          deleteLetter();
        }
      });
    }
  }

  /**
   * Create native HTML input for mobile
   */
  private createNativeInput(
    x: number,
    y: number,
    baseFontSize: number,
    onComplete: (name: string) => void
  ): void {
    // Get the canvas element to position relative to it
    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Create HTML input element
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 3;
    input.placeholder = 'AAA';
    input.style.position = 'fixed'; // Use fixed positioning
    input.style.left = `${canvasRect.left + x - 75}px`;
    input.style.top = `${canvasRect.top + y + 20}px`;
    input.style.width = '150px';
    input.style.height = '50px';
    input.style.fontSize = `${baseFontSize * 1.2}px`;
    input.style.textAlign = 'center';
    input.style.textTransform = 'uppercase';
    input.style.backgroundColor = '#001a2e';
    input.style.color = '#ffaa00';
    input.style.border = '3px solid #00ffff';
    input.style.borderRadius = '8px';
    input.style.fontFamily = 'monospace';
    input.style.fontWeight = 'bold';
    input.style.letterSpacing = '5px';
    input.style.zIndex = '10000';
    input.style.outline = 'none';
    
    // Add to DOM
    document.body.appendChild(input);
    
    // Auto-focus to bring up keyboard (with slight delay for mobile)
    setTimeout(() => {
      input.focus();
      input.click(); // Some mobile browsers need click too
    }, 200);
    
    // Handle input
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.toUpperCase().replace(/[^A-Z]/g, '');
      
      // Auto-submit when 3 letters entered
      if (target.value.length === 3) {
        setTimeout(() => complete(), 100);
      }
    });
    
    // Handle completion (blur or enter)
    const complete = () => {
      if (!input.parentElement) return; // Already removed
      
      const name = input.value.toUpperCase().padEnd(3, '_');
      document.body.removeChild(input);
      onComplete(name);
    };
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        complete();
      }
    });
    
    // Add a "Done" button for mobile
    const doneButton = document.createElement('button');
    doneButton.textContent = 'DONE';
    doneButton.style.position = 'fixed';
    doneButton.style.left = `${canvasRect.left + x - 75}px`;
    doneButton.style.top = `${canvasRect.top + y + 80}px`;
    doneButton.style.width = '150px';
    doneButton.style.height = '40px';
    doneButton.style.fontSize = `${baseFontSize}px`;
    doneButton.style.backgroundColor = '#00ffff';
    doneButton.style.color = '#001a2e';
    doneButton.style.border = 'none';
    doneButton.style.borderRadius = '8px';
    doneButton.style.fontFamily = 'monospace';
    doneButton.style.fontWeight = 'bold';
    doneButton.style.zIndex = '10000';
    doneButton.style.cursor = 'pointer';
    
    document.body.appendChild(doneButton);
    
    doneButton.addEventListener('click', () => {
      if (input.parentElement) {
        document.body.removeChild(input);
      }
      if (doneButton.parentElement) {
        document.body.removeChild(doneButton);
      }
      const name = input.value.toUpperCase().padEnd(3, '_');
      onComplete(name);
    });
  }


  /**
   * Save score to leaderboard (async)
   */
  private async saveToLeaderboard(name: string): Promise<void> {
    const messageY = this.scale.height * 0.82 + 140;
    
    // Show saving message
    const savingText = this.add.text(this.scale.width / 2, messageY, 
      'SAVING TO GLOBAL LEADERBOARD...', {
      fontSize: `${Math.min(20, this.scale.width * 0.02)}px`,
      color: '#00ffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);

    // Pulse animation
    this.tweens.add({
      targets: savingText,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: 3 // Repeat a few times while saving
    });

    try {
      const ranking = await LeaderboardManager.addEntry(name, this.gameStats.enemiesDefeated);
      
      // Remove saving text
      savingText.destroy();
      
      if (ranking) {
        // Show success message
        const successText = this.add.text(this.scale.width / 2, messageY, 
          `RANK #${ranking} ACHIEVED!`, {
          fontSize: `${Math.min(22, this.scale.width * 0.022)}px`,
          color: '#00ff00',
          fontFamily: 'monospace',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);

        // Fade out success message
        this.tweens.add({
          targets: successText,
          alpha: 0,
          duration: 2000,
          delay: 1000
        });
      } else {
        // Show failure message (shouldn't happen if validation worked)
        const failText = this.add.text(this.scale.width / 2, messageY, 
          'FAILED TO SAVE SCORE', {
          fontSize: `${Math.min(20, this.scale.width * 0.02)}px`,
          color: '#ff6600',
          fontFamily: 'monospace',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);

        // Fade out failure message
        this.tweens.add({
          targets: failText,
          alpha: 0,
          duration: 2000,
          delay: 1000
        });
      }
    } catch (error) {
      console.error('Failed to save to leaderboard:', error);
      
      // Remove saving text
      savingText.destroy();
      
      // Show error message
      const errorText = this.add.text(this.scale.width / 2, messageY, 
        'CONNECTION ERROR - SCORE NOT SAVED', {
        fontSize: `${Math.min(20, this.scale.width * 0.02)}px`,
        color: '#ff0000',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(3);

      // Fade out error message
      this.tweens.add({
        targets: errorText,
        alpha: 0,
        duration: 2000,
        delay: 1000
      });
    }
  }

  /**
   * Create the play again button
   */
  private createPlayAgainButton(centerX: number, gameWidth: number, gameHeight: number, _baseFontSize: number): void {
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
