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

// ─── Case geometry helper ─────────────────────────────────────────────────────
// Returns the bounding box and camera lens circle for a phone case drawn at
// (cx, cy) with the given scale. Used for hit-testing in the sticker scene.
function getCaseGeometry(cx: number, cy: number, scale: number) {
  const w = 110 * scale;
  const h = 190 * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // Camera lens centre matches drawPhoneCase exactly
  const lensX = cx - 14 * scale;
  const lensY = y + 26 * scale;
  const lensR = 10 * scale;
  return { x, y, w, h, lensX, lensY, lensR };
}

// Returns true if point (px,py) is inside the case body AND not on the lens.
function isValidStickerPos(
  px: number, py: number,
  cx: number, cy: number, scale: number,
  shape: GameState["caseShape"]
): boolean {
  const { x, y, w, h, lensX, lensY, lensR } = getCaseGeometry(cx, cy, scale);

  // ── inside the rectangular bounding box (generous for rounded shapes) ──
  const margin = 10;
  if (px < x + margin || px > x + w - margin || py < y + margin || py > y + h - margin) {
    return false;
  }

  // ── for rounded / bumper shapes, reject corners ──
  if (shape !== "square") {
    const r = shape === "bumper" ? 36 * scale : 28 * scale;
    // Check each corner
    const corners = [
      { cx: x + r, cy: y + r },
      { cx: x + w - r, cy: y + r },
      { cx: x + r, cy: y + h - r },
      { cx: x + w - r, cy: y + h - r },
    ];
    for (const corner of corners) {
      const dx = px - corner.cx;
      const dy = py - corner.cy;
      if (dx * dx + dy * dy > r * r &&
          px < corner.cx && py < corner.cy ||
          px > corner.cx && py < corner.cy ||
          px < corner.cx && py > corner.cy ||
          px > corner.cx && py > corner.cy) {
        // Only reject if actually in the corner quadrant outside the arc
        const inCornerQuadrant =
          (px < x + r && py < y + r) ||
          (px > x + w - r && py < y + r) ||
          (px < x + r && py > y + h - r) ||
          (px > x + w - r && py > y + h - r);
        if (inCornerQuadrant) {
          // distance from nearest corner centre
          let minDist = Infinity;
          for (const c of corners) {
            const d = Math.sqrt((px - c.cx) ** 2 + (py - c.cy) ** 2);
            if (d < minDist) minDist = d;
          }
          if (minDist > r) return false;
        }
      }
    }
  }

  // ── block the camera lens (with a little extra padding) ──
  const dxL = px - lensX;
  const dyL = py - lensY;
  if (dxL * dxL + dyL * dyL < (lensR + 8) * (lensR + 8)) {
    return false;
  }

  return true;
}

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
    void btnText;
    const btnZone = this.add.zone(VW / 2, VH - 74, 200, 56).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => drawBtn(true));
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.caseShape = shapes[selectedIdx]!.id;
      this.cameras.main.fadeOut(300, 253, 244, 255);
      this.time.delayedCall(300, () => this.scene.start("clean"));
    });
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
    void progressBg;
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
// Case constants for the sticker scene (must match redrawCase scale below)
const STICKER_CASE_X = VW / 2;
const STICKER_CASE_Y = 300;
const STICKER_CASE_SCALE = 1.05;

class StickerScene extends Phaser.Scene {
  private caseGfx!: Phaser.GameObjects.Graphics;
  private placedStickers: Phaser.GameObjects.Text[] = [];
  private stickerData: PlacedSticker[] = [];
  private noDropFeedback!: Phaser.GameObjects.Text;

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
    this.add.text(VW / 2, 74, "Pick a sticker, then tap INSIDE the case to place it", {
      fontFamily: "Manrope, sans-serif", fontSize: "12px", color: "#6b21a8",
      align: "center", wordWrap: { width: VW - 30 },
    }).setOrigin(0.5);

    // Phone case (drawn at depth 1 so stickers go on top at depth 6)
    this.caseGfx = this.add.graphics().setDepth(1);
    this.redrawCase();

    // "Can't place here" feedback text — hidden until needed
    this.noDropFeedback = this.add.text(VW / 2, STICKER_CASE_Y, "", {
      fontFamily: "Manrope, sans-serif", fontSize: "13px", color: "#dc2626",
      align: "center",
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    // ── Sticker palette ──────────────────────────────────────────────────────
    const STICKERS = [
      "⭐","💖","🌈","🦋","🌸","🍭","🎀","🔥","💎","🌙",
      "🦄","🍓","🌺","✨","🎵","🍦","🌊","🐱","🐶","🍀",
    ];

    const cols = 5;
    const sSize = 44;
    const sGap = 8;
    const totalW = cols * sSize + (cols - 1) * sGap;
    const startX = (VW - totalW) / 2 + sSize / 2;
    const startY = 490;

    let selectedSticker: string | null = null;
    const stickerBtns: Phaser.GameObjects.Graphics[] = [];

    // Tray background
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
          const bx = startX + (bi % cols) * (sSize + sGap) - sSize / 2 - 4;
          const by = startY + Math.floor(bi / cols) * (sSize + sGap) - sSize / 2 - 4;
          btn.fillStyle(0x8b5cf6, 0.25);
          btn.fillRoundedRect(bx, by, sSize + 8, sSize + 8, 10);
          btn.lineStyle(2, 0x7c3aed, 1);
          btn.strokeRoundedRect(bx, by, sSize + 8, sSize + 8, 10);
        }
      });
    };

    STICKERS.forEach((emoji, i) => {
      const sx = startX + (i % cols) * (sSize + sGap);
      const sy = startY + Math.floor(i / cols) * (sSize + sGap);

      const btn = this.add.graphics();
      stickerBtns.push(btn);
      this.add.text(sx, sy, emoji, { fontSize: "28px" }).setOrigin(0.5);

      const zone = this.add.zone(sx, sy, sSize, sSize).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        selectedSticker = emoji;
        highlightBtn(i);
      });
    });

    // ── Case tap zone — full canvas, placement validated by isValidStickerPos ─
    // We listen on the whole scene input so the player can tap anywhere and get
    // feedback. Only valid positions (inside case, not on lens) place a sticker.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!selectedSticker) return;

      // Ignore taps on the sticker tray (below startY - sSize/2 - 8)
      if (p.y >= startY - sSize / 2 - 8) return;

      const valid = isValidStickerPos(
        p.x, p.y,
        STICKER_CASE_X, STICKER_CASE_Y, STICKER_CASE_SCALE,
        state.caseShape
      );

      if (!valid) {
        // Show friendly "can't place here" shake
        const geo = getCaseGeometry(STICKER_CASE_X, STICKER_CASE_Y, STICKER_CASE_SCALE);
        const lensX = geo.lensX;
        const lensY = geo.lensY;
        const lensR = geo.lensR;
        const dx = p.x - lensX;
        const dy = p.y - lensY;
        const onLens = dx * dx + dy * dy < (lensR + 8) * (lensR + 8);

        const msg = onLens
          ? "📷 Can't place on the camera!"
          : "📱 Place stickers inside the case!";

        this.noDropFeedback.setText(msg).setAlpha(1).setPosition(VW / 2, p.y - 30);
        this.tweens.add({
          targets: this.noDropFeedback,
          alpha: 0,
          y: p.y - 60,
          duration: 900,
          ease: "Quad.easeOut",
        });

        // Wobble the case
        this.tweens.add({
          targets: this.caseGfx,
          x: -6, duration: 60, yoyo: true, repeat: 3,
          onComplete: () => { this.caseGfx.x = 0; },
        });
        return;
      }

      const angle = Phaser.Math.Between(-18, 18);
      const sc = 0.85 + Math.random() * 0.35;

      const placed = this.add.text(p.x, p.y, selectedSticker, { fontSize: "28px" })
        .setOrigin(0.5).setAngle(angle).setScale(sc * 1.5).setDepth(6);

      this.placedStickers.push(placed);
      this.stickerData.push({ emoji: selectedSticker, x: p.x, y: p.y, scale: sc, angle });

      // Pop-in animation
      this.tweens.add({ targets: placed, scaleX: sc, scaleY: sc, duration: 220, ease: "Back.easeOut" });
    });

    // ── Undo button ──────────────────────────────────────────────────────────
    const undoBg = this.add.graphics();
    const drawUndo = (hover: boolean) => {
      undoBg.clear();
      undoBg.fillStyle(hover ? 0x6b7280 : 0x9ca3af, 1);
      undoBg.fillRoundedRect(16, VH - 72, 80, 40, 20);
    };
    drawUndo(false);
    this.add.text(56, VH - 52, "↩ Undo", {
      fontFamily: "Manrope, sans-serif", fontSize: "14px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const undoZone = this.add.zone(56, VH - 52, 88, 44).setInteractive({ useHandCursor: true });
    undoZone.on("pointerover", () => drawUndo(true));
    undoZone.on("pointerout", () => drawUndo(false));
    undoZone.on("pointerdown", () => {
      const last = this.placedStickers.pop();
      if (last) { last.destroy(); this.stickerData.pop(); }
    });

    // ── Done button ──────────────────────────────────────────────────────────
    const doneBg = this.add.graphics();
    const drawDone = (hover: boolean) => {
      doneBg.clear();
      doneBg.fillStyle(hover ? 0x6d28d9 : 0x7c3aed, 1);
      doneBg.fillRoundedRect(VW / 2 - 80, VH - 72, 160, 44, 22);
      doneBg.fillStyle(0xffffff, 0.15);
      doneBg.fillRoundedRect(VW / 2 - 72, VH - 69, 144, 17, 11);
    };
    drawDone(false);
    const doneText = this.add.text(VW / 2, VH - 50, "Finish! 🎉", {
      fontFamily: "Manrope, sans-serif", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const doneZone = this.add.zone(VW / 2, VH - 50, 170, 48).setInteractive({ useHandCursor: true });
    doneZone.on("pointerover", () => { drawDone(true); this.tweens.add({ targets: [doneBg, doneText], scaleX: 1.04, scaleY: 1.04, duration: 60, yoyo: true }); });
    doneZone.on("pointerout", () => drawDone(false));
    doneZone.on("pointerdown", () => {
      state.stickers = [...this.stickerData];
      this.cameras.main.fadeOut(300, 253, 244, 255);
      this.time.delayedCall(300, () => this.scene.start("finish"));
    });

    this.cameras.main.fadeIn(400, 253, 244, 255);
  }

  private redrawCase(): void {
    this.caseGfx.clear();
    drawPhoneCase(this.caseGfx, STICKER_CASE_X, STICKER_CASE_Y, state.paintColor, state.caseShape, STICKER_CASE_SCALE);
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
    for (let i = 0; i < 32; i++) {
      const cx = Phaser.Math.Between(10, VW - 10);
      const cy = Phaser.Math.Between(-40, VH * 0.4);
      const confColor = Phaser.Utils.Array.GetRandom([
        0xef4444, 0xf472b6, 0xfacc15, 0x22c55e, 0x3b82f6, 0x8b5cf6,
      ]) as number;
      const conf = this.add.rectangle(cx, cy, Phaser.Math.Between(6, 14), Phaser.Math.Between(6, 14), confColor);
      this.tweens.add({
        targets: conf,
        y: cy + Phaser.Math.Between(300, 700),
        x: cx + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 1000),
        repeat: -1,
        onRepeat: () => {
          conf.y = Phaser.Math.Between(-40, -10);
          conf.x = Phaser.Math.Between(10, VW - 10);
          conf.alpha = 1;
        },
      });
    }

    this.add.text(VW / 2, 52, "🎉 Amazing!", {
      fontFamily: "Fraunces, serif", fontSize: "40px", color: "#be185d",
    }).setOrigin(0.5);
    this.add.text(VW / 2, 102, "Your phone case is ready!", {
      fontFamily: "Manrope, sans-serif", fontSize: "17px", color: "#7c3aed",
    }).setOrigin(0.5);

    // Finished case
    const caseGfx = this.add.graphics().setDepth(1);
    drawPhoneCase(caseGfx, VW / 2, 310, state.paintColor, state.caseShape, 1.15);

    // Re-draw stickers on the finished case
    const geo = getCaseGeometry(VW / 2, 310, 1.15);
    const scaleRatio = 1.15 / STICKER_CASE_SCALE;
    for (const s of state.stickers) {
      // Map sticker position from sticker scene coords to finish scene coords
      const dx = s.x - STICKER_CASE_X;
      const dy = s.y - STICKER_CASE_Y;
      const fx = VW / 2 + dx * scaleRatio;
      const fy = 310 + dy * scaleRatio;
      // Keep within case bounds
      const clampedX = Phaser.Math.Clamp(fx, geo.x + 10, geo.x + geo.w - 10);
      const clampedY = Phaser.Math.Clamp(fy, geo.y + 10, geo.y + geo.h - 10);
      this.add.text(clampedX, clampedY, s.emoji, { fontSize: "28px" })
        .setOrigin(0.5).setAngle(s.angle).setScale(s.scale).setDepth(6);
    }

    // Play again button
    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x9d174d : 0xbe185d, 1);
      btnBg.fillRoundedRect(VW / 2 - 100, VH - 100, 200, 54, 27);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 92, VH - 97, 184, 21, 14);
    };
    drawBtn(false);
    const btnText = this.add.text(VW / 2, VH - 73, "🎨 Make Another!", {
      fontFamily: "Manrope, sans-serif", fontSize: "19px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const btnZone = this.add.zone(VW / 2, VH - 73, 220, 58).setInteractive({ useHandCursor: true });
    btnZone.on("pointerover", () => { drawBtn(true); this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.04, scaleY: 1.04, duration: 60, yoyo: true }); });
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.stickers = [];
      this.cameras.main.fadeOut(300, 252, 231, 243);
      this.time.delayedCall(300, () => this.scene.start("menu"));
    });

    this.cameras.main.fadeIn(400, 253, 244, 255);
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
