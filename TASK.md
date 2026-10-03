# Space Attack

Build a small, polished browser arcade game where the player pilots a spaceship against waves of enemies.

## Technology stack

- Phaser for rendering, keyboard input, scenes, collisions, audio, and effects.
- TypeScript for game logic.
- Vite for local development and production builds.
- HTML and CSS for the surrounding page and responsive game frame.
- No backend required for the initial scope.

## Required features

- Keyboard movement and firing, with on-screen control instructions.
- Enemy waves and working collisions between ships and projectiles.
- A visible score and health or lives indicator.
- Increasing difficulty as the player progresses.
- A start screen, game-over screen, and restart flow.

## Visual direction

Use the supplied arcade-shooter screenshot as visual inspiration: a dark space background, bright retro spaceship and enemy sprites, enemy formations, clear projectiles, and a readable HUD. Aim for a cohesive, polished presentation with responsive controls and clear hit feedback.

## Acceptance criteria

- The game runs in a browser through the Vite development server and builds for static hosting.
- Players can start a game, move and fire using the displayed controls, and fight successive waves.
- Collisions affect enemies and player health or lives correctly, and the score updates visibly.
- Later waves become more challenging.
- Losing all health or lives shows the game-over screen.
- Restart begins a fresh run with score, health or lives, enemies, and difficulty reset.

## Optional polish

- Sound effects with a mute control.
- Particle effects and subtle screen feedback.
- A locally saved high score and sound preference.
