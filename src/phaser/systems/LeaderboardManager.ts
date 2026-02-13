/**
 * Leaderboard Manager - Firebase Realtime Database-based global leaderboard
 * Tracks most enemies destroyed (classic arcade style)
 * 
 * SWITCHED TO REALTIME DATABASE: Much faster than Firestore for simple leaderboards!
 */

import { db } from '../../config/firebase';
import { 
  ref, 
  get, 
  push,
  remove
} from 'firebase/database';

export interface LeaderboardEntry {
  name: string; // 3-letter name (e.g., "ACE")
  kills: number; // Enemies destroyed
  timestamp: number; // When the score was achieved (ms)
}

export class LeaderboardManager {
  private static readonly DB_PATH = 'leaderboard';
  private static readonly MAX_ENTRIES = 10;
  private static readonly MAX_REASONABLE_KILLS = 10000; // Anti-cheat: max reasonable kills
  
  // Cache for local device ID (to rate limit submissions)
  private static deviceId: string | null = null;
  
  // Cache for leaderboard data (refresh every 30 seconds)
  private static cachedLeaderboard: LeaderboardEntry[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION_MS = 30000; // 30 seconds

  /**
   * Get device ID for rate limiting (stored in localStorage)
   */
  private static getDeviceId(): string {
    if (this.deviceId) {
      return this.deviceId;
    }
    
    let deviceId = localStorage.getItem('mech_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('mech_device_id', deviceId);
    }
    
    this.deviceId = deviceId;
    return deviceId;
  }

  /**
   * Get all leaderboard entries (sorted by kills, descending)
   * Returns top 10 scores from Realtime Database (with caching)
   */
  static async getLeaderboard(forceRefresh: boolean = false): Promise<LeaderboardEntry[]> {
    // Return cached data if fresh (and not forcing refresh)
    const now = Date.now();
    if (!forceRefresh && this.cachedLeaderboard && (now - this.cacheTimestamp < this.CACHE_DURATION_MS)) {
      console.log('⚡ Returning cached leaderboard');
      return this.cachedLeaderboard;
    }

    console.log('🔥 Fetching leaderboard from Firebase Realtime Database...');
    const startTime = Date.now();

    try {
      const leaderboardRef = ref(db, this.DB_PATH);
      
      // Get all entries (Realtime Database doesn't support sorting desc, so we get all and sort client-side)
      const snapshot = await get(leaderboardRef);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Data fetched in ${elapsed}ms`);

      if (!snapshot.exists()) {
        console.log('📝 Leaderboard is empty');
        this.cachedLeaderboard = [];
        this.cacheTimestamp = now;
        return [];
      }

      // Convert to array
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        entries.push({
          name: data.name,
          kills: data.kills,
          timestamp: data.timestamp
        });
      });

      // Sort by kills (desc), then timestamp (asc) - client-side
      entries.sort((a, b) => {
        if (b.kills !== a.kills) {
          return b.kills - a.kills;
        }
        return a.timestamp - b.timestamp; // Earlier timestamp wins if tied
      });

      // Trim to top 10
      const top10 = entries.slice(0, this.MAX_ENTRIES);

      // Cache the results
      this.cachedLeaderboard = top10;
      this.cacheTimestamp = now;

      console.log(`🏆 Returning top ${top10.length} scores`);
      
      return top10;
    } catch (error) {
      console.error('❌ Failed to load leaderboard:', error);
      
      // Return cached data if available, even if stale
      if (this.cachedLeaderboard) {
        console.log('⚠️ Returning stale cached data due to error');
        return this.cachedLeaderboard;
      }
      
      // Return empty array if no cache and Firebase fails
      return [];
    }
  }

  /**
   * Check if a score qualifies for top 10
   */
  static async isTopTen(kills: number): Promise<boolean> {
    try {
      const leaderboard = await this.getLeaderboard();
      
      // If less than 10 entries, always qualifies
      if (leaderboard.length < this.MAX_ENTRIES) {
        return true;
      }

      // Check if kills beats the 10th place score
      const lowestScore = leaderboard[leaderboard.length - 1].kills;
      return kills > lowestScore;
    } catch (error) {
      console.error('Failed to check top 10 status:', error);
      return false;
    }
  }

  /**
   * Get the ranking position for a given kill count (1-based)
   * Returns null if not in top 10
   */
  static async getRanking(kills: number): Promise<number | null> {
    try {
      const leaderboard = await this.getLeaderboard();
      
      // Find where this score would rank
      let rank = 1;
      for (const entry of leaderboard) {
        if (kills > entry.kills) {
          return rank;
        }
        rank++;
        if (rank > this.MAX_ENTRIES) {
          return null; // Not in top 10
        }
      }
      
      // If we got here, it's either in the remaining spots or qualifies
      return rank <= this.MAX_ENTRIES ? rank : null;
    } catch (error) {
      console.error('Failed to get ranking:', error);
      return null;
    }
  }

  /**
   * Validate score before submission (anti-cheat)
   */
  private static validateScore(name: string, kills: number): { valid: boolean; reason?: string } {
    // Check name format
    if (!name || name.length !== 3) {
      return { valid: false, reason: 'Name must be exactly 3 letters' };
    }
    
    if (!/^[A-Z]{3}$/.test(name)) {
      return { valid: false, reason: 'Name must be 3 uppercase letters' };
    }
    
    // Check kills is reasonable
    if (kills < 0) {
      return { valid: false, reason: 'Kills cannot be negative' };
    }
    
    if (kills > this.MAX_REASONABLE_KILLS) {
      return { valid: false, reason: `Kills exceeds maximum (${this.MAX_REASONABLE_KILLS})` };
    }
    
    return { valid: true };
  }

  /**
   * Add a new entry to the leaderboard
   * Returns the ranking position (1-10) or null if didn't make top 10
   */
  static async addEntry(name: string, kills: number): Promise<number | null> {
    try {
      // Normalize name (uppercase, trim to 3 chars)
      const normalizedName = name.toUpperCase().substring(0, 3).padEnd(3, '_');
      
      // Validate score
      const validation = this.validateScore(normalizedName, kills);
      if (!validation.valid) {
        console.warn('⚠️ Score validation failed:', validation.reason);
        return null;
      }

      // Check if qualifies for top 10 before submitting
      const qualifies = await this.isTopTen(kills);
      if (!qualifies) {
        console.log('📊 Score does not qualify for top 10');
        return null;
      }

      // Get ranking BEFORE adding to database (so we don't compare against ourselves)
      const ranking = await this.getRanking(kills);

      // Add to Realtime Database
      const leaderboardRef = ref(db, this.DB_PATH);
      await push(leaderboardRef, {
        name: normalizedName,
        kills: kills,
        timestamp: Date.now(), // Client timestamp (Realtime DB serverTimestamp is tricky with get/set)
        deviceId: this.getDeviceId()
      });

      console.log('✅ Score saved to leaderboard');

      // Invalidate cache so next fetch gets fresh data
      this.cachedLeaderboard = null;
      this.cacheTimestamp = 0;

      return ranking;
      
    } catch (error) {
      console.error('❌ Failed to add entry to leaderboard:', error);
      return null;
    }
  }

  /**
   * Clear the leaderboard cache (force fresh fetch on next request)
   */
  static clearCache(): void {
    this.cachedLeaderboard = null;
    this.cacheTimestamp = 0;
    console.log('🗑️ Leaderboard cache cleared');
  }

  /**
   * Diagnostic: Test basic Firebase connection
   */
  static async testConnection(): Promise<void> {
    console.log('🔍 Testing Firebase Realtime Database connection...');
    const startTime = Date.now();
    
    try {
      const leaderboardRef = ref(db, this.DB_PATH);
      const snapshot = await get(leaderboardRef);
      
      const elapsed = Date.now() - startTime;
      
      if (!snapshot.exists()) {
        console.log(`✅ Connection successful! (${elapsed}ms)`);
        console.log('📝 Leaderboard is empty. Run LeaderboardManager.seedTestData() to add sample scores');
      } else {
        let count = 0;
        snapshot.forEach(() => { count++; });
        console.log(`✅ Connection successful! Fetched ${count} entries in ${elapsed}ms`);
        
        snapshot.forEach((childSnapshot) => {
          console.log('Entry:', childSnapshot.key, childSnapshot.val());
        });
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Connection failed after ${elapsed}ms:`, error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  }

  /**
   * Clear ALL leaderboard data (WARNING: Cannot be undone!)
   */
  static async clearAllData(): Promise<void> {
    const confirmed = confirm('⚠️ WARNING: This will delete ALL leaderboard data!\n\nAre you sure?');
    if (!confirmed) {
      console.log('❌ Cancelled');
      return;
    }

    console.log('🗑️ Clearing all leaderboard data...');
    
    try {
      const leaderboardRef = ref(db, this.DB_PATH);
      await remove(leaderboardRef);
      
      console.log('✅ All leaderboard data cleared!');
      this.clearCache(); // Clear cache
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  }

  /**
   * Seed test data for development/testing
   */
  static async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test leaderboard data...');
    
    const testScores = [
      { name: 'ACE', kills: 500 },
      { name: 'MAX', kills: 450 },
      { name: 'SAM', kills: 400 },
      { name: 'REX', kills: 350 },
      { name: 'JOE', kills: 300 },
      { name: 'ANN', kills: 250 },
      { name: 'BOB', kills: 200 },
      { name: 'ZOE', kills: 150 },
      { name: 'TOM', kills: 100 },
      { name: 'KIM', kills: 50 }
    ];

    try {
      const leaderboardRef = ref(db, this.DB_PATH);
      
      for (const score of testScores) {
        await push(leaderboardRef, {
          name: score.name,
          kills: score.kills,
          timestamp: Date.now() - Math.random() * 86400000, // Random times in last 24h
          deviceId: 'test_device'
        });
        console.log(`✅ Added: ${score.name} - ${score.kills} kills`);
      }
      
      console.log('🎉 Test data seeded successfully!');
      this.clearCache(); // Clear cache to force fresh fetch
    } catch (error) {
      console.error('❌ Failed to seed test data:', error);
    }
  }

  /**
   * Get formatted time string (MM:SS)
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).LeaderboardManager = LeaderboardManager;
  console.log('💡 LeaderboardManager exposed to console. Try: LeaderboardManager.testConnection()');
}
