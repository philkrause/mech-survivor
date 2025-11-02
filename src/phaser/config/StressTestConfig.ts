/**
 * Stress test configurations to push game limits
 */
export const STRESS_TEST_CONFIGS = {
  // Normal gameplay (baseline)
  NORMAL: {
    name: 'Normal',
    enemySpawnInterval: 2000,
    enemyMaxCount: 150,
    atEnemySpawnInterval: 5000,
    atEnemyMaxCount: 10,
    tFighterSpawnInterval: 5000,
    tFighterMaxCount: 150,
    projectileMaxCount: 50,
    experienceOrbMaxCount: 300,
    particleEffectsEnabled: true,
    healthBarsEnabled: true,
    screenShakeEnabled: true
  },

  // Moderate stress test
  MODERATE: {
    name: 'Moderate Stress',
    enemySpawnInterval: 500, // 4x faster spawning
    enemyMaxCount: 1000, // 6.7x more enemies
    atEnemySpawnInterval: 2000, // 2.5x faster
    atEnemyMaxCount: 50, // 5x more
    tFighterSpawnInterval: 1000, // 5x faster
    tFighterMaxCount: 500, // 3.3x more
    projectileMaxCount: 200, // 4x more projectiles
    experienceOrbMaxCount: 2000, // 6.7x more orbs
    particleEffectsEnabled: true,
    healthBarsEnabled: true,
    screenShakeEnabled: true
  },

  // High stress test
  HIGH: {
    name: 'High Stress',
    enemySpawnInterval: 200, // 10x faster spawning
    enemyMaxCount: 2500, // 16.7x more enemies
    atEnemySpawnInterval: 1000, // 5x faster
    atEnemyMaxCount: 100, // 10x more
    tFighterSpawnInterval: 400, // 12.5x faster
    tFighterMaxCount: 1000, // 6.7x more
    projectileMaxCount: 500, // 10x more projectiles
    experienceOrbMaxCount: 5000, // 16.7x more orbs
    particleEffectsEnabled: true,
    healthBarsEnabled: false, // Disable for performance
    screenShakeEnabled: false // Disable for performance
  },

  // Extreme stress test
  EXTREME: {
    name: 'Extreme Stress',
    enemySpawnInterval: 100, // 20x faster spawning
    enemyMaxCount: 5000, // 33x more enemies
    atEnemySpawnInterval: 500, // 10x faster
    atEnemyMaxCount: 200, // 20x more
    tFighterSpawnInterval: 200, // 25x faster
    tFighterMaxCount: 2000, // 13x more
    projectileMaxCount: 1000, // 20x more projectiles
    experienceOrbMaxCount: 10000, // 33x more orbs
    particleEffectsEnabled: false, // Disable for performance
    healthBarsEnabled: false, // Disable for performance
    screenShakeEnabled: false // Disable for performance
  },

  // Insane stress test (Vampire Survivors level)
  INSANE: {
    name: 'Insane Stress (VS Level)',
    enemySpawnInterval: 50, // 40x faster spawning
    enemyMaxCount: 10000, // 67x more enemies
    atEnemySpawnInterval: 200, // 25x faster
    atEnemyMaxCount: 500, // 50x more
    tFighterSpawnInterval: 100, // 50x faster
    tFighterMaxCount: 5000, // 33x more
    projectileMaxCount: 2000, // 40x more projectiles
    experienceOrbMaxCount: 20000, // 67x more orbs
    particleEffectsEnabled: false, // Disable for performance
    healthBarsEnabled: false, // Disable for performance
    screenShakeEnabled: false // Disable for performance
  },

  // Nightmare stress test (Ultimate chaos)
  NIGHTMARE: {
    name: 'Nightmare Stress (Ultimate Chaos)',
    enemySpawnInterval: 25, // 80x faster spawning
    enemyMaxCount: 20000, // 133x more enemies
    atEnemySpawnInterval: 100, // 50x faster
    atEnemyMaxCount: 1000, // 100x more
    tFighterSpawnInterval: 50, // 100x faster
    tFighterMaxCount: 10000, // 67x more
    projectileMaxCount: 4000, // 80x more projectiles
    experienceOrbMaxCount: 40000, // 133x more orbs
    particleEffectsEnabled: false, // Disable for performance
    healthBarsEnabled: false, // Disable for performance
    screenShakeEnabled: false // Disable for performance
  }
};

export type StressTestLevel = keyof typeof STRESS_TEST_CONFIGS;
