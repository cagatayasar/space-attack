import Phaser from 'phaser';
import { COLORS, createSprites, pixelText } from './pixels';
import { PLAYER, PlayerControls } from './player';
import { EnemyFormation, FORMATION_ROWS } from './formation';
import { DIVE, DiveFlight, diveInterval, diveLimit } from './dives';
import { ENEMY_FIRE, EnemyFire } from './enemyFire';
import { PlayerSurvival } from './survival';
import { Scoring } from './scoring';
import { WaveTransition } from './waves';
import { DISPLAY, PIXEL_WIDTH, PIXEL_HEIGHT, RASTER_WIDTH, RASTER_HEIGHT, pixelCenter, spritePixelPosition } from './display';

class SpaceAttack extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Graphics;
  private message!: Phaser.GameObjects.Graphics;
  private reserves: Phaser.GameObjects.Image[] = [];
  private stars: Phaser.GameObjects.Rectangle[] = [];
  private starFrame = 0;
  private enemies: Phaser.GameObjects.Image[] = [];
  private formation = new EnemyFormation();
  private dives = new Map<Phaser.GameObjects.Image, DiveFlight>();
  private diveWait = 1.5;
  private controls = new PlayerControls();
  private bullets: Phaser.GameObjects.Rectangle[] = [];
  private enemyFire = new EnemyFire();
  private enemyBullets: Phaser.GameObjects.Rectangle[] = [];
  private survival = new PlayerSurvival();
  private scoring = new Scoring();
  private wave = 0;
  private waveTransition = new WaveTransition();
  private playing = false;
  private firePressed = false;
  private renderPositions: { image: Phaser.GameObjects.Image; x: number; y: number }[] = [];

  create() {
    // Keep simulation coordinates intact while rasterizing onto a shared low-res grid.
    this.cameras.main.setZoom(1 / RASTER_WIDTH, 1 / RASTER_HEIGHT)
      .centerOn(DISPLAY.worldWidth / 2, DISPLAY.worldHeight / 2);
    createSprites(this);
    // Sparse, fixed yellow pinpricks rather than a decorative blue starfield.
    const stars = [[160,266],[360,266],[680,266],[320,290],[480,290],[640,290],
      [240,314],[440,314],[120,338],[560,338],[240,362],[400,362],[640,386],
      [240,410],[480,410],[80,434],[360,434],[560,434],[280,458],[160,482],
      [440,482],[600,482],[280,506],[560,506],[80,554],[160,554],[400,554],
      [640,554],[240,578],[480,578]];
    this.stars = stars.map(([x, y]) => this.add.rectangle(
      pixelCenter(x, PIXEL_WIDTH), pixelCenter(y, PIXEL_HEIGHT),
      PIXEL_WIDTH, PIXEL_HEIGHT, COLORS.yellow).setAlpha(0.65));
    this.player = this.add.image(PLAYER.startX, PLAYER.y, 'ship')
      .setScale(PIXEL_WIDTH, PIXEL_HEIGHT).setTint(COLORS.cyan).setVisible(false);
    this.keys = this.input.keyboard!.addKeys('A,D,LEFT,RIGHT,SPACE,ENTER') as typeof this.keys;
    this.input.keyboard!.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.keys.SPACE.on('down', () => { if (this.playing && this.survival.canAct) this.firePressed = true; });
    this.keys.ENTER.on('down', () => { if (!this.playing) this.start(); });
    this.hud = this.add.graphics().setDepth(5);
    this.reserves = [560, 600, 640].map(x => this.add.image(x, 608, 'ship')
      .setScale(PIXEL_WIDTH, PIXEL_HEIGHT).setTint(COLORS.green).setDepth(5));
    this.message = this.add.graphics().setDepth(10);
    pixelText(this.message, 'VA LTD 1982', 210, 360, COLORS.yellow, 4, 3, 16);
    this.spawnWave(true);
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, this.snapSpritesForRender, this);
    this.events.on(Phaser.Scenes.Events.RENDER, this.restoreSpritePositions, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PRE_RENDER, this.snapSpritesForRender, this);
      this.events.off(Phaser.Scenes.Events.RENDER, this.restoreSpritePositions, this);
    });
  }

  private snapSpritesForRender() {
    for (const image of [this.player, ...this.reserves, ...this.enemies]) {
      if (!image.active || !image.visible) continue;
      this.renderPositions.push({ image, x: image.x, y: image.y });
      image.setPosition(
        spritePixelPosition(image.x, image.displayWidth * image.originX, RASTER_WIDTH),
        spritePixelPosition(image.y, image.displayHeight * image.originY, RASTER_HEIGHT));
    }
  }

  private restoreSpritePositions() {
    // Restore precise positions before the next simulation/collision update.
    for (const { image, x, y } of this.renderPositions) image.setPosition(x, y);
    this.renderPositions.length = 0;
  }

  private refreshHud() {
    this.hud.clear();
    pixelText(this.hud, this.scoring.total.toString().padStart(6, '0'), 80, 48, COLORS.yellow);
    // The reference's second score counter is a visual placeholder for now.
    pixelText(this.hud, '000000', 480, 48, COLORS.yellow);
    pixelText(this.hud, 'E', 80, 600, COLORS.red, 4, 3);
    // Retain the final whole pixel while energy remains, then draw nothing at zero.
    const energyPixels = this.survival.energy > 0
      ? Math.max(1, Math.round(360 / PIXEL_WIDTH * this.survival.energy)) : 0;
    this.hud.fillStyle(COLORS.green).fillRect(110, Math.round(596 / PIXEL_HEIGHT) * PIXEL_HEIGHT,
      energyPixels * PIXEL_WIDTH, Math.round(22 / PIXEL_HEIGHT) * PIXEL_HEIGHT);
    pixelText(this.hud, String(this.wave), 684, 600, COLORS.red, 4, 3);
    this.reserves.forEach((ship, index) => ship.setVisible(this.wave > 0 && index < this.survival.lives - 1));
  }

  private start() {
    this.enemies.forEach(item => item.destroy());
    this.enemies = [];
    this.controls.reset();
    this.firePressed = false;
    this.bullets.forEach(bullet => bullet.setVisible(false));
    this.survival.reset();
    this.scoring.reset();
    this.wave = 0;
    this.player.setTexture('ship').setPosition(PLAYER.startX, PLAYER.y).setVisible(true).setAlpha(1);
    this.message.setVisible(false);
    this.playing = true;
    this.spawnWave();
  }

  private spawnWave(preview = false) {
    this.waveTransition.reset();
    if (!preview) this.wave++;
    this.formation.reset();
    this.dives.clear();
    this.diveWait = 1.5;
    this.clearEnemyFire();
    this.survival.refill();
    FORMATION_ROWS.forEach((columns, row) => {
      const type = row === 0 ? 'yellow' : row === 2 ? 'green' : 'red';
      columns.forEach(column => {
        const { x, y } = this.formation.position(column, row);
        const texture = type !== 'yellow' && Math.abs(column) % 2 === 1 ? `${type}Alternate` : type;
        // Reference silhouettes occupy about 7/8 of each 40 x 22 formation slot.
        this.enemies.push(this.add.image(x, y, texture).setScale(PIXEL_WIDTH, PIXEL_HEIGHT).setTint(COLORS[type]).setData({ column, row, diveRest: 0 }));
      });
    });
    this.refreshHud();
  }

  private launchDive(dt: number) {
    this.diveWait -= dt;
    if (this.diveWait > 0 || this.dives.size >= diveLimit(this.wave)) return;
    const docked = this.enemies.filter(enemy => enemy.active && !this.dives.has(enemy) && enemy.getData('diveRest') === 0);
    // All ranks can dive with enemies beneath them. Uniform selection is a tuning
    // choice; the recording does not establish the original selection algorithm.
    if (!docked.length) return;
    const enemy = Phaser.Utils.Array.GetRandom(docked);
    this.dives.set(enemy, new DiveFlight({ x: enemy.x, y: enemy.y },
      enemy.getData('column') < 0 ? -1 : 1, this.wave));
    this.diveWait = diveInterval(this.wave);
  }

  private clearEnemyFire() {
    this.enemyFire.reset();
    this.enemyBullets.forEach(bullet => bullet.setVisible(false));
  }

  private loseLife() {
    this.clearEnemyFire();
    this.controls.clearFire();
    this.firePressed = false;
    this.bullets.forEach(bullet => bullet.setVisible(false));
    this.refreshPlayer();
  }

  private refreshPlayer() {
    this.player.setTexture(this.survival.phase === 'dying' ? 'playerExplosion' : 'ship')
      .setPosition(this.controls.x, PLAYER.y).setAlpha(1)
      .setVisible(this.survival.canAct || this.survival.phase === 'dying');
    if (this.survival.phase === 'gameover') {
      this.playing = false;
      this.player.setVisible(false);
      this.message.clear().setVisible(true);
      pixelText(this.message, 'GAME OVER', 276, 306, COLORS.yellow, 3, 2, 10);
      pixelText(this.message, 'PRESS ENTER', 248, 346, COLORS.yellow, 3, 2, 10);
    }
  }

  private updateEnemies(dt: number, active: boolean) {
    if (active) this.formation.update(dt);
    for (const enemy of this.enemies) {
      const home = this.formation.position(enemy.getData('column'), enemy.getData('row'));
      const flight = this.dives.get(enemy);
      if (flight) {
        // Existing divers finish their flights while the formation is held.
        const position = flight.update(dt, home);
        enemy.setPosition(position.x, position.y).setVisible(position.visible);
        if (position.done) {
          this.dives.delete(enemy);
          enemy.setData('diveRest', DIVE.restSeconds);
        }
      } else {
        if (active) enemy.setData('diveRest', Math.max(0, enemy.getData('diveRest') - dt));
        enemy.setPosition(home.x, home.y).setVisible(true);
      }
    }
    if (active) this.launchDive(dt);
  }

  update(_time: number, delta: number) {
    // Blink for two game frames on, then two frames off.
    const starsOn = this.starFrame < 2;
    this.starFrame = (this.starFrame + 1) % 4;
    this.stars.forEach(star => {
      star.setAlpha(0.65);
      star.setVisible(starsOn);
    });
    const dt = Math.min(delta, 50) / 1000;
    if (!this.playing) {
      if (this.wave === 0) {
        this.formation.update(dt);
        for (const enemy of this.enemies) {
          const home = this.formation.position(enemy.getData('column'), enemy.getData('row'));
          enemy.setPosition(home.x, home.y);
        }
      }
      return;
    }
    const wasActive = this.survival.canAct;
    if (this.survival.update(dt)) this.loseLife();
    if (!wasActive || !this.survival.canAct) {
      this.firePressed = false;
      this.updateEnemies(dt, false);
      this.refreshPlayer();
      this.refreshHud();
      return;
    }
    this.controls.update(dt, this.keys.A.isDown || this.keys.LEFT.isDown,
      this.keys.D.isDown || this.keys.RIGHT.isDown, this.keys.SPACE.isDown || this.firePressed);
    this.firePressed = false;
    this.refreshPlayer();
    this.updateEnemies(dt, true);
    for (const shot of [...this.controls.shots]) {
      const hit = this.enemies.filter(enemy => enemy.active && this.controls.hit(shot, enemy.getBounds()))
        .sort((a, b) => b.y - a.y)[0];
      if (hit) {
        // Read rank and flight state before destroy clears the enemy's data.
        if (this.scoring.recordKill(hit.getData('row'), this.dives.has(hit))) {
          this.survival.lives++;
        }
        this.dives.delete(hit);
        hit.destroy();
        this.controls.shots.splice(this.controls.shots.indexOf(shot), 1);
      }
    }
    // Keep shots one art-pixel wide without changing their collision width.
    while (this.bullets.length < this.controls.shots.length) {
      this.bullets.push(this.add.rectangle(0, 0, PIXEL_WIDTH, PLAYER.shotHeight, 0xffffff));
    }
    this.bullets.forEach((bullet, index) => {
      const shot = this.controls.shots[index];
      bullet.setVisible(!!shot && shot.y + PLAYER.shotHeight / 2 >= PLAYER.shotTop);
      if (shot) bullet.setPosition(pixelCenter(shot.x, PIXEL_WIDTH), shot.y);
    });
    const playerBounds = new Phaser.Geom.Rectangle(this.controls.x - PLAYER.width / 2,
      PLAYER.y - PLAYER.height / 2, PLAYER.width, PLAYER.height);
    this.enemyFire.update(dt, this.wave,
      [...this.dives.keys()].filter(enemy => enemy.active), this.survival.canAct);
    if (this.enemyFire.shots.some(shot => this.enemyFire.hit(shot, playerBounds)) && this.survival.damage()) {
      this.loseLife();
    }
    for (const enemy of this.enemies) {
      if (enemy.active && Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), playerBounds) && this.survival.damage()) {
        enemy.destroy();
        this.loseLife();
        break;
      }
    }
    for (const enemy of this.dives.keys()) if (!enemy.active) this.dives.delete(enemy);
    this.enemies = this.enemies.filter(item => item.active);
    if (this.survival.canAct && this.waveTransition.update(dt, this.enemies.length)) this.spawnWave();
    while (this.enemyBullets.length < this.enemyFire.shots.length) {
      this.enemyBullets.push(this.add.rectangle(0, 0, PIXEL_WIDTH, ENEMY_FIRE.height, 0xffffff));
    }
    this.enemyBullets.forEach((bullet, index) => {
      const shot = this.enemyFire.shots[index];
      bullet.setVisible(!!shot && shot.y - ENEMY_FIRE.height / 2 <= ENEMY_FIRE.bottom);
      if (shot) bullet.setPosition(pixelCenter(shot.x, PIXEL_WIDTH), shot.y);
    });
    this.refreshHud();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: '#000000',
  pixelArt: true,
  // Phaser rounds world coordinates before zoom; we snap to raster pixels above.
  roundPixels: false,
  fps: { target: 60, limit: 60 },
  scale: { mode: Phaser.Scale.NONE },
  scene: SpaceAttack,
});
