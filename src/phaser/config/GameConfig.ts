/**
 * Main game configuration constants
 */
export const GAME_CONFIG = {
  DEBUG: false, // Set to false to show FPS, enemy count, and level debug info
  PHYSICS_DEBUG: false, // Set to true to show physics hitboxes (SLOW in Chrome!)
  PERFORMANCE_PROFILE: false, // Set to true to log performance timings (helps find bottlenecks) - disable for production
  PLAYER: {
    SPEED: 120,
    SCALE: 1,
    DEPTH: 10,
    HITBOX_SCALE: 1,
    ATTACK_INTERVAL: 100, // ms between attacks
    MAX_HEALTH: 100, // Maximum player health
    DAMAGE_INTERVAL: 500, // ms between damage ticks when overlapping enemies
    DAMAGE_AMOUNT: 5, // Amount of damage taken per tick
    DAMAGE_TINT: 0xff0000, // Red tint when damaged
    INVULNERABLE_DURATION: 200, // ms of invulnerability after taking damage (prevents rapid damage)
    HEALTH_BAR_WIDTH: 50, // Width of health bar in pixels
    HEALTH_BAR_HEIGHT: 10, // Height of health bar in pixels
    DASH: {
      COOLDOWN: 3000, // ms cooldown time (3 seconds)
      DURATION: 500, // ms dash duration
      SPEED_MULTIPLIER: 3.0, // How much faster than normal speed during dash
      DISTANCE: 150 // Distance to dash
    },
    EXPERIENCE: {
      PICKUP_RADIUS: 100, // Radius in pixels for auto-pickup
      MAGNET_RADIUS: 100, // Radius in pixels for experience magnet effect
      MAGNET_SPEED: 10// Speed at which orbs move toward player when in magnet radius
    }
  },
  ENEMY: {
    SPEED: 50,
    SCALE: 1,
    DEPTH: 5,
    SPAWN_INTERVAL: 2000, // ms between spawns (base interval)
    MAX_COUNT: 10000,
    SPAWN_PADDING: 20, // Distance from edge
    HITBOX_SCALE: .75,
    TINT: 0xff0000,
    MAX_HEALTH: 50, // Number of hits to defeat an enemy
    DAMAGE_TINT: 0xff8800, // Orange tint when damaged
    KNOCKBACK_FORCE: 300, // Force applied when hit
    KNOCKBACK_DURATION: 200, // ms of knockback effect
    EXPERIENCE_DROP_CHANCE: 1, // Chance (0-1) of dropping an experience orb
    RELIC_DROP_CHANCE: 0.01, // Chance (0-1) for relic drop on death
    HEALTH_DROP_CHANCE: 0.01, // Chance (0-1) for health drop on death
    HEALTH_DROP_HEAL_AMOUNT: 10, // Amount of health restored when picking up a health drop
    // Wave-based spawning (Vampire Survivors style)
    WAVES: {
      ENABLED: true, // Enable wave-based spawning
      START_DELAY: 60000, // ms - delay before waves start (60000 = 1 minute)
      WAVE_DURATION: 15000, // ms - how long a wave lasts (intense spawning)
      LULL_DURATION: 8000, // ms - how long lull period lasts (reduced spawning)
      MIN_WAVE_DURATION: 10000, // ms - minimum wave duration (scales down over time)
      MIN_LULL_DURATION: 4000, // ms - minimum lull duration (scales down over time)
      BURST_SPAWN_COUNT: 5, // Number of enemies to spawn in burst during wave
      BURST_SPAWN_INTERVAL: 200, // ms between enemies in a burst
      LULL_SPAWN_MULTIPLIER: 0.3, // During lull, spawn at 30% of normal rate
      WAVE_INTENSITY_SCALING: 0.95, // Wave intensity increases by 5% per wave (duration decreases)
    },
    // Spawn rate scaling
    LEVEL_SCALING: {
      REDUCTION_PER_LEVEL: 0.5, // 25% reduction per level (e.g., level 2 = 75% of base, level 3 = 50% of base)
      MIN_REDUCTION_FACTOR: 1, // Minimum 30% of base interval (prevents going below this)
    },
    TIME_SCALING: {
      REDUCTION_PER_MINUTE: 0.5, // 50% reduction per minute - reaches max reduction in 1 minute (1 min = 50% of base)
      MAX_REDUCTION: 1, // Maximum 50% reduction from time alone (interval never goes below 50% of base from time)
      // Note: With 0.5 per minute, spawn interval is 100% of base at 0 min, then 50% of base from 1 min onwards
    },
    // Enemy type unlocks by level
    TYPE_UNLOCKS: {
      hover: 1, // Available from level 1
      steppercannon: 5, // Unlock at level 2
      soldier1: 2, // Unlock at level 3
    },
    // Per-type overrides (multipliers against MAX_HEALTH)
    TYPES: {
      hover: { 
        HEALTH_MULTIPLIER: 0.25,
        HITBOX_SCALE: 0.5 // Use default hitbox scale
      },
      steppercannon: { 
        HEALTH_MULTIPLIER: .35,
        HITBOX_SCALE: 0.5 // Use default hitbox scale
      },
      soldier1: { 
        HEALTH_MULTIPLIER: .5,
        HITBOX_SCALE: 0.5, // Hitbox for floater at 2x scale (50% of displayed size)
      },
    }
  },
  TFIGHTER: {
    SPEED: 50,
    SCALE: 2,
    DEPTH: 7,
    SPAWN_INTERVAL: 5000, // ms between spawns
    MAX_COUNT: 150,
    MIN_LEVEL: 5, // Minimum player level before T-Fighters spawn
    SPAWN_PADDING: 20, // Distance from edge
    HITBOX_SCALE: 1,
    TINT: 0xff0000,
    MAX_HEALTH: 50, // Number of hits to defeat an enemy
    DAMAGE_TINT: 0xff8800, // Orange tint when damaged
    KNOCKBACK_FORCE: 300, // Force applied when hit
    KNOCKBACK_DURATION: 200, // ms of knockback effect
    EXPERIENCE_DROP_CHANCE: 1, // Chance (0-1) of dropping an experience orb
    RELIC_DROP_CHANCE: 0.01 // Chance (0-1) for relic drop on death
  },
  AT: {
    SPAWN_INTERVAL: 2000, // ms between spawns (base interval)
    MAX_COUNT: 30, // Maximum number of AT enemies at once
    MIN_LEVEL: 7, // Minimum player level before AT enemies spawn
    RELIC_DROP_CHANCE: 0.01
  },
  WALKER: {
    SPAWN_INTERVAL: 2500, // ms between spawns (base interval)
    MAX_COUNT: 30, // Maximum number of Walker enemies at once
    MIN_LEVEL: 9, // Minimum player level before Walker enemies spawn
    RELIC_DROP_CHANCE: 0.01,
    AIMING_DURATION: 1000, // ms - how long walker aims (white line, no damage)
    FIRING_DURATION: 1000, // ms - how long walker fires (blue line, does damage)
    LASER_DURATION: 2000, // ms - total laser duration (aiming + firing)
    LASER_DAMAGE: 15, // Reduced damage per hit when player touches laser
    LASER_DAMAGE_INTERVAL: 200 // ms - interval between damage ticks when player is in laser
  },
  EXPERIENCE_ORB: {
    KEY: 'experience_orb',
    SCALE: 1,
    DEPTH: 3,
    TINT: 0x00ffff, // Cyan color
    VALUE: 2, // Each orb gives 1 XP, player needs 25 for first level up
    LIFESPAN: 30000, // ms before disappearing
    MAX_COUNT: 300, // Maximum number of orbs
    PULSE_DURATION: 1000, // ms for pulse animation
    PULSE_SCALE: 1.2 // Maximum scale during pulse
  },
  BLASTER: {
    PLAYER: {
      KEY: 'blaster',
      SPEED: 500,
      LIFESPAN: 2000, // ms - increased lifespan
      SCALE: 1,
      DAMAGE: 5,
      ROTATEWITHDIRECTION: true,
      MAXSIZE: 50, // increased pool size
      MAX_COUNT: 50, // increased pool size
      TINT: 0xffffff, // No tint - use original red color from image
      DEPTH: 3,
      BASE_ATTACK_INTERVAL: 150, // ms between blaster shots (base rate)
    },
    ENEMY: {
      KEY: 'enemy_laser', // Use laser.png texture but with unique key
      SPEED: 300,
      LIFESPAN: 3000, // ms - longer lifespan
      SCALE: 0.8,
      DAMAGE: 10,
      ROTATEWITHDIRECTION: true,
      MAXSIZE: 30, // smaller pool size
      MAX_COUNT: 30, // smaller pool size
      TINT: 0xff4444, // slightly different red
      DEPTH: 2,
    },
  },
  FORCE: {
    PLAYER: {
      KEY: 'player_force',
      BASEDAMAGE: 20,
      RADIUS: 10,
      ENDRADIUS: 150,
      STRENGTH: 2,
      FADEDURATION: 500,
      COLOR: 0xaa00ff,
      ALPHA: .5,
      MAXSIZE: 200,
      SCALE: 2,
      DEPTH: 3,
      LIFESPAN: 500, // ms
      TINT: 0xaa00ff, // purple color
    },
  },
  FLAMETHROWER: {
    PLAYER: {
      KEY: 'blue_slash',
      DURATION: 600,
      SCALE: 2.5, // Reduced from 3 for smaller flamethrower size
      DEPTH: 3,
      BASEDAMAGE: 10,
      WIDTH: 50,
      HEIGHT: 50,
      TINT: 100,
      OFFSETX: 100,
      OFFSETY: 8,
      INTERVAL: 3500, // Increased from 2000 to lower frequency
      GROWSCALE: 500, // ms
      DAMAGEMULTIPLIER: 1, // Damage multiplier for flamethrower
    },
  },

  COMBAT_DRONE: {
    SCALE: 1.0, // Increased from 0.75 for larger combat drone
    DEPTH: 5,
    BASEDAMAGE: 20, // Base damage per hit
    ROLL_SPEED: 600, // Pixels per second
    ROLL_DISTANCE: 500, // Maximum roll distance
    ATTACK_INTERVAL: 1000, // ms between attacks
    HIT_RADIUS: 25, // Hit detection radius
    FOLLOW_OFFSET: 40, // Distance to maintain from player when idle
    LAZY_FOLLOW_SPEED: 200, // Speed for lazy follow (unused, kept for compatibility)
    LAZY_FOLLOW_SMOOTHING: 0.08, // Lerp smoothing factor (0-1, lower = more lag/lazy)
    IDLE_WOBBLE: 1.5, // Small wobble amplitude when idle
  },

  // Ability unlock levels
  ABILITIES: {
    ATTACK_CHOPPER_UNLOCK_LEVEL: 2, // Level at which Attack Chopper ability unlocks
    FORCE_UNLOCK_LEVEL: 2, // Level at which Plasma Blast ability unlocks
    FLAMETHROWER_UNLOCK_LEVEL: 2, // Level at which Flamethrower ability unlocks
    COMBAT_DRONE_UNLOCK_LEVEL: 2, // Level at which Combat Drone ability unlocks
    LASER_CANNON_UNLOCK_LEVEL: 2, // Level at which Laser Cannon ability unlocks
    AIR_STRIKE_UNLOCK_LEVEL: 2, // Level at which Air Strike ability unlocks
  },
  AIR_STRIKE: {
    FIRE_INTERVAL: 8000, // ms between air strikes
    MISSILE_SPEED: 2000, // pixels per second (increased for faster travel)
    DROP_TIME: 2000, // ms for missile to drop (calculated from speed)
    IMPACT_RADIUS: 100, // pixels - damage radius
    BASEDAMAGE: 50, // Base damage per strike
  },
  LASER_CANNON: {
    FIRE_INTERVAL: 3000, // ms between laser shots
    LASER_DURATION: 1500, // ms - how long the laser line persists
    LASER_DAMAGE: 30, // Damage per hit when enemy touches laser
    LASER_DAMAGE_INTERVAL: 200, // ms - interval between damage ticks when enemy is in laser
  },

  LIGHTING: {
    ENABLED: true, // Enable/disable lighting system
    MAX_LIGHTS: 128, // Maximum number of lights (Phaser default is 10, GPU limit is ~128-256 depending on hardware)
    AMBIENT_COLOR: 0x333333, // Medium-dark ambient lighting (brighter to see glow better from distance)
    PLAYER_LIGHT: {
      COLOR: 0xffffff, // White light for player
      INTENSITY: 1, // Light intensity
      RADIUS: 200 // Light radius in pixels (player's flashlight)
    },
    ENEMY_GLOW: {
      COLOR: 0xff0000, // Red glow for enemies
      INTENSITY: .5, // Light intensity
      RADIUS: 100 // Light radius in pixels
    }
  },

  UI: {
    TEXT_STYLE: {
      fontSize: '18px',
      color: '#ffffff',
      strokeThickness: 2,
      stroke: '#000000'
    }
  },
  SOUNDS: {
    // Volume settings for all sound effects (0-1)
    // Phaser automatically multiplies these by global volume
    BLASTER: 0.3,
    COMBAT_DRONE: 0.6,
    LASER_CANNON: 0.5,
    LASER_CANNON2: 0.25, // Walker enemy laser
    EXPLOSION: .5,
    FLAMETHROWER: 0.5,
    RELIC_PICKUP: 0.4,
    PLAYER_DEATH: 0.5,
    LEVEL_UP: 0.5,
    PAUSE_GAME: 0.3,
    HEALTH_PICKUP: 0.3,
    COLLECT_ORB: 0.2
  }
};

/**
 * Default camera dimensions if not specified elsewhere
 */
export const DEFAULT_DIMENSIONS = {
  WIDTH: 1024,
  HEIGHT: 768
}; 