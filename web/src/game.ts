import Phaser from "phaser";

// ─── Virtual canvas ───────────────────────────────────────────────────────────
const VW = 390;
const VH = 680;

// ─── Shared state passed between scenes ──────────────────────────────────────
interface GameState {
  caseShape: "rounded" | "square" | "bumper";
  paintColor: number;
  onScore: (n: number) => void;
}

const state: GameState = {
  caseShape: "rounded",
  paintColor: 0xffffff,
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
  constructor() {
    super("menu");
  }

  create(): void {
    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfce7f3, 0xfce7f3, 0xfdf2f8, 0xfdf2f8, 1);
    bg.fillRect(0, 0, VW, VH);

    // Floating bubbles decoration
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
        yoyo: false,
        onRepeat: () => {
          bubble.y = by;
          bubble.alpha = 0.35;
        },
      });
    }

    // Title
    this.add
      .text(VW / 2, 120, "📱", { fontSize: "72px" })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 210, "Phone Case", {
        fontFamily: "Fraunces, serif",
        fontSize: "42px",
        color: "#be185d",
        stroke: "#fce7f3",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 260, "DIY Studio", {
        fontFamily: "Fraunces, serif",
        fontSize: "42px",
        color: "#7c3aed",
        stroke: "#fdf2f8",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 320, "Design your perfect case!", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "17px",
        color: "#9d174d",
      })
      .setOrigin(0.5);

    // Preview phone case
    const previewGfx = this.add.graphics();
    drawPhoneCase(previewGfx, VW / 2, 440, 0xf472b6, "rounded", 0.85);

    // Bounce the preview
    this.tweens.add({
      targets: previewGfx,
      y: -6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Start button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xbe185d, 1);
    btnBg.fillRoundedRect(VW / 2 - 90, VH - 110, 180, 56, 28);
    btnBg.fillStyle(0xffffff, 0.15);
    btnBg.fillRoundedRect(VW / 2 - 82, VH - 107, 164, 22, 14);

    const btnText = this.add
      .text(VW / 2, VH - 82, "✨  Let's Start!", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const btnZone = this.add
      .zone(VW / 2, VH - 82, 200, 60)
      .setInteractive({ useHandCursor: true });

    btnZone.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0x9d174d, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 110, 180, 56, 28);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });
    btnZone.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xbe185d, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 110, 180, 56, 28);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 82, VH - 107, 164, 22, 14);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1, scaleY: 1, duration: 80 });
    });
    btnZone.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 252, 231, 243);
      this.time.delayedCall(300, () => this.scene.start("shape"));
    });

    this.cameras.main.fadeIn(400, 252, 231, 243);
  }
}

// ─── SCENE 2: Shape Picker ────────────────────────────────────────────────────
class ShapeScene extends Phaser.Scene {
  constructor() {
    super("shape");
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfdf4ff, 0xfdf4ff, 0xfce7f3, 0xfce7f3, 1);
    bg.fillRect(0, 0, VW, VH);

    this.add
      .text(VW / 2, 52, "Choose Your Case Shape", {
        fontFamily: "Fraunces, serif",
        fontSize: "26px",
        color: "#7c3aed",
        align: "center",
        wordWrap: { width: VW - 40 },
      })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 92, "Tap a shape to select it", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "15px",
        color: "#9d174d",
      })
      .setOrigin(0.5);

    const shapes: { id: GameState["caseShape"]; label: string; emoji: string }[] = [
      { id: "rounded", label: "Classic Rounded", emoji: "🌸" },
      { id: "square", label: "Sharp Square", emoji: "🔲" },
      { id: "bumper", label: "Bumper Case", emoji: "💫" },
    ];

    const positions = [VW / 2 - 120, VW / 2, VW / 2 + 120];
    let selectedId: GameState["caseShape"] = "rounded";

    const selectionRings: Phaser.GameObjects.Graphics[] = [];

    shapes.forEach((s, i) => {
      const cx = positions[i]!;
      const cy = 310;

      // Selection ring
      const ring = this.add.graphics();
      selectionRings.push(ring);
      const drawRing = (active: boolean) => {
        ring.clear();
        if (active) {
          ring.lineStyle(4, 0x7c3aed, 1);
          ring.strokeRoundedRect(cx - 68, cy - 108, 136, 216, 20);
          ring.fillStyle(0x7c3aed, 0.07);
          ring.fillRoundedRect(cx - 68, cy - 108, 136, 216, 20);
        }
      };
      drawRing(i === 0);

      // Card bg
      const card = this.add.graphics();
      card.fillStyle(0xffffff, 0.85);
      card.fillRoundedRect(cx - 64, cy - 104, 128, 208, 18);

      // Phone case preview
      const gfx = this.add.graphics();
      drawPhoneCase(gfx, cx, cy - 10, 0xd8b4fe, s.id, 0.72);

      // Label
      this.add
        .text(cx, cy + 88, s.emoji + "\n" + s.label, {
          fontFamily: "Manrope, sans-serif",
          fontSize: "12px",
          color: "#581c87",
          align: "center",
        })
        .setOrigin(0.5, 0);

      // Hit zone
      const zone = this.add
        .zone(cx, cy, 130, 210)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerdown", () => {
        selectedId = s.id;
        selectionRings.forEach((r, ri) => {
          r.clear();
          if (ri === i) {
            r.lineStyle(4, 0x7c3aed, 1);
            r.strokeRoundedRect(cx - 68, cy - 108, 136, 216, 20);
            r.fillStyle(0x7c3aed, 0.07);
            r.fillRoundedRect(cx - 68, cy - 108, 136, 216, 20);
          }
        });
        this.tweens.add({ targets: [card, gfx], scaleX: 0.95, scaleY: 0.95, duration: 60, yoyo: true });
      });
    });

    // Next button
    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x6d28d9 : 0x7c3aed, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 100, 180, 52, 26);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 82, VH - 97, 164, 20, 13);
    };
    drawBtn(false);

    const btnText = this.add
      .text(VW / 2, VH - 74, "Next →", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const btnZone = this.add
      .zone(VW / 2, VH - 74, 200, 56)
      .setInteractive({ useHandCursor: true });

    btnZone.on("pointerover", () => drawBtn(true));
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.caseShape = selectedId;
      this.cameras.main.fadeOut(300, 253, 244, 255);
      this.time.delayedCall(300, () => this.scene.start("clean"));
    });

    this.cameras.main.fadeIn(400, 253, 244, 255);
  }
}

// ─── SCENE 3: Cleaning ────────────────────────────────────────────────────────
class CleanScene extends Phaser.Scene {
  private cleanProgress = 0; // 0–1
  private timeLeft = 5;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private caseGfx!: Phaser.GameObjects.Graphics;
  private dirtMask!: Phaser.GameObjects.Graphics;
  private sponge!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBg!: Phaser.GameObjects.Graphics;
  private scrubPoints: { x: number; y: number }[] = [];
  private done = false;
  private caseX = VW / 2;
  private caseY = 340;
  private caseW = 110;
  private caseH = 190;

  constructor() {
    super("clean");
  }

  create(): void {
    this.cleanProgress = 0;
    this.timeLeft = 5;
    this.scrubPoints = [];
    this.done = false;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe0f2fe, 0xe0f2fe, 0xf0fdf4, 0xf0fdf4, 1);
    bg.fillRect(0, 0, VW, VH);

    // Shelf / table
    const shelf = this.add.graphics();
    shelf.fillStyle(0xd4a574, 1);
    shelf.fillRoundedRect(40, 450, VW - 80, 18, 9);
    shelf.fillStyle(0xb8864e, 1);
    shelf.fillRect(40, 462, VW - 80, 6);

    // Title
    this.add
      .text(VW / 2, 46, "🧽  Clean the Case!", {
        fontFamily: "Fraunces, serif",
        fontSize: "28px",
        color: "#0f766e",
      })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 84, "Scrub away the dirt before time runs out!", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "14px",
        color: "#134e4a",
        align: "center",
        wordWrap: { width: VW - 40 },
      })
      .setOrigin(0.5);

    // Timer display
    this.timerText = this.add
      .text(VW / 2, 128, "⏱  5", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "32px",
        color: "#dc2626",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Progress bar bg
    this.progressBg = this.add.graphics();
    this.progressBg.fillStyle(0xd1d5db, 1);
    this.progressBg.fillRoundedRect(VW / 2 - 100, 162, 200, 14, 7);

    // Progress bar fill
    this.progressBar = this.add.graphics();

    // Dirty phone case
    this.caseGfx = this.add.graphics();
    drawPhoneCase(this.caseGfx, this.caseX, this.caseY, 0xffffff, state.caseShape, 1, true);

    // Sponge cursor
    this.sponge = this.add.text(0, 0, "🧽", { fontSize: "40px" }).setOrigin(0.5).setDepth(10);
    this.sponge.setVisible(false);

    // Scrub trail graphics
    this.dirtMask = this.add.graphics().setDepth(5);

    // Input
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.sponge.setVisible(true);
      this.sponge.setPosition(p.x, p.y - 20);
      if (p.isDown && !this.done) {
        this.scrub(p.x, p.y);
      }
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.done) this.scrub(p.x, p.y);
    });
    this.input.on("pointerout", () => this.sponge.setVisible(false));

    // Countdown timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.done) return;
        this.timeLeft -= 1;
        this.timerText.setText("⏱  " + Math.max(0, this.timeLeft));
        if (this.timeLeft <= 2) {
          this.timerText.setColor("#dc2626");
          this.tweens.add({ targets: this.timerText, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true });
        }
        if (this.timeLeft <= 0) {
          this.finishCleaning();
        }
      },
    });

    this.cameras.main.fadeIn(400, 224, 242, 254);
  }

  private scrub(px: number, py: number): void {
    // Only count scrubs within the case area
    const inCase =
      px > this.caseX - this.caseW / 2 - 10 &&
      px < this.caseX + this.caseW / 2 + 10 &&
      py > this.caseY - this.caseH / 2 - 10 &&
      py < this.caseY + this.caseH / 2 + 10;

    if (!inCase) return;

    // Add scrub point
    const alreadyNear = this.scrubPoints.some(
      (sp) => Math.abs(sp.x - px) < 18 && Math.abs(sp.y - py) < 18
    );
    if (!alreadyNear) {
      this.scrubPoints.push({ x: px, y: py });
    }

    // Redraw clean spots
    this.dirtMask.clear();
    this.dirtMask.fillStyle(0xf0f4f8, 1);
    for (const sp of this.scrubPoints) {
      this.dirtMask.fillCircle(sp.x, sp.y, 28);
    }

    // Estimate coverage
    const caseArea = this.caseW * this.caseH;
    const scrubArea = this.scrubPoints.length * Math.PI * 28 * 28;
    this.cleanProgress = Math.min(1, scrubArea / (caseArea * 0.72));

    // Update progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0x10b981, 1);
    this.progressBar.fillRoundedRect(VW / 2 - 100, 162, 200 * this.cleanProgress, 14, 7);

    // Auto-finish if fully clean
    if (this.cleanProgress >= 1 && !this.done) {
      this.finishCleaning();
    }
  }

  private finishCleaning(): void {
    if (this.done) return;
    this.done = true;
    this.timerEvent?.remove();
    this.sponge.setVisible(false);

    // Show clean case
    this.caseGfx.clear();
    drawPhoneCase(this.caseGfx, this.caseX, this.caseY, 0xf8fafc, state.caseShape, 1, false);
    this.dirtMask.clear();

    // "All clean!" message
    const msg = this.add
      .text(VW / 2, 520, "✨ Squeaky clean!", {
        fontFamily: "Fraunces, serif",
        fontSize: "26px",
        color: "#0f766e",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: msg, alpha: 1, y: 510, duration: 400 });

    // Proceed button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x0f766e, 1);
    btnBg.fillRoundedRect(VW / 2 - 90, VH - 100, 180, 52, 26);
    btnBg.fillStyle(0xffffff, 0.15);
    btnBg.fillRoundedRect(VW / 2 - 82, VH - 97, 164, 20, 13);
    btnBg.setAlpha(0);

    const btnText = this.add
      .text(VW / 2, VH - 74, "Paint it! 🎨", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 500, delay: 400 });

    const btnZone = this.add
      .zone(VW / 2, VH - 74, 200, 56)
      .setInteractive({ useHandCursor: true });

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
  private selectedSwatch: Phaser.GameObjects.Graphics | null = null;
  private selectedColor = 0xffffff;

  constructor() {
    super("paint");
  }

  create(): void {
    this.caseColor = 0xffffff;
    this.selectedColor = 0xffffff;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfff7ed, 0xfff7ed, 0xfdf2f8, 0xfdf2f8, 1);
    bg.fillRect(0, 0, VW, VH);

    // Easel decoration
    const easel = this.add.graphics();
    easel.fillStyle(0xc8a46e, 1);
    easel.fillRect(VW / 2 - 3, 180, 6, 260);
    easel.fillRect(VW / 2 - 80, 180, 160, 8);

    this.add
      .text(VW / 2, 44, "🎨  Paint Your Case!", {
        fontFamily: "Fraunces, serif",
        fontSize: "28px",
        color: "#c2410c",
      })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 82, "Tap a color to paint your case", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "15px",
        color: "#7c2d12",
      })
      .setOrigin(0.5);

    // Phone case preview
    this.caseGfx = this.add.graphics();
    this.redrawCase();

    // Color palette
    const colors: { hex: number; name: string }[] = [
      { hex: 0xef4444, name: "Red" },
      { hex: 0xf472b6, name: "Pink" },
      { hex: 0x1a1a2e, name: "Black" },
      { hex: 0xf8fafc, name: "White" },
      { hex: 0x92400e, name: "Brown" },
      { hex: 0xf97316, name: "Orange" },
      { hex: 0x3b82f6, name: "Blue" },
      { hex: 0x22c55e, name: "Green" },
      { hex: 0x8b5cf6, name: "Purple" },
      { hex: 0xfacc15, name: "Yellow" },
    ];

    const cols = 5;
    const swatchSize = 46;
    const gap = 12;
    const totalW = cols * swatchSize + (cols - 1) * gap;
    const startX = (VW - totalW) / 2;
    const startY = 530;

    let firstSwatch: Phaser.GameObjects.Graphics | null = null;

    colors.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = startX + col * (swatchSize + gap) + swatchSize / 2;
      const sy = startY + row * (swatchSize + gap) + swatchSize / 2;

      const swatch = this.add.graphics();
      const drawSwatch = (selected: boolean) => {
        swatch.clear();
        if (selected) {
          swatch.lineStyle(4, 0x1a1a2e, 1);
          swatch.strokeCircle(sx, sy, swatchSize / 2 + 3);
        }
        swatch.fillStyle(c.hex, 1);
        swatch.fillCircle(sx, sy, swatchSize / 2);
        // Shine
        swatch.fillStyle(0xffffff, 0.25);
        swatch.fillCircle(sx - 7, sy - 7, 8);
      };
      drawSwatch(i === 0);

      if (i === 0) {
        firstSwatch = swatch;
        this.selectedSwatch = swatch;
      }

      const zone = this.add
        .zone(sx, sy, swatchSize + 8, swatchSize + 8)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerdown", () => {
        // Deselect old
        if (this.selectedSwatch && this.selectedSwatch !== swatch) {
          const oldIdx = colors.findIndex((_, ci) => {
            const oc = ci % cols;
            const or = Math.floor(ci / cols);
            const ox = startX + oc * (swatchSize + gap) + swatchSize / 2;
            const oy = startY + or * (swatchSize + gap) + swatchSize / 2;
            return Math.abs(ox - sx) > 1 || Math.abs(oy - sy) > 1;
          });
          // Just redraw all swatches via a stored ref
        }
        this.selectedSwatch = swatch;
        // Redraw all swatches
        colors.forEach((cc, ci) => {
          const ccol = ci % cols;
          const crow = Math.floor(ci / cols);
          const csx = startX + ccol * (swatchSize + gap) + swatchSize / 2;
          const csy = startY + crow * (swatchSize + gap) + swatchSize / 2;
          // We need refs to redraw — use the zone's parent graphics
          // Simplest: just clear and redraw this swatch
          if (ci === i) {
            swatch.clear();
            swatch.lineStyle(4, 0x1a1a2e, 1);
            swatch.strokeCircle(csx, csy, swatchSize / 2 + 3);
            swatch.fillStyle(cc.hex, 1);
            swatch.fillCircle(csx, csy, swatchSize / 2);
            swatch.fillStyle(0xffffff, 0.25);
            swatch.fillCircle(csx - 7, csy - 7, 8);
          }
        });

        this.selectedColor = c.hex;
        this.caseColor = c.hex;
        this.redrawCase();

        this.tweens.add({ targets: swatch, scaleX: 1.2, scaleY: 1.2, duration: 80, yoyo: true });
      });

      // Label on hover
      zone.on("pointerover", () => {
        swatch.clear();
        swatch.lineStyle(3, 0x6b7280, 1);
        swatch.strokeCircle(sx, sy, swatchSize / 2 + 2);
        swatch.fillStyle(c.hex, 1);
        swatch.fillCircle(sx, sy, swatchSize / 2);
        swatch.fillStyle(0xffffff, 0.25);
        swatch.fillCircle(sx - 7, sy - 7, 8);
      });
      zone.on("pointerout", () => drawSwatch(this.selectedColor === c.hex));
    });

    // Suppress unused warning
    void firstSwatch;

    // Done button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xc2410c, 1);
    btnBg.fillRoundedRect(VW / 2 - 90, VH - 68, 180, 52, 26);
    btnBg.fillStyle(0xffffff, 0.15);
    btnBg.fillRoundedRect(VW / 2 - 82, VH - 65, 164, 20, 13);

    const btnText = this.add
      .text(VW / 2, VH - 42, "I'm Done! 🎉", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const btnZone = this.add
      .zone(VW / 2, VH - 42, 200, 56)
      .setInteractive({ useHandCursor: true });

    btnZone.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0x9a3412, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 68, 180, 52, 26);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.04, scaleY: 1.04, duration: 60, yoyo: true });
    });
    btnZone.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xc2410c, 1);
      btnBg.fillRoundedRect(VW / 2 - 90, VH - 68, 180, 52, 26);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 82, VH - 65, 164, 20, 13);
    });
    btnZone.on("pointerdown", () => {
      state.paintColor = this.caseColor;
      this.cameras.main.fadeOut(300, 255, 247, 237);
      this.time.delayedCall(300, () => this.scene.start("finish"));
    });

    this.cameras.main.fadeIn(400, 255, 247, 237);
  }

  private redrawCase(): void {
    this.caseGfx.clear();
    drawPhoneCase(this.caseGfx, VW / 2, 330, this.caseColor, state.caseShape, 1.1);
  }
}

// ─── SCENE 5: Finish ─────────────────────────────────────────────────────────
class FinishScene extends Phaser.Scene {
  constructor() {
    super("finish");
  }

  create(): void {
    state.onScore(100);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfdf2f8, 0xfdf2f8, 0xfdf4ff, 0xfdf4ff, 1);
    bg.fillRect(0, 0, VW, VH);

    // Confetti
    for (let i = 0; i < 30; i++) {
      const cx = Phaser.Math.Between(10, VW - 10);
      const cy = Phaser.Math.Between(-20, VH + 20);
      const confColor = Phaser.Utils.Array.GetRandom([
        0xef4444, 0xf472b6, 0xfacc15, 0x22c55e, 0x3b82f6, 0x8b5cf6,
      ]) as number;
      const conf = this.add.rectangle(
        cx, cy,
        Phaser.Math.Between(6, 14),
        Phaser.Math.Between(6, 14),
        confColor
      );
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
          conf.y = Phaser.Math.Between(-20, 0);
          conf.x = Phaser.Math.Between(10, VW - 10);
          conf.alpha = 1;
        },
      });
    }

    // Stars
    this.add.text(VW / 2, 60, "🌟 🎉 🌟", { fontSize: "36px" }).setOrigin(0.5);

    this.add
      .text(VW / 2, 116, "Your Case is Ready!", {
        fontFamily: "Fraunces, serif",
        fontSize: "32px",
        color: "#be185d",
        stroke: "#fce7f3",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(VW / 2, 158, "What an amazing design! 💖", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "16px",
        color: "#9d174d",
      })
      .setOrigin(0.5);

    // Final phone case — big and proud
    const finalGfx = this.add.graphics();
    drawPhoneCase(finalGfx, VW / 2, 360, state.paintColor, state.caseShape, 1.35);

    // Sparkle tweens on the case
    this.tweens.add({
      targets: finalGfx,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Color name label
    const colorNames: Record<number, string> = {
      0xef4444: "Red",
      0xf472b6: "Pink",
      0x1a1a2e: "Black",
      0xf8fafc: "White",
      0x92400e: "Brown",
      0xf97316: "Orange",
      0x3b82f6: "Blue",
      0x22c55e: "Green",
      0x8b5cf6: "Purple",
      0xfacc15: "Yellow",
      0xffffff: "White",
    };
    const colorName = colorNames[state.paintColor] ?? "Custom";
    const shapeName =
      state.caseShape === "rounded"
        ? "Classic Rounded"
        : state.caseShape === "square"
        ? "Sharp Square"
        : "Bumper Case";

    this.add
      .text(VW / 2, 510, `${colorName} • ${shapeName}`, {
        fontFamily: "Manrope, sans-serif",
        fontSize: "15px",
        color: "#7c3aed",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Play again button
    const btnBg = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x9d174d : 0xbe185d, 1);
      btnBg.fillRoundedRect(VW / 2 - 100, VH - 100, 200, 56, 28);
      btnBg.fillStyle(0xffffff, 0.15);
      btnBg.fillRoundedRect(VW / 2 - 92, VH - 97, 184, 22, 14);
    };
    drawBtn(false);

    const btnText = this.add
      .text(VW / 2, VH - 72, "🔄  Make Another!", {
        fontFamily: "Manrope, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const btnZone = this.add
      .zone(VW / 2, VH - 72, 220, 60)
      .setInteractive({ useHandCursor: true });

    btnZone.on("pointerover", () => drawBtn(true));
    btnZone.on("pointerout", () => drawBtn(false));
    btnZone.on("pointerdown", () => {
      state.onScore(0);
      this.cameras.main.fadeOut(300, 253, 242, 248);
      this.time.delayedCall(300, () => this.scene.start("menu"));
    });

    this.cameras.main.fadeIn(500, 253, 242, 248);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
export function startGame(parent: HTMLElement, onScore: (n: number) => void): () => void {
  state.onScore = onScore;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VW,
    height: VH,
    backgroundColor: "#fce7f3",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MenuScene, ShapeScene, CleanScene, PaintScene, FinishScene],
    banner: false,
  });

  return () => game.destroy(true);
}
