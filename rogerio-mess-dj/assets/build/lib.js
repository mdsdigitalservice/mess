// Helpers de composição — gradientes, vinheta, grain, grade dark unificada.
const sharp = require('sharp');

const BG = { r: 11, g: 12, b: 14 };        // #0B0C0E fundo base do site
const RED = { r: 227, g: 30, b: 36 };      // #E31E24 acento da marca
const INK = { r: 236, g: 238, b: 240 };    // #ECEEF0 branco frio (highlights)

// máscara alpha horizontal: 0 (esq) -> 255 (dir), com ponto de virada e suavidade
function hGradient(w, h, edge = 0.42, soft = 0.30) {
  const buf = Buffer.alloc(w * h);
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    let a = (t - (edge - soft)) / soft;         // rampa em torno de `edge`
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    a = a * a * (3 - 2 * a);                      // smoothstep
    const v = Math.round(a * 255);
    for (let y = 0; y < h; y++) buf[y * w + x] = v;
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 1 } });
}

// gradiente vertical escuro (transparente no topo -> BG opaco embaixo)
function bottomScrim(w, h, start = 0.35, strength = 0.96) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = (y / (h - 1) - start) / (1 - start);
    let a = t < 0 ? 0 : t > 1 ? 1 : t;
    a = a * a;                                    // ease-in
    a *= strength;
    const A = Math.round(a * 255);
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4;
      buf[j] = BG.r; buf[j + 1] = BG.g; buf[j + 2] = BG.b; buf[j + 3] = A;
    }
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } });
}

// gradiente escuro no topo (fade de `strength` no topo -> 0 em `depth`)
function topGradient(w, h, strength = 0.35, depth = 0.5) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = 1 - (y / (h - 1)) / depth;          // 1 no topo -> 0 em depth
    let a = t < 0 ? 0 : t > 1 ? 1 : t;
    a = a * a;                                     // ease
    const A = Math.round(a * strength * 255);
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4;
      buf[j] = BG.r; buf[j + 1] = BG.g; buf[j + 2] = BG.b; buf[j + 3] = A;
    }
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } });
}

// vinheta radial: escurece os cantos
function vignette(w, h, strength = 0.55, inner = 0.35) {
  const buf = Buffer.alloc(w * h * 4);
  const cx = w / 2, cy = h / 2;
  const max = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / max;
      let a = (d - inner) / (1 - inner);
      a = a < 0 ? 0 : a > 1 ? 1 : a;
      a = a * a;
      const A = Math.round(a * strength * 255);
      const j = (y * w + x) * 4;
      buf[j] = 0; buf[j + 1] = 0; buf[j + 2] = 0; buf[j + 3] = A;
    }
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } });
}

// glow radial colorido (screen) posicionado por cx,cy relativos
function glow(w, h, color, cxr, cyr, radiusr, strength) {
  const buf = Buffer.alloc(w * h * 4);
  const cx = w * cxr, cy = h * cyr, R = Math.min(w, h) * radiusr;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / R;
      let a = 1 - d;
      a = a < 0 ? 0 : a > 1 ? 1 : a;
      a = a * a * a;
      const A = Math.round(a * strength * 255);
      const j = (y * w + x) * 4;
      buf[j] = color.r; buf[j + 1] = color.g; buf[j + 2] = color.b; buf[j + 3] = A;
    }
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } });
}

// grain monocromático (blend overlay/soft-light por cima)
function grain(w, h, amount = 26) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    const n = 128 + Math.round((Math.random() - 0.5) * 2 * amount);
    buf[j] = buf[j + 1] = buf[j + 2] = n;
    buf[j + 3] = 40; // opacidade do grão
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } });
}

// waveform SVG (barras) — assinatura audio-interface
function waveformSVG(w, h, opts = {}) {
  const bars = opts.bars || 120;
  const gap = opts.gap ?? 3;
  const bw = (w - (bars - 1) * gap) / bars;
  const mid = h / 2;
  let rects = '';
  for (let i = 0; i < bars; i++) {
    // envelope pseudo-musical determinístico
    const t = i / bars;
    const env = Math.abs(Math.sin(t * Math.PI * 6.0) * Math.sin(t * Math.PI * 1.3))
              * (0.35 + 0.65 * Math.sin(t * Math.PI));
    const bh = Math.max(2, env * h * 0.9);
    const x = i * (bw + gap);
    const played = i / bars < (opts.progress ?? 0.32);
    const fill = played ? '#E31E24' : '#5A5E66';
    const op = played ? 0.95 : 0.5;
    rects += `<rect x="${x.toFixed(1)}" y="${(mid - bh / 2).toFixed(1)}" width="${bw.toFixed(2)}" height="${bh.toFixed(1)}" rx="${(bw/2).toFixed(2)}" fill="${fill}" fill-opacity="${op}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
}

// grade dark unificada: B&W frio, pretos profundos, contraste sofisticado
function darkGrade(pipe) {
  return pipe
    .grayscale()
    .linear(1.18, -14)            // contraste + escurece base
    .gamma(1.08)
    .modulate({ brightness: 0.94 })
    .tint(INK);                   // sopro frio nos highlights
}

module.exports = { sharp, BG, RED, INK, hGradient, bottomScrim, topGradient, vignette, glow, grain, waveformSVG, darkGrade };
