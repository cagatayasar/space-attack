import Phaser from 'phaser';

type Box = Phaser.GameObjects.Rectangle;

class SpaceAttack extends Phaser.Scene {
  private player!: Phaser.GameObjects.Triangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private enemies: Box[] = [];
  private bullets: Box[] = [];
  private score = 0;
  private lives = 3;
  private wave = 0;
  private playing = false;
  private nextShot = 0;

  create() {
    for (let i = 0; i < 90; i++) {
      this.add.circle(Phaser.Math.Between(0, 800), Phaser.Math.Between(50, 600), 1, 0x7290b5, Math.random() * 0.6 + 0.2);
    }
    this.player = this.add.triangle(400, 540, 0, 28, 14, 0, 28, 28, 0x69f5dc);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER') as typeof this.keys;
    this.input.keyboard!.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.hud = this.add.text(24, 20, '', { font: '18px monospace', color: '#d7e6ff' });
    this.message = this.add.text(400, 285, 'READY, PILOT?\n\nPress ENTER to start', {
      font: '26px monospace', color: '#69f5dc', align: 'center', backgroundColor: '#080c18', padding: { x: 24, y: 24 },
    }).setOrigin(0.5).setDepth(10);
    this.refreshHud();
  }

  private refreshHud() {
    this.hud.setText(`SCORE ${this.score}     LIVES ${this.lives}     WAVE ${this.wave}`);
  }

  private start() {
    [...this.enemies, ...this.bullets].forEach(item => item.destroy());
    this.enemies = [];
    this.bullets = [];
    this.score = 0;
    this.lives = 3;
    this.wave = 0;
    this.nextShot = 0;
    this.player.setPosition(400, 540);
    this.message.setVisible(false);
    this.playing = true;
    this.spawnWave();
  }

  private spawnWave() {
    this.wave++;
    for (let row = 0; row < Math.min(2 + this.wave, 5); row++) {
      for (let col = 0; col < 8; col++) {
        this.enemies.push(this.add.rectangle(120 + col * 80, 80 + row * 42, 28, 20, row % 2 ? 0xff6989 : 0xb2ef70));
      }
    }
    this.refreshHud();
  }

  update(time: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) && !this.playing) this.start();
    if (!this.playing) return;
    const dt = Math.min(delta, 50) / 1000;
    const down = (a: string, b: string) => Number(this.keys[a].isDown || this.keys[b].isDown);
    const movement = new Phaser.Math.Vector2(down('D', 'RIGHT') - down('A', 'LEFT'), down('S', 'DOWN') - down('W', 'UP')).normalize();
    this.player.x = Phaser.Math.Clamp(this.player.x + movement.x * 340 * dt, 20, 780);
    this.player.y = Phaser.Math.Clamp(this.player.y + movement.y * 340 * dt, 65, 580);
    if (this.keys.SPACE.isDown && time >= this.nextShot) {
      this.bullets.push(this.add.rectangle(this.player.x, this.player.y - 20, 4, 16, 0x69f5dc));
      this.nextShot = time + 170;
    }
    for (const bullet of this.bullets) {
      bullet.y -= 550 * dt;
      if (bullet.y < 0) bullet.destroy();
    }
    for (const enemy of this.enemies) {
      enemy.y += (12 + this.wave * 5) * dt;
      enemy.x += Math.sin(time / 700) * 24 * dt;
      for (const bullet of this.bullets) {
        if (bullet.active && Phaser.Geom.Intersects.RectangleToRectangle(bullet.getBounds(), enemy.getBounds())) {
          bullet.destroy();
          enemy.destroy();
          this.score += 10;
          break;
        }
      }
      if (enemy.active && (enemy.y > 600 || Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), this.player.getBounds()))) {
        enemy.destroy();
        this.lives--;
        this.cameras.main.flash(100, 170, 30, 60);
        if (this.lives <= 0) {
          this.playing = false;
          this.message.setText(`GAME OVER\n\nScore: ${this.score}\n\nPress ENTER to restart`).setVisible(true);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(item => item.active);
    this.enemies = this.enemies.filter(item => item.active);
    if (this.playing && this.enemies.length === 0) this.spawnWave();
    this.refreshHud();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 600,
  backgroundColor: '#080c18',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: SpaceAttack,
});
