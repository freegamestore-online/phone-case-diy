import Phaser from "phaser";

// ─── Virtual canvas ───────────────────────────────────────────────────────────
const VW = 420;
const VH = 700;

// ─── Palette ──────────────────────────────────────────────────────────────────
const CASE_COLORS = [
  0xfce4ec, // pink
  0xe8f5e9, // mint
  0xe3f2fd, // sky
  0xfff9c4, // lemon
  0xf3e5f5, // lavender
  0xffe0b2, // peach
  0xe0f7fa, // aqua
  0xffffff, // white
];

const STICKER_DEFS = [
  { emoji: "❤️",  label: "heart" },
  { emoji: "⭐",  label: "star" },
  { emoji: "🌸",  label: "flower" },
  { emoji: "🌈",  label: "rainbow" },
  { emoji: "🦋",  label: "butterfly" },
  { emoji: "🍭",  label: "lollipop" },
  { emoji: "🌙",  label: "moon" },
  { emoji: "💎",  label: "gem" },
  { emoji: "🐱",  label: "cat" },
  { emoji: "🍀",  label: "clover" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexToStr(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

// ─── Scene ────────────────────────────────────────────────────────────────────
class DIYScene extends Phaser.Scene {
  private readonly onScore: (n: number) => void;
  private coins = 0;

  // Case state
  private caseColor = CASE_COLORS[0]!;
  private caseGfx!: Phaser.GameObjects.Graphics;
  private caseW = 160;
  private caseH = 270;
  private caseX!: number;
  private caseY!: number;
  private caseRadius = 22;

  // Stickers placed on the case
  private placedStickers: Phaser.GameObjects.Text[] = [];

  // Dragging
  private draggingSticker: Phaser.GameObjects.Text | null = null;
  private dragOffX = 0;
  private dragOffY = 0;
  private dragIsNew = false; // dragging from tray vs. already-placed

  // UI
  private colorSwatches: Phaser.GameObjects.Rectangle[] = [];
  private stickerButtons: Phaser.GameObjects.Container[] = [];
  private sellBtn!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;
  private sparkleGroup!: Phaser.GameObjects.Group;
  private glitterTimer?: Phaser.Time.TimerEvent;

  // Undo
  private undoBtn!: Phaser.GameObjects.Container;

  constructor(onScore: (n: number) => void) {
    super("diy");
    this.onScore = onScore;
  }

  create(): void {
    this.caseX = VW / 2;
    this.caseY = 230;

    this.createBackground();
    this.createCase();
    this.createColorPicker();
    this.createStickerTray();
    this.createSellButton();
    this.createUndoButton();
    this.createCoinDisplay();
    this.createSparkleGroup();
    this.setupInput();

    // Ambient glitter on the case
    this.glitterTimer = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => this.spawnGlitter(),
    });
  }

  // ── Background ──────────────────────────────────────────────────────────────
  private createBackground(): void {
    // Soft gradient-like background using two rectangles
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0xfdf4ff);

    // Decorative polka dots
    const dotColors = [0xfce4ec, 0xe3f2fd, 0xfff9c4, 0xf3e5f5];
    for (let i = 0; i < 28; i++) {
      const x = Phaser.Math.Between(10, VW - 10);
      const y = Phaser.Math.Between(10, VH - 10);
      const r = Phaser.Math.Between(4, 10);
      const c = dotColors[i % dotColors.length]!;
      this.add.circle(x, y, r, c, 0.6);
    }

    // Title banner
    const banner = this.add.rectangle(VW / 2, 36, VW, 56, 0xff6eb4, 1);
    banner.setStrokeStyle(0);
    this.add.text(VW / 2, 36, "✨ Phone Case DIY ✨", {
      fontFamily: "Fraunces, serif",
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#c2185b",
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  // ── Phone Case ──────────────────────────────────────────────────────────────
  private createCase(): void {
    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(
      this.caseX - this.caseW / 2 + 6,
      this.caseY - this.caseH / 2 + 8,
      this.caseW,
      this.caseH,
      this.caseRadius,
    );

    // Case body (drawn fresh each color change)
    this.caseGfx = this.add.graphics();
    this.drawCase();

    // Phone screen cutout (decorative)
    const screen = this.add.graphics();
    screen.fillStyle(0xc8e6c9, 0.5);
    screen.fillRoundedRect(
      this.caseX - this.caseW / 2 + 14,
      this.caseY - this.caseH / 2 + 36,
      this.caseW - 28,
      this.caseH - 60,
      10,
    );

    // Camera dot
    this.add.circle(this.caseX, this.caseY - this.caseH / 2 + 16, 5, 0x90a4ae, 0.8);

    // "Drag stickers here" hint (shown until first sticker placed)
    const hint = this.add.text(this.caseX, this.caseY + 20, "Drag stickers\nonto the case!", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "16px",
      color: "#b39ddb",
      align: "center",
    }).setOrigin(0.5).setName("hint");
    hint.setDepth(2);
  }

  private drawCase(): void {
    this.caseGfx.clear();
    // Outer border
    this.caseGfx.fillStyle(0xbdbdbd, 1);
    this.caseGfx.fillRoundedRect(
      this.caseX - this.caseW / 2 - 4,
      this.caseY - this.caseH / 2 - 4,
      this.caseW + 8,
      this.caseH + 8,
      this.caseRadius + 4,
    );
    // Case fill
    this.caseGfx.fillStyle(this.caseColor, 1);
    this.caseGfx.fillRoundedRect(
      this.caseX - this.caseW / 2,
      this.caseY - this.caseH / 2,
      this.caseW,
      this.caseH,
      this.caseRadius,
    );
  }

  // ── Color Picker ────────────────────────────────────────────────────────────
  private createColorPicker(): void {
    const label = this.add.text(VW / 2, 82, "🎨 Case Color", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "13px",
      color: "#7e57c2",
      fontStyle: "bold",
    }).setOrigin(0.5);
    label.setDepth(5);

    const swatchSize = 28;
    const gap = 8;
    const totalW = CASE_COLORS.length * (swatchSize + gap) - gap;
    const startX = VW / 2 - totalW / 2 + swatchSize / 2;

    CASE_COLORS.forEach((color, i) => {
      const x = startX + i * (swatchSize + gap);
      const y = 108;
      const swatch = this.add.rectangle(x, y, swatchSize, swatchSize, color)
        .setStrokeStyle(2, 0xbdbdbd)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      swatch.on("pointerdown", () => this.setColor(color, i));
      this.colorSwatches.push(swatch);

      if (i === 0) swatch.setStrokeStyle(3, 0xff6eb4);
    });
  }

  private setColor(color: number, idx: number): void {
    this.caseColor = color;
    this.drawCase();
    this.colorSwatches.forEach((s, i) => {
      s.setStrokeStyle(i === idx ? 3 : 2, i === idx ? 0xff6eb4 : 0xbdbdbd);
    });
  }

  // ── Sticker Tray ────────────────────────────────────────────────────────────
  private createStickerTray(): void {
    // Tray background
    const trayY = VH - 118;
    this.add.rectangle(VW / 2, trayY + 10, VW, 100, 0xfce4ec, 0.9)
      .setStrokeStyle(2, 0xf48fb1);
    this.add.text(VW / 2, trayY - 32, "🌟 Stickers — drag onto case!", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "13px",
      color: "#e91e8c",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5);

    const cols = 5;
    const size = 44;
    const gap = 10;
    const totalW = cols * size + (cols - 1) * gap;
    const startX = VW / 2 - totalW / 2 + size / 2;

    STICKER_DEFS.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (size + gap);
      const y = trayY - 8 + row * (size + gap);

      const bg = this.add.rectangle(0, 0, size, size, 0xffffff, 0.8)
        .setStrokeStyle(1.5, 0xf8bbd0)
        .setOrigin(0.5);

      const txt = this.add.text(0, 2, def.emoji, {
        fontFamily: "Manrope, sans-serif",
        fontSize: "26px",
      }).setOrigin(0.5);

      const container = this.add.container(x, y, [bg, txt]);
      container.setSize(size, size);
      container.setInteractive({ useHandCursor: true });
      container.setDepth(5);
      container.setName(def.emoji);

      container.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
        this.startDragNewSticker(def.emoji, ptr.x, ptr.y);
      });

      this.stickerButtons.push(container);
    });
  }

  // ── Sell Button ─────────────────────────────────────────────────────────────
  private createSellButton(): void {
    const x = VW / 2;
    const y = VH - 36;

    const bg = this.add.rectangle(0, 0, 160, 44, 0xff6eb4)
      .setStrokeStyle(3, 0xc2185b)
      .setOrigin(0.5);
    const txt = this.add.text(0, 1, "💰 Sell Design!", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.sellBtn = this.add.container(x, y, [bg, txt]);
    this.sellBtn.setSize(160, 44);
    this.sellBtn.setInteractive({ useHandCursor: true });
    this.sellBtn.setDepth(10);

    this.sellBtn.on("pointerdown", () => this.sellDesign());
    this.sellBtn.on("pointerover", () => bg.setFillStyle(0xff4da6));
    this.sellBtn.on("pointerout", () => bg.setFillStyle(0xff6eb4));
  }

  // ── Undo Button ─────────────────────────────────────────────────────────────
  private createUndoButton(): void {
    const x = 40;
    const y = VH - 36;

    const bg = this.add.rectangle(0, 0, 60, 36, 0xe0e0e0)
      .setStrokeStyle(2, 0xbdbdbd)
      .setOrigin(0.5);
    const txt = this.add.text(0, 1, "↩ Undo", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "12px",
      color: "#555555",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.undoBtn = this.add.container(x, y, [bg, txt]);
    this.undoBtn.setSize(60, 36);
    this.undoBtn.setInteractive({ useHandCursor: true });
    this.undoBtn.setDepth(10);

    this.undoBtn.on("pointerdown", () => this.undoLastSticker());
    this.undoBtn.on("pointerover", () => bg.setFillStyle(0xd0d0d0));
    this.undoBtn.on("pointerout", () => bg.setFillStyle(0xe0e0e0));
  }

  // ── Coin Display ────────────────────────────────────────────────────────────
  private createCoinDisplay(): void {
    this.add.rectangle(VW - 54, 36, 88, 34, 0xfff9c4)
      .setStrokeStyle(2, 0xfdd835)
      .setDepth(10);
    this.coinText = this.add.text(VW - 54, 36, "🪙 0", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "16px",
      color: "#f57f17",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(11);
  }

  // ── Sparkle Group ───────────────────────────────────────────────────────────
  private createSparkleGroup(): void {
    this.sparkleGroup = this.add.group();
  }

  private spawnGlitter(): void {
    if (this.placedStickers.length === 0) return;
    const cx = this.caseX + Phaser.Math.Between(-this.caseW / 2 + 10, this.caseW / 2 - 10);
    const cy = this.caseY + Phaser.Math.Between(-this.caseH / 2 + 10, this.caseH / 2 - 10);
    this.spawnSparkle(cx, cy, 0xffd700);
  }

  private spawnSparkle(x: number, y: number, color: number): void {
    const star = this.add.text(x, y, "✦", {
      fontFamily: "Manrope, sans-serif",
      fontSize: `${Phaser.Math.Between(10, 20)}px`,
      color: hexToStr(color),
    }).setOrigin(0.5).setDepth(20).setAlpha(1);

    this.sparkleGroup.add(star);
    this.tweens.add({
      targets: star,
      y: y - Phaser.Math.Between(20, 50),
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 900,
      ease: "Quad.easeOut",
      onComplete: () => star.destroy(),
    });
  }

  private spawnConfetti(cx: number, cy: number): void {
    const emojis = ["🎉", "⭐", "💖", "🌸", "✨", "🎊"];
    for (let i = 0; i < 18; i++) {
      const e = emojis[i % emojis.length]!;
      const conf = this.add.text(cx, cy, e, {
        fontFamily: "Manrope, sans-serif",
        fontSize: `${Phaser.Math.Between(14, 24)}px`,
      }).setOrigin(0.5).setDepth(30);

      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
      const dist = Phaser.Math.Between(60, 180);
      this.tweens.add({
        targets: conf,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        rotation: Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(700, 1200),
        ease: "Quad.easeOut",
        onComplete: () => conf.destroy(),
      });
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  private setupInput(): void {
    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (this.draggingSticker) {
        this.draggingSticker.x = ptr.x + this.dragOffX;
        this.draggingSticker.y = ptr.y + this.dragOffY;
      }
    });

    this.input.on("pointerup", (ptr: Phaser.Input.Pointer) => {
      if (!this.draggingSticker) return;
      const sticker = this.draggingSticker;
      this.draggingSticker = null;
      sticker.setAlpha(1);

      if (this.isOnCase(ptr.x, ptr.y)) {
        // Snap to where dropped
        sticker.x = ptr.x + this.dragOffX;
        sticker.y = ptr.y + this.dragOffY;
        sticker.setDepth(15);
        if (!this.placedStickers.includes(sticker)) {
          this.placedStickers.push(sticker);
        }
        // Hide hint
        const hint = this.children.getByName("hint") as Phaser.GameObjects.Text | null;
        if (hint) hint.setVisible(false);
        // Bounce in
        this.tweens.add({
          targets: sticker,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 120,
          yoyo: true,
          ease: "Back.easeOut",
        });
        this.spawnSparkle(sticker.x, sticker.y, 0xff69b4);
      } else {
        // Dropped off-case: remove if it was a new sticker
        if (this.dragIsNew) {
          sticker.destroy();
          this.placedStickers = this.placedStickers.filter(s => s !== sticker);
        } else {
          // Return to original position — just leave it where it is (already placed)
          sticker.setAlpha(1);
        }
      }
    });
  }

  private isOnCase(x: number, y: number): boolean {
    const hw = this.caseW / 2 + 10;
    const hh = this.caseH / 2 + 10;
    return (
      x >= this.caseX - hw &&
      x <= this.caseX + hw &&
      y >= this.caseY - hh &&
      y <= this.caseY + hh
    );
  }

  // ── Drag from tray ──────────────────────────────────────────────────────────
  private startDragNewSticker(emoji: string, px: number, py: number): void {
    const sticker = this.add.text(px, py, emoji, {
      fontFamily: "Manrope, sans-serif",
      fontSize: "32px",
    }).setOrigin(0.5).setDepth(50).setAlpha(0.85);

    sticker.setInteractive({ useHandCursor: true });
    sticker.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.startDragExisting(sticker, ptr.x, ptr.y);
    });

    this.draggingSticker = sticker;
    this.dragOffX = 0;
    this.dragOffY = 0;
    this.dragIsNew = true;
  }

  private startDragExisting(sticker: Phaser.GameObjects.Text, px: number, py: number): void {
    this.draggingSticker = sticker;
    this.dragOffX = sticker.x - px;
    this.dragOffY = sticker.y - py;
    this.dragIsNew = false;
    sticker.setDepth(50).setAlpha(0.85);
  }

  // ── Undo ────────────────────────────────────────────────────────────────────
  private undoLastSticker(): void {
    const last = this.placedStickers.pop();
    if (last) {
      this.tweens.add({
        targets: last,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 200,
        ease: "Back.easeIn",
        onComplete: () => last.destroy(),
      });
    }
    if (this.placedStickers.length === 0) {
      const hint = this.children.getByName("hint") as Phaser.GameObjects.Text | null;
      if (hint) hint.setVisible(true);
    }
  }

  // ── Sell Design ─────────────────────────────────────────────────────────────
  private sellDesign(): void {
    const stickerCount = this.placedStickers.length;
    if (stickerCount === 0) {
      this.showToast("Add some stickers first! 😊");
      return;
    }

    // Earn coins based on stickers + color bonus
    const earned = stickerCount * 10 + (this.caseColor !== 0xffffff ? 5 : 0);
    this.coins += earned;
    this.onScore(this.coins);
    this.coinText.setText(`🪙 ${this.coins}`);

    // Celebration!
    this.spawnConfetti(this.caseX, this.caseY);
    this.showToast(`+${earned} coins! 🎉`);

    // Animate sell button
    this.tweens.add({
      targets: this.sellBtn,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 120,
      yoyo: true,
      ease: "Back.easeOut",
    });

    // Clear the design after a short delay
    this.time.delayedCall(1000, () => {
      this.clearCase();
    });
  }

  private clearCase(): void {
    for (const s of this.placedStickers) {
      this.tweens.add({
        targets: s,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300,
        ease: "Back.easeIn",
        onComplete: () => s.destroy(),
      });
    }
    this.placedStickers = [];
    // Reset color
    this.setColor(CASE_COLORS[0]!, 0);

    const hint = this.children.getByName("hint") as Phaser.GameObjects.Text | null;
    if (hint) hint.setVisible(true);
  }

  // ── Toast ────────────────────────────────────────────────────────────────────
  private showToast(msg: string): void {
    const toast = this.add.text(VW / 2, VH / 2 - 60, msg, {
      fontFamily: "Manrope, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      backgroundColor: "#ff6eb4",
      padding: { left: 16, right: 16, top: 8, bottom: 8 },
    }).setOrigin(0.5).setDepth(40).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: VH / 2 - 80,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            y: VH / 2 - 110,
            duration: 400,
            ease: "Quad.easeIn",
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  update(): void {
    // Phaser handles the loop; all logic is event-driven above
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
export function startGame(parent: HTMLElement, onScore: (n: number) => void): () => void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VW,
    height: VH,
    backgroundColor: "#fdf4ff",
    transparent: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: new DIYScene(onScore),
    banner: false,
  });

  return () => game.destroy(true);
}
