import Phaser from "phaser";

// ─── Virtual canvas ───────────────────────────────────────────────────────────
const VW = 390;
const VH = 680;

// ─── Shared state passed between scenes ──────────────────────────────────────
interface PlacedSticker {
  emoji: string;
  x: number;
  y: number;
  scale: number;
  angle: number;
}

interface GameState {
  caseShape: "rounded" | "square" | "bumper";
  paintColor: number;
  stickers: PlacedSticker[];
  onScore: (n: number) => void;
}

const state: GameState = {
  caseShape: "rounded",
  paintColor: 0xffffff,
  stickers: [],
  onScore: () => {},
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function drawPhoneCase(
  gfx: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  color: number,
  shape: GameState["caseShape"],
  scale = 1,
  dirty = false
): void {
  const w = 110 * scale;
  const h = 190 * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Shadow
  gfx.fillStyle(0x000000, 0.18);
  gfx.fillRoundedRect(x + 6, y + 8, w, h, shape === "square" ? 6 : 28 * scale);

  // Case body
  if (dirty) {
    gfx.fillStyle(0xb0b0b0, 1);
  } else {
    gfx.fillStyle(color, 1);
  }

  const r = shape === "square" ? 6 : shape === "bumper" ? 36 * scale : 28 * scale;
  gfx.fillRoundedRect(x, y, w, h, r);

  // Shine highlight
  gfx.fillStyle(0xffffff, 0.18);
  gfx.fillRoundedRect(x + 8 * scale, y + 10 * scale, 18 * scale, 60 * scale, 9 * scale);

  // Camera cutout
  gfx.fillStyle(0x1a1a2e, 1);
  gfx.fillCircle(cx - 14 * scale, y + 26 * scale, 10 * scale);
  gfx.fillStyle(0x3b82f6, 0.6);
  gfx.fillCircle(cx - 14 * scale, y + 26 * scale, 6 * scale);

  // Side buttons
  gfx.fillStyle(0x888888, 1);
  gfx.fillRoundedRect(x + w - 2, y + 55 * scale, 5, 28 * scale, 2);
  gfx.fillRoundedRect(x + w - 2, y + 90 * scale, 5, 18 * scale, 2);
  gfx.fillRoundedRect(x - 3, y + 70 * scale, 5, 22 * scale, 2);

  // Dirt patches if dirty
  if (dirty) {
    gfx.fillStyle(0x8b6914, 0.45);
    gfx.fillEllipse(cx + 10, cy - 20, 38, 22);
    gfx.fillEllipse(cx - 20, cy + 30, 28, 18);
    gfx.fillEllipse(cx + 25, cy + 50, 32, 16);
    gfx.fillStyle(0x5a3e1b, 0.3);
    gfx.fillEllipse(cx - 5, cy + 10, 20, 14);
    gfx.fillEllipse(cx + 30, cy - 40, 18, 12);
  }
}

// ─── SCENE 1: Menu ────────────────────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
  constructor() { super("menu"); }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfce7f3, 0xfce7f3, 0xfdf2f8, 0xfdf2f8, 1);
    bg.fillRect(0, 0, VW, VH);

    for (let i = 0; i < 12; i++) {
      const bx = Phaser.Math.Between(20, VW - 20);
      const by = Phaser.Math.Between(20, VH - 20);
      const br = Phaser.Math.Between(8, 22);
      const bc = Phaser.Utils.Array.GetRandom([
        0xf9a8d4, 0xfbcfe8, 0xc4b5fd, 0xa5f3fc, 0xfde68a,
      ]) as number;
      const bubble = this.add.circle(bx, by, br, bc, 0.35);
      this.tweens.add({
        targets: bubble,
        y: by - Phaser.Math.Between(30, 60),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: () => { bubble.y = by; bubble.alpha = 0.35; },
      });
    }

    this.add.text(VW / 2, 120, "📱", { fontSize: "72px" }).setOrigin(0.5);
    this.add.text(VW / 2, 210, "Phone Case", {
      fontFamily: "Fraunces, serif", fontSize: "42px",
      color: "#be185d", stroke: "#fce7f3", strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(VW / 2, 260, "DIY Studio", {
      fontFamily: "Fraunces, serif", fontSize: "42px",
      color: "#7c3aed", stroke: "#fdf2f8", strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(VW / 2, 316, "Design your perfect case!", {
      fontFamily: "Manrope, sans-serif", fontSize: "17px", color: "#9d174d",
    }).setOrigin(0.5);

    const previewGfx = this.add.graphics();
    drawPhoneCase(previewGfx, VW / 2, 440, 0xf472b6, "rounded", 0.85);
    this.tweens.add({ targets: previewGfx, y: -6, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x9d174d : 0xbe185d, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 110, 180, 56, 28);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 82, VH - 107, 164, 22, 14);
    };
    drawBtn(false);
    const btnText = this.add.text(VW / 2, VH - 82, "✨  Let's Start!", {
      fontFamily: "Manrope, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const btnZone = this.add.zone(VW / 2, VH - 82, 200, 60).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => { drawBtn(true); this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.05, scaleY: 1.05, duration: 80 }); });
    btnZone.on("pointerout", () => { drawBtn(false); this.tweens.add({ targets: [btnBg, btnText], scaleX: 1, scaleY: 1, duration: 80 }); });
    btnZone.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 252, 231, 243);
      this.time.delayedCall(300, () => this.scene.start("shape"));
    });
    this.cameras.main.fadeIn(400, 252, 231, 243);
  }
}

// ─── SCENE 2: Shape Picker ────────────────────────────────────────────────────
class ShapeScene extends Phaser.Scene {
  constructor() { super("shape"); }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfdf4ff, 0xfdf4ff, 0xfce7f3, 0xfce7f3, 1);
    bg.fillRect(0, 0, VW, VH);

    this.add.text(VW / 2, 52, "Choose Your Case Shape", {
      fontFamily: "Fraunces, serif", fontSize: "26px", color: "#7c3aed",
      align: "center", wordWrap: { width: VW - 40 },
    }).setOrigin(0.5);
    this.add.text(VW / 2, 92, "Tap a shape to select it", {
      fontFamily: "Manrope, sans-serif", fontSize: "15px", color: "#9d174d",
    }).setOrigin(0.5);

    const shapes: { id: GameState["caseShape"]; label: string; emoji: string }[] = [
      { id: "rounded", label: "Classic\nRounded", emoji: "🌸" },
      { id: "square",  label: "Sharp\nSquare",   emoji: "🔲" },
      { id: "bumper",  label: "Bumper\nCase",     emoji: "💫" },
    ];

    const positions = [VW / 2 - 120, VW / 2, VW / 2 + 120];
    let selectedIdx = 0;
    const rings: Phaser.GameObjects.Graphics[] = [];

    const drawRing = (ring: Phaser.GameObjects.Graphics, cx: number, cy: number, active: boolean) => {
      ring.clear();
      if (active) {
        ring.lineStyle(4, 0x7c3aed, 1);
        ring.strokeRoundedRect(cx - 56, cy - 108, 112, 216, 20);
        ring.fillStyle(0x7c3aed, 0.07);
        ring.fillRoundedRect(cx - 56, cy - 108, 112, 216, 20);
      }
    };

    shapes.forEach((s, i) => {
      const cx = positions[i]!;
      const cy = 310;

      const ring = this.add.graphics();
      rings.push(ring);
      drawRing(ring, cx, cy, i === 0);

      const card = this.add.graphics();
      card.fillStyle(0xffffff, 0.85);
      card.fillRoundedRect(cx - 52, cy - 104, 104, 208, 18);

      const gfx = this.add.graphics();
      drawPhoneCase(gfx, cx, cy - 10, 0xd8b4fe, s.id, 0.62);

      this.add.text(cx, cy + 88, s.emoji + "\n" + s.label, {
        fontFamily: "Manrope, sans-serif", fontSize: "12px",
        color: "#581c87", align: "center",
      }).setOrigin(0.5, 0);

      const zone = this.add.zone(cx, cy, 112, 210).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        selectedIdx = i;
        rings.forEach((r, ri) => drawRing(r, positions[ri]!, cy, ri === i));
        this.tweens.add({ targets: [card, gfx], scaleX: 0.95, scaleY: 0.95, duration: 60, yoyo: true });
      });
    });

    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x6d28d9 : 0x7c3aed, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 100, 180, 52, 26);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 82, VH - 97, 164, 20, 13);
    };
    drawBtn(false);
    const btnText = this.add.text(VW / 2, VH - 74, "Next →", {
      fontFamily: "Manrope, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const btnZone = this.add.zone(VW / 2, VH - 74, 200, 56).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => drawBtn(true));
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.caseShape = shapes[selectedIdx]!.id;
      this.cameras.main.fadeOut(300, 253, 244, 255);
      this.time.delayedCall(300, () => this.scene.start("clean"));
    });
    void btnText;
    this.cameras.main.fadeIn(400, 253, 244, 255);
  }
}

// ─── SCENE 3: Cleaning ────────────────────────────────────────────────────────
class CleanScene extends Phaser.Scene {
  private cleanProgress = 0;
  private timeLeft = 5;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private caseGfx!: Phaser.GameObjects.Graphics;
  private dirtMask!: Phaser.GameObjects.Graphics;
  private sponge!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private scrubPoints: { x: number; y: number }[] = [];
  private done = false;
  private readonly caseX = VW / 2;
  private readonly caseY = 340;
  private readonly caseW = 110;
  private readonly caseH = 190;

  constructor() { super("clean"); }

  create(): void {
    this.cleanProgress = 0;
    this.timeLeft = 5;
    this.scrubPoints = [];
    this.done = false;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe0f2fe, 0xe0f2fe, 0xf0fdf4, 0xf0fdf4, 1);
    bg.fillRect(0, 0, VW, VH);

    const shelf = this.add.graphics();
    shelf.fillStyle(0xd4a574, 1);
    shelf.fillRoundedRect(40, 450, VW - 80, 18, 9);
    shelf.fillStyle(0xb8864e, 1);
    shelf.fillRect(40, 462, VW - 80, 6);

    this.add.text(VW / 2, 46, "🧽  Clean the Case!", {
      fontFamily: "Fraunces, serif", fontSize: "28px", color: "#0f766e",
    }).setOrigin(0.5);
    this.add.text(VW / 2, 84, "Scrub away the dirt before time runs out!", {
      fontFamily: "Manrope, sans-serif", fontSize: "14px", color: "#134e4a",
      align: "center", wordWrap: { width: VW - 40 },
    }).setOrigin(0.5);

    this.timerText = this.add.text(VW / 2, 128, "⏱  5", {
      fontFamily: "Manrope, sans-serif", fontSize: "32px", color: "#dc2626", fontStyle: "bold",
    }).setOrigin(0.5);

    const progressBg = this.add.graphics();
    progressBg.fillStyle(0xd1d5db, 1);
    progressBg.fillRoundedRect(VW / 2 - 100, 162, 200, 14, 7);
    this.progressBar = this.add.graphics();

    this.caseGfx = this.add.graphics();
    drawPhoneCase(this.caseGfx, this.caseX, this.caseY, 0xffffff, state.caseShape, 1, true);

    this.sponge = this.add.text(0, 0, "🧽", { fontSize: "40px" }).setOrigin(0.5).setDepth(10);
    this.sponge.setVisible(false);
    this.dirtMask = this.add.graphics().setDepth(5);

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.sponge.setVisible(true);
      this.sponge.setPosition(p.x, p.y - 20);
      if (p.isDown && !this.done) this.scrub(p.x, p.y);
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.done) this.scrub(p.x, p.y);
    });
    this.input.on("pointerout", () => this.sponge.setVisible(false));

    this.timerEvent = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (this.done) return;
        this.timeLeft -= 1;
        this.timerText.setText("⏱  " + Math.max(0, this.timeLeft));
        if (this.timeLeft <= 2) {
          this.timerText.setColor("#dc2626");
          this.tweens.add({ targets: this.timerText, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
        }
        if (this.timeLeft <= 0) this.finishCleaning();
      },
    });

    this.cameras.main.fadeIn(400, 224, 242, 254);
  }

  private scrub(px: number, py: number): void {
    const inCase =
      px > this.caseX - this.caseW / 2 - 10 && px < this.caseX + this.caseW / 2 + 10 &&
      py > this.caseY - this.caseH / 2 - 10 && py < this.caseY + this.caseH / 2 + 10;
    if (!inCase) return;

    const alreadyNear = this.scrubPoints.some(
      (sp) => Math.abs(sp.x - px) < 18 && Math.abs(sp.y - py) < 18
    );
    if (!alreadyNear) this.scrubPoints.push({ x: px, y: py });

    this.dirtMask.clear();
    this.dirtMask.fillStyle(0xf0f4f8, 1);
    for (const sp of this.scrubPoints) this.dirtMask.fillCircle(sp.x, sp.y, 28);

    const caseArea = this.caseW * this.caseH;
    const scrubArea = this.scrubPoints.length * Math.PI * 28 * 28;
    this.cleanProgress = Math.min(1, scrubArea / (caseArea * 0.72));

    this.progressBar.clear();
    this.progressBar.fillStyle(0x10b981, 1);
    this.progressBar.fillRoundedRect(VW / 2 - 100, 162, 200 * this.cleanProgress, 14, 7);

    if (this.cleanProgress >= 1 && !this.done) this.finishCleaning();
  }

  private finishCleaning(): void {
    if (this.done) return;
    this.done = true;
    this.timerEvent?.remove();
    this.sponge.setVisible(false);

    this.caseGfx.clear();
    drawPhoneCase(this.caseGfx, this.caseX, this.caseY, 0xf8fafc, state.caseShape, 1, false);
    this.dirtMask.clear();

    const msg = this.add.text(VW / 2, 520, "✨ Squeaky clean!", {
      fontFamily: "Fraunces, serif", fontSize: "26px", color: "#0f766e",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: msg, alpha: 1, y: 510, duration: 400 });

    const btnBg = this.add.graphics().setAlpha(0);
    btnBg.fillStyle(0x0f766e, 1);
    btnBg.fillRoundedRect(VW / 2 - 90, VH - 100, 180, 52, 26);
    btnBg.fillStyle(0xffffff, 0.15);
    btnBg.fillRoundedRect(VW / 2 - 82, VH - 97, 164, 20, 13);

    const btnText = this.add.text(VW / 2, VH - 74, "Paint it! 🎨", {
      fontFamily: "Manrope, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 500, delay: 400 });

    const btnZone = this.add.zone(VW / 2, VH - 74, 200, 56).setInteractive({ useHandCursor: true });
    btnZone.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 240, 253, 244);
      this.time.delayedCall(300, () => this.scene.start("paint"));
    });
  }
}

// ─── SCENE 4: Painting ────────────────────────────────────────────────────────
class PaintScene extends Phaser.Scene {
  private caseColor = 0xffffff;
  private caseGfx!: Phaser.GameObjects.Graphics;
  private swatchGfxList: Phaser.GameObjects.Graphics[] = [];
  private selectedColorIdx = 0;

  constructor() { super("paint"); }

  create(): void {
    this.caseColor = 0xffffff;
    this.selectedColorIdx = 0;
    this.swatchGfxList = [];

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfff7ed, 0xfff7ed, 0xfdf2f8, 0xfdf2f8, 1);
    bg.fillRect(0, 0, VW, VH);

    this.add.text(VW / 2, 44, "🎨  Paint Your Case!", {
      fontFamily: "Fraunces, serif", fontSize: "28px", color: "#c2410c",
    }).setOrigin(0.5);
    this.add.text(VW / 2, 82, "Tap a color to paint your case", {
      fontFamily: "Manrope, sans-serif", fontSize: "15px", color: "#7c2d12",
    }).setOrigin(0.5);

    this.caseGfx = this.add.graphics();
    this.redrawCase();

    const colors: { hex: number; name: string }[] = [
      { hex: 0xef4444, name: "Red"    },
      { hex: 0xf472b6, name: "Pink"   },
      { hex: 0x1a1a2e, name: "Black"  },
      { hex: 0xf8fafc, name: "White"  },
      { hex: 0x92400e, name: "Brown"  },
      { hex: 0xf97316, name: "Orange" },
      { hex: 0x3b82f6, name: "Blue"   },
      { hex: 0x22c55e, name: "Green"  },
      { hex: 0x8b5cf6, name: "Purple" },
      { hex: 0xfacc15, name: "Yellow" },
    ];

    const cols = 5;
    const swatchSize = 46;
    const gap = 12;
    const totalW = cols * swatchSize + (cols - 1) * gap;
    const startX = (VW - totalW) / 2;
    const startY = 530;

    const getSX = (i: number) => startX + (i % cols) * (swatchSize + gap) + swatchSize / 2;
    const getSY = (i: number) => startY + Math.floor(i / cols) * (swatchSize + gap) + swatchSize / 2;

    const redrawSwatch = (idx: number) => {
      const swatch = this.swatchGfxList[idx];
      if (!swatch) return;
      const c = colors[idx]!;
      const sx = getSX(idx);
      const sy = getSY(idx);
      const selected = idx === this.selectedColorIdx;
      swatch.clear();
      if (selected) {
        swatch.lineStyle(4, 0x1a1a2e, 1);
        swatch.strokeCircle(sx, sy, swatchSize / 2 + 3);
      }
      swatch.fillStyle(c.hex, 1);
      swatch.fillCircle(sx, sy, swatchSize / 2);
      swatch.fillStyle(0xffffff, 0.25);
      swatch.fillCircle(sx - 7, sy - 7, 8);
    };

    colors.forEach((c, i) => {
      const sx = getSX(i);
      const sy = getSY(i);
      const swatch = this.add.graphics();
      this.swatchGfxList.push(swatch);
      redrawSwatch(i);

      const zone = this.add.zone(sx, sy, swatchSize + 8, swatchSize + 8).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        const prev = this.selectedColorIdx;
        this.selectedColorIdx = i;
        this.caseColor = c.hex;
        redrawSwatch(prev);
        redrawSwatch(i);
        this.redrawCase();
        this.tweens.add({ targets: swatch, scaleX: 1.2, scaleY: 1.2, duration: 80, yoyo: true });
      });
      zone.on("pointerover", () => {
        if (i !== this.selectedColorIdx) {
          swatch.clear();
          swatch.lineStyle(3, 0x6b7280, 0.6);
          swatch.strokeCircle(sx, sy, swatchSize / 2 + 2);
          swatch.fillStyle(c.hex, 1);
          swatch.fillCircle(sx, sy, swatchSize / 2);
          swatch.fillStyle(0xffffff, 0.25);
          swatch.fillCircle(sx - 7, sy - 7, 8);
        }
      });
      zone.on("pointerout", () => redrawSwatch(i));
    });

    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x9a3412 : 0xc2410c, 1);
      btnBg.fillRoundedRect(VW / 2 - 100, VH - 68, 200, 52, 26);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 92, VH - 65, 184, 20, 13);
    };
    drawBtn(false);
    const btnText = this.add.text(VW / 2, VH - 42, "Add Stickers! 🌟", {
      fontFamily: "Manrope, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const btnZone = this.add.zone(VW / 2, VH - 42, 220, 56).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => { drawBtn(true); this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.04, scaleY: 1.04, duration: 60, yoyo: true }); });
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.paintColor = this.caseColor;
      state.stickers = [];
      this.cameras.main.fadeOut(300, 255, 247, 237);
      this.time.delayedCall(300, () => this.scene.start("stickers"));
    });

    this.cameras.main.fadeIn(400, 255, 247, 237);
  }

  private redrawCase(): void {
    this.caseGfx.clear();
    drawPhoneCase(this.caseGfx, VW / 2, 320, this.caseColor, state.caseShape, 1.05);
  }
}

// ─── SCENE 5: Stickers ───────────────────────────────────────────────────────
class StickerScene extends Phaser.Scene {
  private caseGfx!: Phaser.GameObjects.Graphics;
  private placedStickers: Phaser.GameObjects.Text[] = [];
  private stickerData: PlacedSticker[] = [];

  // Case bounds (matching paint scene scale 1.05)
  private readonly caseX = VW / 2;
  private readonly caseY = 300;
  private readonly caseW = 110 * 1.05;
  private readonly caseH = 190 * 1.05;

  constructor() { super("stickers"); }

  create(): void {
    this.placedStickers = [];
    this.stickerData = [];

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfdf4ff, 0xfdf4ff, 0xfff7ed, 0xfff7ed, 1);
    bg.fillRect(0, 0, VW, VH);

    // Decorative dots
    for (let i = 0; i < 18; i++) {
      const dx = Phaser.Math.Between(10, VW - 10);
      const dy = Phaser.Math.Between(10, VH - 10);
      const dc = Phaser.Utils.Array.GetRandom([0xf9a8d4, 0xfde68a, 0xa5f3fc, 0xbbf7d0, 0xe9d5ff]) as number;
      this.add.circle(dx, dy, Phaser.Math.Between(3, 9), dc, 0.4);
    }

    this.add.text(VW / 2, 38, "🌟  Add Stickers!", {
      fontFamily: "Fraunces, serif", fontSize: "28px", color: "#7c3aed",
    }).setOrigin(0.5);
    this.add.text(VW / 2, 74, "Tap a sticker, then tap the case to place it", {
      fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#6b21a8",
      align: "center", wordWrap: { width: VW - 30 },
    }).setOrigin(0.5);

    // Phone case
    this.caseGfx = this.add.graphics();
    this.redrawCase();

    // Sticker palette rows
    const STICKERS = [
      "⭐","💖","🌈","🦋","🌸","🍭","🎀","🔥","💎","🌙",
      "🦄","🍓","🌺","✨","🎵","🍦","🌊","🐱","🐶","🍀",
    ];

    const cols = 5;
    const sSize = 44;
    const sGap = 8;
    const totalW = cols * sSize + (cols - 1) * sGap;
    const startX = (VW - totalW) / 2 + sSize / 2;
    const startY = 480;

    let selectedSticker: string | null = null;
    const stickerBtns: Phaser.GameObjects.Graphics[] = [];
    const stickerZones: Phaser.GameObjects.Text[] = [];

    // Draw sticker tray background
    const rows = Math.ceil(STICKERS.length / cols);
    const trayH = rows * (sSize + sGap) + 16;
    const trayBg = this.add.graphics();
    trayBg.fillStyle(0xffffff, 0.7);
    trayBg.fillRoundedRect((VW - totalW - 24) / 2, startY - sSize / 2 - 8, totalW + 24, trayH, 18);
    trayBg.lineStyle(2, 0xe9d5ff, 1);
    trayBg.strokeRoundedRect((VW - totalW - 24) / 2, startY - sSize / 2 - 8, totalW + 24, trayH, 18);

    const highlightBtn = (idx: number) => {
      stickerBtns.forEach((btn, bi) => {
        btn.clear();
        if (bi === idx) {
          btn.fillStyle(0x8b5cf6, 0.25);
          btn.fillRoundedRect(
            startX + (bi % cols) * (sSize + sGap) - sSize / 2 - 4,
            startY + Math.floor(bi / cols) * (sSize + sGap) - sSize / 2 - 4,
            sSize + 8, sSize + 8, 10
          );
          btn.lineStyle(2, 0x7c3aed, 1);
          btn.strokeRoundedRect(
            startX + (bi % cols) * (sSize + sGap) - sSize / 2 - 4,
            startY + Math.floor(bi / cols) * (sSize + sGap) - sSize / 2 - 4,
            sSize + 8, sSize + 8, 10
          );
        }
      });
    };

    STICKERS.forEach((emoji, i) => {
      const sx = startX + (i % cols) * (sSize + sGap);
      const sy = startY + Math.floor(i / cols) * (sSize + sGap);

      const btn = this.add.graphics();
      stickerBtns.push(btn);

      const label = this.add.text(sx, sy, emoji, { fontSize: "28px" }).setOrigin(0.5);
      stickerZones.push(label);

      const zone = this.add.zone(sx, sy, sSize, sSize).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        selectedSticker = emoji;
        highlightBtn(i);
      });
    });

    // Tap on case to place sticker
    const caseZone = this.add.zone(this.caseX, this.caseY, this.caseW, this.caseH)
      .setInteractive({ useHandCursor: true });

    caseZone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!selectedSticker) return;

      // Keep within case bounds
      const px = Phaser.Math.Clamp(p.x, this.caseX - this.caseW / 2 + 12, this.caseX + this.caseW / 2 - 12);
      const py = Phaser.Math.Clamp(p.y, this.caseY - this.caseH / 2 + 12, this.caseY + this.caseH / 2 - 12);

      const angle = Phaser.Math.Between(-20, 20);
      const scale = 0.9 + Math.random() * 0.4;

      const placed = this.add.text(px, py, selectedSticker, {
        fontSize: "30px",
      }).setOrigin(0.5).setAngle(angle).setScale(scale).setDepth(6);

      this.placedStickers.push(placed);
      this.stickerData.push({ emoji: selectedSticker, x: px, y: py, scale, angle });

      // Pop animation
      placed.setScale(scale * 1.4);
      this.tweens.add({ targets: placed, scaleX: scale, scaleY: scale, duration: 200, ease: "Back.easeOut" });
    });

    // Undo button
    const undoBg = this.add.graphics();
    undoBg.fillStyle(0xe5e7eb, 1);
    undoBg.fillRoundedRect(20, VH - 68, 80, 44, 22);
    this.add.text(60, VH - 46, "↩ Undo", {
      fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#374151", fontStyle: "bold",
    }).setOrigin(0.5);
    const undoZone = this.add.zone(60, VH - 46, 80, 44).setInteractive({ useHandCursor: true });
    undoZone.on("pointerdown", () => {
      const last = this.placedStickers.pop();
      if (last) { last.destroy(); this.stickerData.pop(); }
    });

    // Done button
    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x6d28d9 : 0x7c3aed, 1);
      btnBg.fillRoundedRect(VW / 2 + 10, VH - 68, 160, 44, 22);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 + 18, VH - 65, 144, 16, 11);
    };
    drawBtn(false);
    const btnText = this.add.text(VW / 2 + 90, VH - 46, "I'm Done! 🎉", {
      fontFamily: "Manrope, sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const btnZone = this.add.zone(VW / 2 + 90, VH - 46, 170, 44).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => drawBtn(true));
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.stickers = [...this.stickerData];
      this.cameras.main.fadeOut(300, 253, 244, 255);
      this.time.delayedCall(300, () => this.scene.start("finish"));
    });
    void btnText;
    void stickerZones;

    this.cameras.main.fadeIn(400, 253, 244, 255);
  }

  private redrawCase(): void {
    this.caseGfx.clear();
    drawPhoneCase(this.caseGfx, this.caseX, this.caseY, state.paintColor, state.caseShape, 1.05);
  }
}

// ─── SCENE 6: Finish ─────────────────────────────────────────────────────────
class FinishScene extends Phaser.Scene {
  constructor() { super("finish"); }

  create(): void {
    state.onScore(100);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfdf2f8, 0xfdf2f8, 0xfdf4ff, 0xfdf4ff, 1);
    bg.fillRect(0, 0, VW, VH);

    // Confetti
    const confColors = [0xef4444, 0xf472b6, 0xfacc15, 0x22c55e, 0x3b82f6, 0x8b5cf6, 0xf97316];
    for (let i = 0; i < 36; i++) {
      const cx = Phaser.Math.Between(10, VW - 10);
      const cy = Phaser.Math.Between(-60, 0);
      const cc = Phaser.Utils.Array.GetRandom(confColors) as number;
      const conf = this.add.rectangle(cx, cy, Phaser.Math.Between(6, 14), Phaser.Math.Between(6, 14), cc);
      this.tweens.add({
        targets: conf,
        y: cy + Phaser.Math.Between(500, 800),
        x: cx + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(1800, 3200),
        delay: Phaser.Math.Between(0, 1200),
        repeat: -1,
        onRepeat: () => {
          conf.x = Phaser.Math.Between(10, VW - 10);
          conf.y = Phaser.Math.Between(-60, 0);
          conf.alpha = 1;
        },
      });
    }

    this.add.text(VW / 2, 52, "🎉 Your Case is Done!", {
      fontFamily: "Fraunces, serif", fontSize: "30px", color: "#be185d",
      align: "center", wordWrap: { width: VW - 40 },
    }).setOrigin(0.5);
    this.add.text(VW / 2, 96, "What an amazing design!", {
      fontFamily: "Manrope, sans-serif", fontSize: "16px", color: "#7c3aed",
    }).setOrigin(0.5);

    // Show finished phone case
    const caseGfx = this.add.graphics();
    drawPhoneCase(caseGfx, VW / 2, 300, state.paintColor, state.caseShape, 1.1);

    // Place stickers on the finished case
    for (const s of state.stickers) {
      this.add.text(s.x, s.y - 20, s.emoji, { fontSize: "30px" })
        .setOrigin(0.5).setAngle(s.angle).setScale(s.scale).setDepth(6);
    }

    // Floating stars
    for (let i = 0; i < 6; i++) {
      const star = this.add.text(
        Phaser.Math.Between(30, VW - 30),
        Phaser.Math.Between(420, 560),
        Phaser.Utils.Array.GetRandom(["⭐", "💫", "✨", "🌟"]) as string,
        { fontSize: "24px" }
      ).setOrigin(0.5).setAlpha(0);
      this.tweens.add({
        targets: star, alpha: 1, y: star.y - 20,
        duration: 600, delay: 300 + i * 150, yoyo: true, repeat: -1,
      });
    }

    // Make Another button
    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x9d174d : 0xbe185d, 1);
      btnBg.fillRoundedRect(VW / 2 - 110, VH - 100, 220, 56, 28);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 102, VH - 97, 204, 22, 14);
    };
    drawBtn(false);
    const btnText = this.add.text(VW / 2, VH - 72, "🔄  Make Another!", {
      fontFamily: "Manrope, sans-serif", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const btnZone = this.add.zone(VW / 2, VH - 72, 240, 60).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => { drawBtn(true); this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.05, scaleY: 1.05, duration: 80, yoyo: true }); });
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.stickers = [];
      this.cameras.main.fadeOut(300, 253, 242, 248);
      this.time.delayedCall(300, () => this.scene.start("menu"));
    });

    this.cameras.main.fadeIn(500, 253, 242, 248);
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
export function startGame(parent: HTMLElement, onScore: (n: number) => void): () => void {
  state.onScore = onScore;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VW,
    height: VH,
    backgroundColor: "#fdf2f8",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MenuScene, ShapeScene, CleanScene, PaintScene, StickerScene, FinishScene],
    banner: false,
  });

  return () => game.destroy(true);
}
