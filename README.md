# starwars-survivor

A simplified Vampire Survivors-like game built with React and Phaser 3.

## Description

This is a browser-based, top-down view game where the player character automatically attacks waves of enemies. The game features:

- Player character movement
- Enemy spawning in waves
- Automatic player attacks (firing projectiles)
- Basic level-up choices
- Experience and leveling system
- Player and enemy health systems
- Game over state

## Development Setup

This project was bootstrapped with Vite.

### Prerequisites

- Node.js (version 18+ recommended)
- npm

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Navigate to the project directory
cd starwars-survivor

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Tech Stack

- React
- Phaser 3 (game framework)
- TypeScript
- Vite (build tool)

## Project Structure

```
starwars-survivor/
├── public/             # Static assets
│   └── assets/         # Game assets (sprites, sounds)
├── src/
│   ├── phaser/         # Phaser game code
│   │   ├── config/     # Game configuration
│   │   ├── entities/   # Game entities (player, enemies)
│   │   ├── scenes/     # Game scenes
│   │   ├── systems/    # Game systems (enemies, projectiles, etc.)
│   │   └── ui/         # UI components
│   ├── components/     # React components
│   ├── App.tsx         # Main App component
│   └── main.tsx        # Entry point
└── package.json        # Dependencies and scripts
```

## Future Enhancements

- Additional enemy types
- More weapon types
- Power-ups
- Sound effects and music
- Save game functionality
