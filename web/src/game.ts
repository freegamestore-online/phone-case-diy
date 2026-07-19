import Phaser from "phaser";

// ─── Virtual canvas size ────────────────────────────────────────────────────
const VW = 480;
const VH = 720;

// ─── Sticker / decoration data ──────────────────────────────────────────────
interface StickerDef {
  emoji: string;
  label: string;
}

const STICKERS: StickerDef[] = [
  { emoji: "⭐", label: "star" },
  { emoji: "🌈", label: "rainbow" },
  { emoji: "🦋", label: "butterfly" },
  { emoji: "🌸", label: "flower" },
  { emoji: "💎", label: "gem" },
  { emoji: "🍭", label: "lollipop" },
  { emoji: "🌙", label: "moon" },
  { emoji: "🦄", label: "unicorn" },
  { emoji: "🎀", label: "bow" },
  { emoji: "🍀", label: "clover" },
  { emoji: "🔥", label: "fire" },
  { emoji: "❤️", label: "heart" },
];

// Case background color palette (pastel + bright)
const CASE_COLORS = [
  0xfce7f3, // pink
  0xfef9c3, // yellow
  0xdbeafe, // blue
  0xdcfce7, // green
  0xf3e8ff, // purple
  0xffedd5, // orange
  0xe0f2fe, // sky
  0xfff1f2, // rose
  0xf0fdf4, // mint
  0xfdf4ff, // lavender
];

// Pattern types
type PatternType = "none" | "dots" | "stripes" | "stars" | "hearts" | "zigzag";
const PATTERNS: PatternType[] = ["none", "dots", "stripes", "stars", "hearts", "zigzag"];
const PATTERN_LABELS: Record<PatternType, string> = {
  none: "Plain",
  dots: "Dots",
  stripes: "Stripes",
  stars: "Stars",
  hearts: "Hearts",
  zigzag: "Zigzag",
};

// ─── Utility: draw a rounded rectangle path ─────────────────────────────────
function roundedRectPath(
  gfx: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  gfx.beginPath();
  gfx.moveTo(x + r, y);
  gfx.lineTo(x + w - r, y);
  gfx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  gfx.lineTo(x + w, y + h - r);
  gfx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  gfx.lineTo(x + r, y + h);
  gfx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  gfx.lineTo(x, y + r);
  gfx.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
  gfx.closePath();
}

// ─── Main Play Scene ─────────────────────────────────────────────────────────
class PhoneCaseScene extends Phaser.Scene {
  private readonly onScore: (n: number) => void;

  // Case dimensions / position
  private readonly caseX = VW / 2;
  private readonly caseY = 310;
  private readonly caseW = 200;
  private readonly caseH = 360;
  private readonly caseR = 28;

  // State
  private colorIndex = 0;
  private patternIndex = 0;
  private placedStickers: { x: number; y: number; emoji: string; obj: Phaser.GameObjects.Text }[] = [];
  private selectedSticker: StickerDef | null = null;
  private score = 0;
  private done = false;

  // Graphics layers
  private caseGraphics!: Phaser.GameObjects.Graphics;
  private patternGraphics!: Phaser.GameObjects.Graphics;
  private caseOutline!: Phaser.GameObjects.Graphics;
  private glareGraphics!: Phaser.GameObjects.Graphics;

  // UI elements
  private colorButtons: Phaser.GameObjects.Container[] = [];
  private patternButtons: Phaser.GameObjects.Container[] = [];
  private stickerButtons: Phaser.GameObjects.Container[] = [];
  private selectedHighlight!: Phaser.GameObjects.Rectangle;
  private selectedLabel!: Phaser.GameObjects.Text;
  private doneButton!: Phaser.GameObjects.Container;
  private clearButton!: Phaser.GameObjects.Container;
  private scoreDisplay!: Phaser.GameObjects.Text;
  private stickerCountText!: Phaser.GameObjects.Text;
  private caseHitZone!: Phaser.GameObjects.Zone;

  constructor(onScore: (n: number) => void) {
    super("phone-case");
    this.onScore = onScore;
  }

  preload(): void {
    // Nothing to load — we use Phaser graphics + emoji text for everything
  }

  create(): void {
    this.done = false;
    this.score = 0;
    this.placedStickers = [];
    this.selectedSticker = null;
    this.colorIndex = 0;
    this.patternIndex = 0;
    this.onScore(0);

    // ── Background ──────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xfdf2f8, 0xfdf2f8, 0xf0f9ff, 0xf0f9ff, 1);
    bg.fillRect(0, 0, VW, VH);

    // Decorative background circles
    const bgDeco = this.add.graphics();
    bgDeco.fillStyle(0xfce7f3, 0.4);
    bgDeco.fillCircle(60, 80, 70);
    bgDeco.fillStyle(0xdbeafe, 0.4);
    bgDeco.fillCircle(VW - 50, 120, 55);
    bgDeco.fillStyle(0xfef9c3, 0.4);
    bgDeco.fillCircle(40, VH - 100, 60);
    bgDeco.fillStyle(0xdcfce7, 0.4);
    bgDeco.fillCircle(VW - 60, VH - 80, 50);

    // ── Title ───────────────────────────────────────────────────────────────
    this.add.text(VW / 2, 22, "📱 Phone Case DIY", {
      fontFamily: "Fraunces, serif",
      fontSize: "26px",
      color: "#be185d",
      stroke: "#fce7f3",
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Phone Case layers ───────────────────────────────────────────────────
    const cx = this.caseX - this.caseW / 2;
    const cy = this.caseY - this.caseH / 2;

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    roundedRectPath(shadow, cx + 6, cy + 8, this.caseW, this.caseH, this.caseR);
    shadow.fillPath();

    // Case base (color fill)
    this.caseGraphics = this.add.graphics();

    // Pattern layer
    this.patternGraphics = this.add.graphics();
    this.patternGraphics.setMask(this.createCaseMask());

    // Case outline
    this.caseOutline = this.add.graphics();

    // Glare overlay
    this.glareGraphics = this.add.graphics();

    // Draw initial case
    this.redrawCase();

    // Phone screen (inner rectangle)
    const screenGfx = this.add.graphics();
    const sw = this.caseW - 24;
    const sh = this.caseH - 80;
    const sx = cx + 12;
    const sy = cy + 50;
    screenGfx.fillStyle(0x1e293b, 0.85);
    roundedRectPath(screenGfx, sx, sy, sw, sh, 14);
    screenGfx.fillPath();
    // Screen shine
    screenGfx.fillStyle(0xffffff, 0.06);
    screenGfx.fillRect(sx + 6, sy + 6, sw - 12, sh / 3);
    // Screen time text
    this.add.text(this.caseX, cy + 50 + sh / 2 - 30, "12:00", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "28px",
      color: "#ffffff",
      alpha: 0.7,
    }).setOrigin(0.5, 0.5).setAlpha(0.6);
    this.add.text(this.caseX, cy + 50 + sh / 2 + 10, "Fri, Jan 10", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "13px",
      color: "#ffffff",
    }).setOrigin(0.5, 0.5).setAlpha(0.45);

    // Camera notch
    const notch = this.add.graphics();
    notch.fillStyle(0x0f172a, 1);
    notch.fillRoundedRect(this.caseX - 22, cy + 16, 44, 18, 9);
    notch.fillStyle(0x334155, 1);
    notch.fillCircle(this.caseX + 8, cy + 25, 5);
    notch.fillStyle(0x1e40af, 0.6);
    notch.fillCircle(this.caseX + 8, cy + 25, 3);

    // Home button
    const home = this.add.graphics();
    home.fillStyle(0xe2e8f0, 0.5);
    home.fillCircle(this.caseX, cy + this.caseH - 18, 10);
    home.strokeCircle(this.caseX, cy + this.caseH - 18, 10);

    // ── Hit zone for sticker placement ─────────────────────────────────────
    this.caseHitZone = this.add.zone(this.caseX, this.caseY, this.caseW, this.caseH)
      .setInteractive({ useHandCursor: true });
    this.caseHitZone.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.onCaseTap(ptr.x, ptr.y);
    });

    // ── Score display ───────────────────────────────────────────────────────
    this.scoreDisplay = this.add.text(VW / 2, 56, "Design your case! 🎨", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "14px",
      color: "#6b21a8",
    }).setOrigin(0.5, 0);

    this.stickerCountText = this.add.text(VW / 2, 74, "", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "12px",
      color: "#9333ea",
    }).setOrigin(0.5, 0);

    // ── UI Panels ───────────────────────────────────────────────────────────
    this.buildColorPanel();
    this.buildPatternPanel();
    this.buildStickerPanel();
    this.buildActionButtons();

    // ── Selected sticker indicator ──────────────────────────────────────────
    this.selectedHighlight = this.add.rectangle(VW / 2, VH - 52, 120, 30, 0xfce7f3, 1)
      .setStrokeStyle(2, 0xec4899)
      .setVisible(false);
    this.selectedLabel = this.add.text(VW / 2, VH - 52, "", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "12px",
      color: "#be185d",
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  // ── Create a mask shaped like the phone case ─────────────────────────────
  private createCaseMask(): Phaser.Display.Masks.GeometryMask {
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    const cx = this.caseX - this.caseW / 2;
    const cy = this.caseY - this.caseH / 2;
    maskGfx.fillStyle(0xffffff, 1);
    roundedRectPath(maskGfx, cx, cy, this.caseW, this.caseH, this.caseR);
    maskGfx.fillPath();
    return maskGfx.createGeometryMask();
  }

  // ── Redraw the case fill + pattern + outline ─────────────────────────────
  private redrawCase(): void {
    const cx = this.caseX - this.caseW / 2;
    const cy = this.caseY - this.caseH / 2;
    const color = CASE_COLORS[this.colorIndex] ?? 0xfce7f3;

    // Base fill
    this.caseGraphics.clear();
    this.caseGraphics.fillStyle(color, 1);
    roundedRectPath(this.caseGraphics, cx, cy, this.caseW, this.caseH, this.caseR);
    this.caseGraphics.fillPath();

    // Pattern
    this.patternGraphics.clear();
    this.drawPattern(this.patternGraphics, cx, cy, this.caseW, this.caseH, color);

    // Outline
    this.caseOutline.clear();
    this.caseOutline.lineStyle(4, 0xd1d5db, 1);
    roundedRectPath(this.caseOutline, cx, cy, this.caseW, this.caseH, this.caseR);
    this.caseOutline.strokePath();
    // Inner highlight ring
    this.caseOutline.lineStyle(2, 0xffffff, 0.6);
    roundedRectPath(this.caseOutline, cx + 4, cy + 4, this.caseW - 8, this.caseH - 8, this.caseR - 3);
    this.caseOutline.strokePath();

    // Glare
    this.glareGraphics.clear();
    this.glareGraphics.fillStyle(0xffffff, 0.18);
    this.glareGraphics.fillTriangle(cx + 20, cy + 10, cx + 80, cy + 10, cx + 20, cy + 90);
  }

  // ── Draw background pattern onto the case ────────────────────────────────
  private drawPattern(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    w: number,
    h: number,
    baseColor: number
  ): void {
    const pattern = PATTERNS[this.patternIndex] ?? "none";
    if (pattern === "none") return;

    // Darken the base color slightly for the pattern
    const r = ((baseColor >> 16) & 0xff);
    const g = ((baseColor >> 8) & 0xff);
    const b = (baseColor & 0xff);
    const dr = Math.max(0, r - 40);
    const dg = Math.max(0, g - 40);
    const db = Math.max(0, b - 40);
    const patColor = (dr << 16) | (dg << 8) | db;
    gfx.fillStyle(patColor, 0.35);

    if (pattern === "dots") {
      const spacing = 22;
      for (let px = cx + spacing / 2; px < cx + w; px += spacing) {
        for (let py = cy + spacing / 2; py < cy + h; py += spacing) {
          gfx.fillCircle(px, py, 4);
        }
      }
    } else if (pattern === "stripes") {
      const stripeW = 14;
      for (let px = cx - h; px < cx + w + h; px += stripeW * 2) {
        gfx.fillRect(px, cy, stripeW, h);
      }
    } else if (pattern === "stars") {
      const spacing = 30;
      for (let px = cx + spacing / 2; px < cx + w; px += spacing) {
        for (let py = cy + spacing / 2; py < cy + h; py += spacing) {
          this.drawStar(gfx, px, py, 5, 8, 4);
        }
      }
    } else if (pattern === "hearts") {
      const spacing = 32;
      for (let px = cx + spacing / 2; px < cx + w; px += spacing) {
        for (let py = cy + spacing / 2; py < cy + h; py += spacing) {
          this.drawHeart(gfx, px, py, 7);
        }
      }
    } else if (pattern === "zigzag") {
      const zigH = 16;
      const zigW = 20;
      gfx.lineStyle(3, patColor, 0.4);
      for (let row = 0; row * zigH < h + zigH; row++) {
        gfx.beginPath();
        let px = cx;
        const py = cy + row * zigH;
        gfx.moveTo(px, py);
        let up = true;
        while (px < cx + w + zigW) {
          gfx.lineTo(px + zigW / 2, up ? py - zigH / 2 : py + zigH / 2);
          px += zigW / 2;
          up = !up;
        }
        gfx.strokePath();
      }
    }
  }

  private drawStar(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    points: number,
    outerR: number,
    innerR: number
  ): void {
    const step = Math.PI / points;
    gfx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) gfx.moveTo(x, y);
      else gfx.lineTo(x, y);
    }
    gfx.closePath();
    gfx.fillPath();
  }

  private drawHeart(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number): void {
    gfx.beginPath();
    gfx.moveTo(cx, cy + size * 0.3);
    gfx.arc(cx - size * 0.5, cy - size * 0.1, size * 0.5, Math.PI * 0.1, Math.PI, true);
    gfx.arc(cx + size * 0.5, cy - size * 0.1, size * 0.5, 0, Math.PI * 0.9, false);
    gfx.lineTo(cx, cy + size);
    gfx.closePath();
    gfx.fillPath();
  }

  // ── Build color picker row ────────────────────────────────────────────────
  private buildColorPanel(): void {
    const panelY = 660;
    const startX = VW / 2 - (CASE_COLORS.length * 26) / 2 + 10;

    this.add.text(12, panelY - 14, "Color", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "11px",
      color: "#9333ea",
    }).setOrigin(0, 0.5);

    CASE_COLORS.forEach((col, i) => {
      const bx = startX + i * 26;
      const circle = this.add.graphics();
      circle.fillStyle(col, 1);
      circle.fillCircle(0, 0, 11);
      circle.lineStyle(2, 0xd1d5db, 1);
      circle.strokeCircle(0, 0, 11);

      const hit = this.add.circle(0, 0, 14, 0xffffff, 0).setInteractive({ useHandCursor: true });
      const ring = this.add.graphics();
      if (i === 0) {
        ring.lineStyle(3, 0xec4899, 1);
        ring.strokeCircle(0, 0, 14);
      }

      const container = this.add.container(bx, panelY, [circle, hit, ring]);
      hit.on("pointerdown", () => this.selectColor(i));
      hit.on("pointerover", () => { if (this.colorIndex !== i) circle.setAlpha(0.8); });
      hit.on("pointerout", () => circle.setAlpha(1));
      this.colorButtons.push(container);
    });
  }

  private selectColor(index: number): void {
    this.colorIndex = index;
    this.colorButtons.forEach((btn, i) => {
      const ring = btn.getAt(2) as Phaser.GameObjects.Graphics;
      ring.clear();
      if (i === index) {
        ring.lineStyle(3, 0xec4899, 1);
        ring.strokeCircle(0, 0, 14);
      }
    });
    this.redrawCase();
    this.tweens.add({
      targets: this.caseGraphics,
      alpha: { from: 0.5, to: 1 },
      duration: 200,
      ease: "Quad.easeOut",
    });
  }

  // ── Build pattern picker row ──────────────────────────────────────────────
  private buildPatternPanel(): void {
    const panelY = 698;
    const totalW = PATTERNS.length * 54 + 8;
    const startX = VW / 2 - totalW / 2 + 22;

    this.add.text(12, panelY - 2, "Pattern", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "11px",
      color: "#9333ea",
    }).setOrigin(0, 0.5);

    PATTERNS.forEach((pat, i) => {
      const bx = startX + i * 54;
      const bg = this.add.rectangle(0, 0, 46, 24, i === 0 ? 0xec4899 : 0xe2e8f0, 1)
        .setStrokeStyle(1.5, i === 0 ? 0xbe185d : 0xd1d5db);
      const label = this.add.text(0, 0, PATTERN_LABELS[pat], {
        fontFamily: "Manrope, sans-serif",
        fontSize: "10px",
        color: i === 0 ? "#ffffff" : "#6b7280",
      }).setOrigin(0.5, 0.5);
      const hit = this.add.rectangle(0, 0, 46, 24, 0xffffff, 0).setInteractive({ useHandCursor: true });
      const container = this.add.container(bx, panelY, [bg, label, hit]);
      hit.on("pointerdown", () => this.selectPattern(i));
      this.patternButtons.push(container);
    });
  }

  private selectPattern(index: number): void {
    this.patternIndex = index;
    this.patternButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
      const lbl = btn.getAt(1) as Phaser.GameObjects.Text;
      if (i === index) {
        bg.setFillStyle(0xec4899).setStrokeStyle(1.5, 0xbe185d);
        lbl.setColor("#ffffff");
      } else {
        bg.setFillStyle(0xe2e8f0).setStrokeStyle(1.5, 0xd1d5db);
        lbl.setColor("#6b7280");
      }
    });
    this.redrawCase();
  }

  // ── Build sticker tray ────────────────────────────────────────────────────
  private buildStickerPanel(): void {
    const trayY = 618;
    const cols = 6;
    const cellSize = 48;
    const totalW = cols * cellSize;
    const startX = VW / 2 - totalW / 2 + cellSize / 2;

    // Tray background
    const trayBg = this.add.graphics();
    trayBg.fillStyle(0xffffff, 0.7);
    trayBg.fillRoundedRect(VW / 2 - totalW / 2 - 8, trayY - 30, totalW + 16, 60, 14);
    trayBg.lineStyle(1.5, 0xfce7f3, 1);
    trayBg.strokeRoundedRect(VW / 2 - totalW / 2 - 8, trayY - 30, totalW + 16, 60, 14);

    this.add.text(VW / 2 - totalW / 2 - 4, trayY - 42, "Stickers — tap one, then tap the case!", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "11px",
      color: "#9333ea",
    }).setOrigin(0, 0.5);

    STICKERS.forEach((sticker, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const bx = startX + col * cellSize;
      const by = trayY - 6 + row * cellSize;

      const bg = this.add.rectangle(0, 0, 40, 40, 0xfdf4ff, 1)
        .setStrokeStyle(1.5, 0xe9d5ff);
      const emoji = this.add.text(0, 0, sticker.emoji, { fontSize: "22px" }).setOrigin(0.5, 0.5);
      const hit = this.add.rectangle(0, 0, 44, 44, 0xffffff, 0).setInteractive({ useHandCursor: true });

      const container = this.add.container(bx, by, [bg, emoji, hit]);
      hit.on("pointerdown", () => this.selectSticker(i));
      hit.on("pointerover", () => { bg.setFillStyle(0xf3e8ff); });
      hit.on("pointerout", () => { if (this.selectedSticker !== sticker) bg.setFillStyle(0xfdf4ff); });
      this.stickerButtons.push(container);
    });
  }

  private selectSticker(index: number): void {
    const sticker = STICKERS[index];
    if (!sticker) return;

    this.selectedSticker = sticker;
    this.stickerButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
      if (i === index) {
        bg.setFillStyle(0xfce7f3).setStrokeStyle(2.5, 0xec4899);
      } else {
        bg.setFillStyle(0xfdf4ff).setStrokeStyle(1.5, 0xe9d5ff);
      }
    });

    this.selectedHighlight.setVisible(true);
    this.selectedLabel.setText(`${sticker.emoji} selected — tap the case!`).setVisible(true);
  }

  // ── Handle tap on the case ────────────────────────────────────────────────
  private onCaseTap(worldX: number, worldY: number): void {
    if (this.done) return;
    if (!this.selectedSticker) {
      // Bounce hint
      this.tweens.add({
        targets: this.selectedHighlight,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        duration: 120,
        yoyo: true,
      });
      return;
    }

    // Check within case bounds
    const cx = this.caseX - this.caseW / 2;
    const cy = this.caseY - this.caseH / 2;
    if (
      worldX < cx + 10 || worldX > cx + this.caseW - 10 ||
      worldY < cy + 10 || worldY > cy + this.caseH - 10
    ) return;

    // Place sticker emoji on case
    const emoji = this.selectedSticker.emoji;
    const stickerText = this.add.text(worldX, worldY, emoji, {
      fontSize: "28px",
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Pop-in animation
    stickerText.setScale(0);
    this.tweens.add({
      targets: stickerText,
      scale: { from: 0, to: 1 },
      duration: 250,
      ease: "Back.easeOut",
    });

    this.placedStickers.push({ x: worldX, y: worldY, emoji, obj: stickerText });

    // Score per sticker
    const pts = 10;
    this.score += pts;
    this.onScore(this.score);
    this.updateStickerCount();

    // Floating score pop
    const pop = this.add.text(worldX, worldY - 20, `+${pts}`, {
      fontFamily: "Manrope, sans-serif",
      fontSize: "16px",
      color: "#ec4899",
      stroke: "#ffffff",
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(20);
    this.tweens.add({
      targets: pop,
      y: worldY - 60,
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: "Quad.easeOut",
      onComplete: () => pop.destroy(),
    });

    // Deselect sticker after placing
    this.selectedSticker = null;
    this.stickerButtons.forEach((btn) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0xfdf4ff).setStrokeStyle(1.5, 0xe9d5ff);
    });
    this.selectedHighlight.setVisible(false);
    this.selectedLabel.setVisible(false);
  }

  private updateStickerCount(): void {
    const n = this.placedStickers.length;
    if (n === 0) {
      this.stickerCountText.setText("");
    } else if (n < 3) {
      this.stickerCountText.setText(`${n} sticker${n > 1 ? "s" : ""} placed — keep going!`);
    } else if (n < 6) {
      this.stickerCountText.setText(`${n} stickers — looking great! 🌟`);
    } else {
      this.stickerCountText.setText(`${n} stickers — amazing design! ✨`);
    }
  }

  // ── Action buttons (Done + Clear) ─────────────────────────────────────────
  private buildActionButtons(): void {
    // Done button
    const doneBg = this.add.rectangle(0, 0, 100, 36, 0xec4899, 1).setStrokeStyle(2, 0xbe185d);
    const doneLbl = this.add.text(0, 0, "✅ Done!", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "15px",
      color: "#ffffff",
    }).setOrigin(0.5, 0.5);
    const doneHit = this.add.rectangle(0, 0, 100, 36, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.doneButton = this.add.container(VW / 2 + 60, 90, [doneBg, doneLbl, doneHit]);
    doneHit.on("pointerdown", () => this.finishDesign());
    doneHit.on("pointerover", () => doneBg.setFillStyle(0xdb2777));
    doneHit.on("pointerout", () => doneBg.setFillStyle(0xec4899));

    // Clear button
    const clearBg = this.add.rectangle(0, 0, 90, 36, 0xf1f5f9, 1).setStrokeStyle(2, 0xd1d5db);
    const clearLbl = this.add.text(0, 0, "🗑 Clear", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "15px",
      color: "#64748b",
    }).setOrigin(0.5, 0.5);
    const clearHit = this.add.rectangle(0, 0, 90, 36, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.clearButton = this.add.container(VW / 2 - 55, 90, [clearBg, clearLbl, clearHit]);
    clearHit.on("pointerdown", () => this.clearStickers());
    clearHit.on("pointerover", () => clearBg.setFillStyle(0xe2e8f0));
    clearHit.on("pointerout", () => clearBg.setFillStyle(0xf1f5f9));
  }

  private clearStickers(): void {
    this.placedStickers.forEach((s) => s.obj.destroy());
    this.placedStickers = [];
    this.score = Math.max(0, this.score - 50);
    this.onScore(this.score);
    this.updateStickerCount();

    // Clear flash
    const flash = this.add.rectangle(this.caseX, this.caseY, this.caseW, this.caseH, 0xffffff, 0.5);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  // ── Finish the design ─────────────────────────────────────────────────────
  private finishDesign(): void {
    if (this.done) return;
    this.done = true;

    // Bonus scoring
    const colorBonus = 20;
    const patternBonus = this.patternIndex > 0 ? 30 : 0;
    const stickerBonus = Math.min(this.placedStickers.length * 10, 100);
    const varietyBonus = this.placedStickers.length >= 5 ? 50 : 0;
    const totalBonus = colorBonus + patternBonus + stickerBonus + varietyBonus;
    this.score += totalBonus;
    this.onScore(this.score);

    // Save high score
    const stored = localStorage.getItem("phonecasediy_highscore");
    const prev = stored ? parseInt(stored, 10) || 0 : 0;
    if (this.score > prev) {
      localStorage.setItem("phonecasediy_highscore", String(this.score));
    }

    // Celebration overlay
    this.time.delayedCall(100, () => this.showCelebration(totalBonus));
  }

  private showCelebration(bonus: number): void {
    // Dim overlay
    const overlay = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.5).setDepth(50);
    this.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.5 }, duration: 300 });

    // Card
    const card = this.add.graphics().setDepth(51);
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(VW / 2 - 160, VH / 2 - 160, 320, 320, 24);
    card.lineStyle(3, 0xec4899, 1);
    card.strokeRoundedRect(VW / 2 - 160, VH / 2 - 160, 320, 320, 24);
    this.tweens.add({ targets: card, alpha: { from: 0, to: 1 }, duration: 300 });

    const texts: Phaser.GameObjects.Text[] = [];

    texts.push(this.add.text(VW / 2, VH / 2 - 130, "🎉 Amazing Design! 🎉", {
      fontFamily: "Fraunces, serif",
      fontSize: "22px",
      color: "#be185d",
    }).setOrigin(0.5, 0).setDepth(52));

    texts.push(this.add.text(VW / 2, VH / 2 - 88, `Score: ${this.score}`, {
      fontFamily: "Fraunces, serif",
      fontSize: "36px",
      color: "#7c3aed",
    }).setOrigin(0.5, 0).setDepth(52));

    const stored = localStorage.getItem("phonecasediy_highscore");
    const best = stored ? parseInt(stored, 10) || 0 : 0;
    texts.push(this.add.text(VW / 2, VH / 2 - 42, `Best: ${best}`, {
      fontFamily: "Manrope, sans-serif",
      fontSize: "16px",
      color: "#9333ea",
    }).setOrigin(0.5, 0).setDepth(52));

    texts.push(this.add.text(VW / 2, VH / 2 - 10, `+${bonus} design bonus!`, {
      fontFamily: "Manrope, sans-serif",
      fontSize: "14px",
      color: "#ec4899",
    }).setOrigin(0.5, 0).setDepth(52));

    texts.push(this.add.text(VW / 2, VH / 2 + 20, `${this.placedStickers.length} sticker${this.placedStickers.length !== 1 ? "s" : ""} placed`, {
      fontFamily: "Manrope, sans-serif",
      fontSize: "14px",
      color: "#6b7280",
    }).setOrigin(0.5, 0).setDepth(52));

    // Confetti burst
    for (let i = 0; i < 40; i++) {
      this.time.delayedCall(i * 30, () => this.spawnConfetti());
    }

    // Play Again button
    const playBg = this.add.rectangle(VW / 2, VH / 2 + 100, 180, 48, 0xec4899, 1)
      .setStrokeStyle(2, 0xbe185d).setDepth(52).setInteractive({ useHandCursor: true });
    const playLbl = this.add.text(VW / 2, VH / 2 + 100, "🎨 Design Again!", {
      fontFamily: "Manrope, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
    }).setOrigin(0.5, 0.5).setDepth(53);

    playBg.on("pointerdown", () => this.scene.restart());
    playBg.on("pointerover", () => playBg.setFillStyle(0xdb2777));
    playBg.on("pointerout", () => playBg.setFillStyle(0xec4899));

    // Bounce animation on card
    const allObjs = [card, playBg, playLbl, ...texts];
    allObjs.forEach((obj) => {
      obj.setScale(0.8);
      this.tweens.add({
        targets: obj,
        scale: 1,
        duration: 400,
        ease: "Back.easeOut",
        delay: 150,
      });
    });
  }

  private spawnConfetti(): void {
    const x = Phaser.Math.Between(40, VW - 40);
    const y = Phaser.Math.Between(VH / 2 - 180, VH / 2 + 180);
    const colors = [0xec4899, 0xfacc15, 0x3b82f6, 0x10b981, 0xf472b6, 0xa855f7];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)] ?? 0xec4899;
    const size = Phaser.Math.Between(4, 10);
    const gfx = this.add.graphics().setDepth(60);
    gfx.fillStyle(color, 1);
    if (Phaser.Math.Between(0, 1)) {
      gfx.fillRect(x, y, size, size / 2);
    } else {
      gfx.fillCircle(x, y, size / 2);
    }
    this.tweens.add({
      targets: gfx,
      y: y + Phaser.Math.Between(40, 120),
      x: x + Phaser.Math.Between(-30, 30),
      alpha: { from: 1, to: 0 },
      angle: Phaser.Math.Between(-180, 180),
      duration: Phaser.Math.Between(600, 1200),
      ease: "Quad.easeIn",
      onComplete: () => gfx.destroy(),
    });
  }

  update(): void {
    // Phaser handles all input via events — nothing needed in the loop
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export function startGame(parent: HTMLElement, onScore: (n: number) => void): () => void {
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
    scene: new PhoneCaseScene(onScore),
    banner: false,
  });

  return () => game.destroy(true);
}
