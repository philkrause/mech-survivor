import Phaser from 'phaser';
import { Upgrade, UpgradeSystem } from '../systems/UpgradeSystem';

/**
 * UI component for displaying and selecting upgrades
 * Redesigned to match reference style: single box with sections inside
 */
export class UpgradeUI {
  private scene: Phaser.Scene;
  private upgradeSystem: UpgradeSystem;
  private container: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private upgradeSections: Phaser.GameObjects.Container[] = [];
  private mainBox!: Phaser.GameObjects.Rectangle; // Initialized in createUpgradeBox
  private isVisible: boolean = false;
  private onUpgradeSelected: (upgradeId: string) => void;
  private overlay!: Phaser.GameObjects.Rectangle;
  private selectedCardIndex: number = 0;
  private selectionCursor: Phaser.GameObjects.Graphics | null = null; // Yellow triangle cursor
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private upgrades: Upgrade[] = [];

  constructor(scene: Phaser.Scene, upgradeSystem: UpgradeSystem) {
    this.scene = scene;
    this.upgradeSystem = upgradeSystem;

    // Create container for all UI elements
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);
    this.container.setVisible(false);

    // Create semi-transparent overlay
    // Position overlay relative to camera scroll (unbounded camera)
    const cam = this.scene.cameras.main;
    this.overlay = this.scene.add.rectangle(
      0, 0, // Position will be updated in show()
      cam.width, cam.height,
      0x000000, 0.7
    );
    this.overlay.setOrigin(0, 0);
    this.overlay.setDepth(98); // Below stats panel (101) and upgrade UI container (100)
    this.overlay.setVisible(false);
    this.container.add(this.overlay);

    // Create title text - more visible and vibrant
    this.titleText = this.scene.add.text(
      0, 0,
      'LEVEL UP!',
      {
        fontSize: '48px',
        color: '#ffff00', // Bright yellow
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5,
        shadow: {
          offsetX: 3,
          offsetY: 3,
          color: '#000000',
          blur: 8,
          fill: true
        }
      }
    );
    this.titleText.setOrigin(0.5);
    this.container.add(this.titleText);

    // Set default callback
    this.onUpgradeSelected = () => { };
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Check if relic screen is open - if so, don't handle input (let relic screen handle it)
    const scene = this.scene as any;
    if (scene.relicSystem && scene.relicSystem.isScreenOpen && scene.relicSystem.isScreenOpen()) {
      // Only handle navigation keys if relic screen is open, but let relic screen handle Enter/Space
      if (event.key === 'Enter' || event.key === ' ') {
        return; // Let relic screen handle Enter/Space
      }
    }
    
    const total = this.upgradeSections.length;

    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
      this.selectedCardIndex = (this.selectedCardIndex + 1) % total;
      this.updateSelectionCursor();
    } else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
      this.selectedCardIndex = (this.selectedCardIndex - 1 + total) % total;
      this.updateSelectionCursor();
    } else if (event.key === 'Enter' || event.key === ' ') {
      const upgrade = this.upgrades[this.selectedCardIndex];
      this.onUpgradeSelected(upgrade.id);
      this.hide();
    }
  }

  /**
   * Show the upgrade selection UI with random upgrades
   */
  show(count: number = 3, callback: (upgradeId: string) => void): void {
    if (this.isVisible) return;

    this.keys = [
      this.scene.input.keyboard!.addKey('UP'),
      this.scene.input.keyboard!.addKey('DOWN'),
      this.scene.input.keyboard!.addKey('W'),
      this.scene.input.keyboard!.addKey('S'),
      this.scene.input.keyboard!.addKey('ENTER'),
      this.scene.input.keyboard!.addKey('SPACE')
    ];

    this.scene.input.keyboard!.on('keydown', this.handleKeyDown, this);
    this.onUpgradeSelected = callback;

    // Get random upgrades
    const upgrades = this.upgradeSystem.getRandomUpgrades(count);

    if (upgrades.length === 0) {
      callback('');
      return;
    }

    // Clear any existing upgrade sections
    this.clearUpgradeSections();

    // Create upgrade UI
    this.createUpgradeBox(upgrades);

    // Update overlay position to match camera scroll
    const cam = this.scene.cameras.main;
    this.overlay.setPosition(cam.scrollX, cam.scrollY);

    // Show the container
    this.container.setVisible(true);
    this.overlay.setVisible(true);
    this.isVisible = true;

    // Animate in
    this.animateIn();
  }

  /**
   * Hide the upgrade selection UI
   */
  hide(): void {
    if (!this.isVisible) return;

    this.animateOut(() => {
      this.container.setVisible(false);
      this.overlay.setVisible(false);
      this.isVisible = false;
      this.clearUpgradeSections();
    });

    // Clean up input
    this.scene.input.keyboard!.off('keydown', this.handleKeyDown, this);
    this.keys.forEach(key => key.destroy());
    this.keys = [];
  }

  private updateSelectionCursor(): void {
    if (!this.selectionCursor || this.upgradeSections.length === 0 || !this.mainBox) return;

    const selectedSection = this.upgradeSections[this.selectedCardIndex];
    if (selectedSection) {
      // Position cursor at the left edge of the box, aligned with the selected section
      // Get the box's left edge
      const cam = this.scene.cameras.main;
      const boxX = cam.scrollX + cam.width / 2;
      const boxWidth = 500; // Should match createUpgradeBox width
      
      // Position cursor further to the left, near the edge of the box
      this.selectionCursor.setPosition(boxX - boxWidth / 2 + 15, selectedSection.y);
      this.container.bringToTop(this.selectionCursor);
    }
  }

  /**
   * Clear all upgrade sections
   */
  private clearUpgradeSections(): void {
    this.upgradeSections.forEach(section => {
      section.destroy();
    });
    this.upgradeSections = [];

    if (this.selectionCursor) {
      this.selectionCursor.destroy();
      this.selectionCursor = null;
    }

    if (this.mainBox) {
      this.mainBox.destroy();
      this.mainBox = null as any;
    }
  }

  /**
   * Create the main upgrade box with sections inside
   */
  private createUpgradeBox(upgrades: Upgrade[]): void {
    const cam = this.scene.cameras.main;
    
    // Main box dimensions - smaller to avoid covering stats panel
    const boxWidth = 500;
    const sectionHeight = 100;
    const sectionSpacing = 8;
    const padding = 20;
    const boxHeight = (sectionHeight * upgrades.length) + (sectionSpacing * (upgrades.length - 1)) + (padding * 2);

    // Center the box relative to camera view (account for scroll)
    // For unbounded camera, we need to position relative to camera's world view
    const boxX = cam.scrollX + cam.width / 2;
    const boxY = cam.scrollY + cam.height / 2;

    // Create main box background - more vibrant colors
    this.mainBox = this.scene.add.rectangle(
      boxX, boxY, boxWidth, boxHeight,
      0x1a2332, 0.95 // Darker blue with slight purple tint
    );
    this.mainBox.setStrokeStyle(3, 0x5a9dd5); // Bright blue border
    this.container.add(this.mainBox);

    // Position title above the box (not inside it)
    const titleOffsetY = 40; // Space between title and box
    this.titleText.setPosition(boxX, boxY - boxHeight / 2 - titleOffsetY);

    // Create upgrade sections inside the box
    this.upgrades = upgrades;
    this.selectedCardIndex = 0;

    upgrades.forEach((upgrade, index) => {
      const sectionY = boxY - boxHeight / 2 + padding + (sectionHeight / 2) + (index * (sectionHeight + sectionSpacing));

      // Create section container
      const section = this.scene.add.container(boxX, sectionY);

      // Create section background - more vibrant
      const sectionBg = this.scene.add.rectangle(
        0, 0, boxWidth - padding * 2, sectionHeight - sectionSpacing,
        0x3a4558, 0.95 // Medium blue-grey with more contrast
      );
      sectionBg.setStrokeStyle(2, 0x6a7d95); // Brighter border
      section.add(sectionBg);

      // Get current level
      const currentLevel = this.upgradeSystem.getUpgradeLevel(upgrade.id);
      const isNew = currentLevel === 0;

      // Create icon (placeholder - using text for now)
      const iconText = this.scene.add.text(
        -boxWidth / 2 + padding + 20, 0,
        '●', // Placeholder icon
        {
          fontSize: '24px',
          color: '#ffffff'
        }
      );
      iconText.setOrigin(0.5);
      section.add(iconText);

      // Create upgrade name text - brighter
      const nameText = this.scene.add.text(
        -boxWidth / 2 + padding + 60, -20,
        upgrade.name,
        {
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'left',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      nameText.setOrigin(0, 0.5);
      section.add(nameText);

      // Create level or "New!" text (right-aligned)
      const levelOrNewText = this.scene.add.text(
        boxWidth / 2 - padding - 10, -20,
        isNew ? 'New!' : `level: ${currentLevel}`,
        {
          fontSize: '18px',
          color: isNew ? '#ffdd00' : '#ffffff',
          fontStyle: isNew ? 'bold' : 'normal',
          align: 'right'
        }
      );
      levelOrNewText.setOrigin(1, 0.5);
      section.add(levelOrNewText);

      // Create description text - brighter
      const descText = this.scene.add.text(
        -boxWidth / 2 + padding + 60, 20,
        upgrade.description,
        {
          fontSize: '17px',
          color: '#e0e0e0', // Brighter grey
          align: 'left',
          wordWrap: { width: boxWidth - padding * 2 - 120 }
        }
      );
      descText.setOrigin(0, 0.5);
      section.add(descText);

      // Add section to container
      this.container.add(section);
      this.upgradeSections.push(section);

      // Make section interactive for clicking
      sectionBg.setInteractive({ useHandCursor: true });
      sectionBg.on('pointerdown', () => {
        this.onUpgradeSelected(upgrade.id);
        this.hide();
      });

      // Start with scale 0 for animation
      section.setScale(0);
    });

    // Create yellow triangle cursor
    this.createSelectionCursor();
  }

  /**
   * Create yellow triangle selection cursor
   */
  private createSelectionCursor(): void {
    this.selectionCursor = this.scene.add.graphics();
    
    // Draw yellow triangle pointing right
    this.selectionCursor.fillStyle(0xffff00); // Yellow
    this.selectionCursor.beginPath();
    this.selectionCursor.moveTo(0, -15);
    this.selectionCursor.lineTo(0, 15);
    this.selectionCursor.lineTo(20, 0);
    this.selectionCursor.closePath();
    this.selectionCursor.fillPath();
    
    this.selectionCursor.setDepth(102); // Above everything (overlay 98, stats 101, container 100, cursor 102)
    
    this.container.add(this.selectionCursor);
    this.updateSelectionCursor();
  }

  /**
   * Animate the UI in
   */
  private animateIn(): void {
    // Animate overlay
    this.overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: { from: 0, to: 0.7 },
      duration: 300,
      ease: 'Power2'
    });

    // Animate title
    this.titleText.setAlpha(0);
    this.scene.tweens.add({
      targets: this.titleText,
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: 'Power2'
    });

    // Animate main box
    if (this.mainBox) {
      this.mainBox.setAlpha(0);
      this.mainBox.setScale(0.9);
      this.scene.tweens.add({
        targets: this.mainBox,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 0.9, to: 1 },
        scaleY: { from: 0.9, to: 1 },
        duration: 400,
        ease: 'Back.out'
      });
    }

    // Animate sections with delay
    this.upgradeSections.forEach((section, index) => {
      this.scene.tweens.add({
        targets: section,
        scale: { from: 0, to: 1 },
        duration: 300,
        delay: 200 + index * 100,
        ease: 'Back.out'
      });
    });

    // Animate cursor
    if (this.selectionCursor) {
      this.selectionCursor.setAlpha(0);
      this.scene.tweens.add({
        targets: this.selectionCursor,
        alpha: { from: 0, to: 1 },
        duration: 400,
        delay: 500,
        ease: 'Power2'
      });
    }
  }

  /**
   * Animate the UI out
   */
  private animateOut(onComplete: () => void): void {
    // Animate overlay
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: { from: 0.7, to: 0 },
      duration: 200,
      ease: 'Power2'
    });

    // Animate title
    this.scene.tweens.add({
      targets: this.titleText,
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: 'Power2'
    });

    // Animate main box
    if (this.mainBox) {
      this.scene.tweens.add({
        targets: this.mainBox,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 0.9 },
        scaleY: { from: 1, to: 0.9 },
        duration: 200,
        ease: 'Power2'
      });
    }

    // Animate sections
    const lastIndex = this.upgradeSections.length - 1;
    this.upgradeSections.forEach((section, index) => {
      this.scene.tweens.add({
        targets: section,
        scale: { from: 1, to: 0 },
        duration: 200,
        delay: index * 50,
        ease: 'Back.in',
        onComplete: index === lastIndex ? onComplete : undefined
      });
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearUpgradeSections();
    if (this.container) {
      this.container.destroy();
    }
  }
}
