# Just a Little World

A 3D skateboarding game built with Babylon.js and TypeScript.

## Requirements

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The game will open automatically in your browser at `http://localhost:5173`

## Available Scripts

- `npm start` or `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Features

- 3D skateboarding gameplay
- Trick system with scoring
- Story collection spots
- Timer-based gameplay
- High score tracking
- Admin editor for level design (access via `/admin.html`)

## Controls

- **Movement**: Arrow keys or I/J/K/L
- **Accelerate**: Up / I
- **Brake**: Down / K
- **Turn**: Left/Right or J/L
- **Push**: Shift
- **Jump/Pop**: Space
- **Tricks (WASD)**:
  - W/E: Spin
  - A/Q: Grab
  - D/F: Kickflip
  - S: Shove-it
- **Grind**: Land on a rail
- **Tab**: Toggle controls overlay
- **Escape**: Pause menu

## Project Structure

- `src/` - TypeScript source files
- `index.html` - Main game page
- `admin.html` - Level editor page
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
