/**
 * Tracks game statistics including weapon performance, kills, survival time, and relics
 */
export interface WeaponStats {
  name: string;
  level: number;
  totalDamage: number;
  activeTime: number; // ms
  dps: number;
}

export interface GameStats {
  survivalTime: number; // ms
  levelReached: number;
  enemiesDefeated: number;
  weapons: WeaponStats[];
  relics: string[];
}

export class StatsTracker {
  private startTime: number = 0;
  private enemyKills: number = 0;
  private weaponStats: Map<string, WeaponStats> = new Map();
  private relicIds: Set<string> = new Set();
  private weaponActiveStart: Map<string, number> = new Map(); // Track when each weapon became active

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Record when a weapon becomes active
   */
  startWeaponTracking(weaponId: string, weaponName: string, level: number = 1): void {
    if (!this.weaponStats.has(weaponId)) {
      this.weaponStats.set(weaponId, {
        name: weaponName,
        level: level,
        totalDamage: 0,
        activeTime: 0,
        dps: 0
      });
    }
    
    // Start tracking active time
    this.weaponActiveStart.set(weaponId, Date.now());
  }

  /**
   * Update weapon level
   */
  updateWeaponLevel(weaponId: string, level: number): void {
    const stats = this.weaponStats.get(weaponId);
    if (stats) {
      stats.level = level;
    }
  }

  /**
   * Add damage dealt by a weapon
   */
  recordWeaponDamage(weaponId: string, damage: number): void {
    const stats = this.weaponStats.get(weaponId);
    if (stats) {
      stats.totalDamage += damage;
      // Recalculate DPS
      if (stats.activeTime > 0) {
        stats.dps = (stats.totalDamage / stats.activeTime) * 1000; // Convert ms to seconds
      }
    }
  }

  /**
   * Stop tracking a weapon (when it's no longer active)
   */
  stopWeaponTracking(weaponId: string): void {
    const startTime = this.weaponActiveStart.get(weaponId);
    if (startTime && this.weaponStats.has(weaponId)) {
      const stats = this.weaponStats.get(weaponId);
      if (stats) {
        const elapsed = Date.now() - startTime;
        stats.activeTime += elapsed;
        // Recalculate DPS
        if (stats.activeTime > 0) {
          stats.dps = (stats.totalDamage / stats.activeTime) * 1000;
        }
      }
      this.weaponActiveStart.delete(weaponId);
    }
  }

  /**
   * Finalize all weapon tracking (called when game ends)
   */
  finalizeWeaponTracking(): void {
    // Stop tracking all active weapons
    this.weaponActiveStart.forEach((startTime, weaponId) => {
      const stats = this.weaponStats.get(weaponId);
      if (stats) {
        const elapsed = Date.now() - startTime;
        stats.activeTime += elapsed;
        // Recalculate DPS
        if (stats.activeTime > 0) {
          stats.dps = (stats.totalDamage / stats.activeTime) * 1000;
        }
      }
    });
    this.weaponActiveStart.clear();
  }

  /**
   * Record enemy kill
   */
  recordKill(): void {
    this.enemyKills++;
  }

  /**
   * Record relic collected
   */
  recordRelic(relicId: string): void {
    this.relicIds.add(relicId);
  }

  /**
   * Get final game stats
   */
  getGameStats(levelReached: number): GameStats {
    this.finalizeWeaponTracking();
    
    const survivalTime = Date.now() - this.startTime;
    
    // Convert weapon stats map to array and sort by damage
    const weapons = Array.from(this.weaponStats.values())
      .filter(w => w.totalDamage > 0 || w.activeTime > 0) // Only include weapons that did damage or were active
      .sort((a, b) => b.totalDamage - a.totalDamage);

    return {
      survivalTime: survivalTime,
      levelReached: levelReached,
      enemiesDefeated: this.enemyKills,
      weapons: weapons,
      relics: Array.from(this.relicIds)
    };
  }

  /**
   * Reset stats (for new game)
   */
  reset(): void {
    this.startTime = Date.now();
    this.enemyKills = 0;
    this.weaponStats.clear();
    this.relicIds.clear();
    this.weaponActiveStart.clear();
  }
}
