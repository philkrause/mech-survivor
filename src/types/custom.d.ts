declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

const GAME_CONFIG = {
  PLAYER: {
    SPEED: 300,
    SCALE: 0.5,
    DEPTH: 10
  },
  ENEMY: {
    SPEED: 100,
    SCALE: 0.4,
    DEPTH: 5,
    SPAWN_INTERVAL: 10,
    MAX_COUNT: 1000,
    SPAWN_PADDING: 20
  }
} 