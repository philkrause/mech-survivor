import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { UpgradeSystem } from '../systems/UpgradeSystem';

/**
 * Player Stats Panel component
 * Displays player statistics in a vertical panel on the left side
 */
export class PlayerStatsPanel {
  private scene: Phaser.Scene;
  private player: Player;
  private upgradeSystem: UpgradeSystem;
  private container: Phaser.GameObjects.Container;
  private statsContainer: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private statTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private weaponLevelTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  
  // Stats configuration - maps stat keys to display names and icons
  private statConfig: Array<{
    key: string;
    label: string;
    icon: string; // For now, just using text as placeholder
    getValue: (player: Player, upgradeSystem: UpgradeSystem) => string;
  }> = [
    {
      key: 'maxHealth',
      label: 'Max Health',
      icon: '♥',
      getValue: (player) => {
        try {
          return String(Math.floor(player.getMaxHealth()));
        } catch {
          return '100'; // Fallback
        }
      }
    },
    {
      key: 'recovery',
      label: 'Recovery',
      icon: '✚',
      getValue: () => '—' // Not implemented yet
    },
    {
      key: 'armor',
      label: 'Armor',
      icon: '🛡',
      getValue: (player) => {
        const reduction = (player as any).damageReduction || 0;
        return reduction > 0 ? `+${Math.round(reduction * 100)}%` : '—';
      }
    },
    {
      key: 'moveSpeed',
      label: 'MoveSpeed',
      icon: '👢',
      getValue: (player) => {
        const speed = (player as any).speedMultiplier || 1.0;
        return speed > 1.0 ? `+${Math.round((speed - 1) * 100)}%` : '—';
      }
    },
    {
      key: 'might',
      label: 'Might',
      icon: '👊',
      getValue: (player) => {
        const multiplier = (player as any).damageBlasterMultiplier || 1.0;
        return multiplier > 1.0 ? `+${Math.round((multiplier - 1) * 100)}%` : '—';
      }
    },
    {
      key: 'area',
      label: 'Area',
      icon: '○',
      getValue: () => '—' // Not implemented yet
    },
    {
      key: 'speed',
      label: 'Speed',
      icon: '⏱',
      getValue: (player) => {
        const speed = (player as any).projectileSpeedMultiplier || 1.0;
        return speed > 1.0 ? `+${Math.round((speed - 1) * 100)}%` : '—';
      }
    },
    {
      key: 'duration',
      label: 'Duration',
      icon: '⏳',
      getValue: () => '—' // Not implemented yet
    },
    {
      key: 'amount',
      label: 'Amount',
      icon: '📊',
      getValue: (player) => {
        const count = (player as any).projectileCount || 1;
        return count > 1 ? `+${count - 1}` : '—';
      }
    },
    {
      key: 'cooldown',
      label: 'Cooldown',
      icon: '⏰',
      getValue: (player) => {
        // Calculate attack speed improvement
        const blasterSpeed = (player as any).blasterSpeedMultiplier || 0;
        return blasterSpeed > 0 ? `-${Math.round(blasterSpeed * 100)}%` : '—';
      }
    },
    {
      key: 'luck',
      label: 'Luck',
      icon: '🍀',
      getValue: () => '—' // Not implemented yet
    },
    {
      key: 'growth',
      label: 'Growth',
      icon: '🌱',
      getValue: (player) => {
        const exp = (player as any).experienceMultiplier || 1.0;
        return exp > 1.0 ? `+${Math.round((exp - 1) * 100)}%` : '—';
      }
    },
    {
      key: 'greed',
      label: 'Greed',
      icon: '💰',
      getValue: () => '—' // Not implemented yet
    },
    {
      key: 'magnet',
      label: 'Magnet',
      icon: '🧲',
      getValue: () => '38' // Placeholder - not implemented yet
    }
  ];

  constructor(scene: Phaser.Scene, player: Player, upgradeSystem: UpgradeSystem) {
    this.scene = scene;
    this.player = player;
    this.upgradeSystem = upgradeSystem;
    
    // Create container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(101); // Above overlay (99) but below upgrade UI container (100) and cursor (101)
    
    // Create background - positioned relative to camera scroll
    // Make it wider to accommodate all text
    const cam = this.scene.cameras.main;
    this.background = this.scene.add.rectangle(0, 0, 220, 700, 0xd0d0d0, 0.9);
    this.background.setOrigin(0, 0);
    this.container.add(this.background);
    
    // Create stats container
    this.statsContainer = this.scene.add.container(0, 0);
    this.container.add(this.statsContainer);
    
    // Initially hidden
    this.container.setVisible(false);
    
    // Create stats display
    this.createStatsDisplay();
  }

  private createStatsDisplay(): void {
    const startX = 10;
    let y = 20;
    const lineHeight = 30;
    
    // Add weapon upgrade levels section
    const weaponHeader = this.scene.add.text(startX, y, 'Weapons', {
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold',
      align: 'left'
    });
    this.statsContainer.add(weaponHeader);
    y += lineHeight + 10;
    
    // Track weapon levels
    const weaponConfig = [
      { id: 'damage', name: 'Blaster', icon: '🔫' },
      { id: 'unlock_saber', name: 'Flamethrower', icon: '🔥' },
      { id: 'unlock_force', name: 'Plasma Blast', icon: '⚡' },
      { id: 'unlock_bb8', name: 'Combat Drone', icon: '🤖' },
      { id: 'unlock_r2d2', name: 'Attack Chopper', icon: '🚁' },
      { id: 'unlock_laser_cannon', name: 'Laser Cannon', icon: '💥' }
    ];
    
    weaponConfig.forEach(weapon => {
      let level = this.upgradeSystem.getUpgradeLevel(weapon.id);
      
      // Check if weapon is unlocked by default (blaster)
      if (weapon.id === 'damage') {
        // Blaster starts unlocked, so show level 1 if no upgrades yet
        // Level 0 means base blaster (unlocked), level 1+ means upgraded
        level = level + 1; // Always show at least level 1 for unlocked blaster
      } else {
        // For unlock upgrades, level represents upgrade count
        // Level 1 means unlocked (the unlock itself counts as level 1)
        // Level 2+ means unlocked + additional upgrades
        // Level 0 means not unlocked yet
        if (level === 0) {
          // Check if the unlock upgrade has been applied
          // The unlock upgrade itself sets level to 1 when applied
          level = 0; // Not unlocked yet
        }
        // If level > 0, weapon is unlocked (level 1 = unlocked, level 2+ = unlocked + upgrades)
      }
      
      const displayText = level > 0 ? String(level) : '—';
      const levelText = this.scene.add.text(startX + 150, y, displayText, {
        fontSize: '14px',
        color: '#000000',
        align: 'right',
        fixedWidth: 50 // Fixed width to prevent overlap
      });
      
      const weaponNameText = this.scene.add.text(startX + 25, y, weapon.name, {
        fontSize: '14px',
        color: '#000000',
        align: 'left'
      });
      
      const weaponIconText = this.scene.add.text(startX, y, weapon.icon, {
        fontSize: '14px',
        color: '#000000',
        align: 'left'
      });
      
      this.statsContainer.add(weaponIconText);
      this.statsContainer.add(weaponNameText);
      this.statsContainer.add(levelText);
      
      this.weaponLevelTexts.set(weapon.id, levelText);
      y += lineHeight - 5;
    });
    
    y += 10;
    
    // Add separator
    const separator = this.scene.add.text(startX, y, '─────────', {
      fontSize: '16px',
      color: '#000000',
      align: 'left'
    });
    this.statsContainer.add(separator);
    y += lineHeight;
    
    // Add stats section
    this.statConfig.forEach(stat => {
      // Create icon text (simplified - could use actual icons later)
      const iconText = this.scene.add.text(startX, y, stat.icon, {
        fontSize: '16px',
        color: '#000000',
        align: 'left'
      });
      this.statsContainer.add(iconText);
      
      // Create label text
      const labelText = this.scene.add.text(startX + 25, y, stat.label, {
        fontSize: '16px',
        color: '#000000',
        align: 'left'
      });
      this.statsContainer.add(labelText);
      
      // Create value text - wider spacing for better visibility
      const valueText = this.scene.add.text(startX + 150, y, stat.getValue(this.player, this.upgradeSystem), {
        fontSize: '16px',
        color: '#000000',
        align: 'right',
        fixedWidth: 50 // Fixed width to prevent overlap
      });
      this.statsContainer.add(valueText);
      
      // Store reference for updates
      this.statTexts.set(stat.key, valueText);
      
      y += lineHeight;
    });
  }

  public show(): void {
    this.updateStats();
    this.updatePosition(); // Update position relative to camera
    this.container.setVisible(true);
  }

  public hide(): void {
    this.container.setVisible(false);
  }

  public updateStats(): void {
    // Update regular stats
    this.statConfig.forEach(stat => {
      const valueText = this.statTexts.get(stat.key);
      if (valueText) {
        valueText.setText(stat.getValue(this.player, this.upgradeSystem));
      }
    });
    
    // Update weapon levels
    this.weaponLevelTexts.forEach((levelText, weaponId) => {
      let level = this.upgradeSystem.getUpgradeLevel(weaponId);
      
      // Blaster starts unlocked by default, so level 0 = base unlocked = level 1 display
      if (weaponId === 'damage') {
        level = level + 1; // Always show at least level 1 for unlocked blaster
      }
      // For unlock upgrades: level 1 = unlocked, level 2+ = unlocked + upgrades
      // If level is 0, weapon is not unlocked yet
      
      levelText.setText(level > 0 ? String(level) : '—');
    });
  }

  // Store offset from camera to maintain position
  private offsetX: number = 10;
  private offsetY: number = 10;
  
  public setPosition(x: number, y: number): void {
    // Store offset values
    this.offsetX = x;
    this.offsetY = y;
    // Position relative to camera scroll for unbounded camera
    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.scrollX + x, cam.scrollY + y);
  }
  
  public updatePosition(): void {
    // Update position to follow camera using stored offset
    const cam = this.scene.cameras.main;
    this.container.setPosition(cam.scrollX + this.offsetX, cam.scrollY + this.offsetY);
  }

  public destroy(): void {
    this.container.destroy();
  }
}

