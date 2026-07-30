// Backgrounds de página/seção — atmosféricos, near-black, text-safe.
// Clima audio-interface: glow frio, grain, campo de waveform, retrato fantasma, brasa vermelha.
const path = require('path');
const fs = require('fs');
const { sharp, BG, RED, INK, bottomScrim, topGradient, vignette, glow, grain, waveformSVG, darkGrade } = require('./lib');

const SRC = 'D:/ProjetosIA/mess/imagens/';
const OUT = 'D:/ProjetosIA/mess/rogerio-mess-dj/assets/backgrounds';
fs.mkdirSync(OUT, { recursive: true });
const full = f => SRC + 'WhatsApp Image 2026-07-24 at ' + f;
const flat = (w, h, c) => sharp({ create: { width: w, height: h, channels: 4, background: c } });

async function base() {
  const W = 2560, H = 1440;
  await flat(W, H, { ...BG, alpha: 1 }).composite([
    { input: await glow(W, H, { r: 42, g: 47, b: 56 }, 0.5, 0.18, 1.1, 0.5).png().toBuffer(), blend: 'screen' }, // luz fria alta
    { input: await glow(W, H, { r: 24, g: 26, b: 32 }, 0.5, 0.9, 1.0, 0.6).png().toBuffer(), blend: 'screen' },
    { input: await vignette(W, H, 0.6, 0.25).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 20).png().toBuffer(), blend: 'soft-light' },
  ]).webp({ quality: 78 }).toFile(path.join(OUT, 'bg-base.webp'));
  console.log('bg-base');
}

async function ember() {
  const W = 2560, H = 1440;
  await flat(W, H, { ...BG, alpha: 1 }).composite([
    { input: await glow(W, H, RED, 0.82, 0.95, 0.7, 0.42).png().toBuffer(), blend: 'screen' },      // brasa canto inf-dir
    { input: await glow(W, H, { r: 120, g: 20, b: 24 }, 0.82, 0.95, 0.35, 0.5).png().toBuffer(), blend: 'screen' },
    { input: await glow(W, H, { r: 40, g: 44, b: 52 }, 0.15, 0.1, 0.8, 0.35).png().toBuffer(), blend: 'screen' },
    { input: await vignette(W, H, 0.6, 0.28).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 20).png().toBuffer(), blend: 'soft-light' },
  ]).webp({ quality: 78 }).toFile(path.join(OUT, 'bg-ember.webp'));
  console.log('bg-ember');
}

// campo de waveform dim (divisor de seção / footer)
async function waveField() {
  const W = 2560, H = 640;
  // 3 fileiras sobrepostas com fases diferentes p/ dar profundidade
  const rows = [
    waveformSVG(W, 360, { bars: 220, gap: 4, progress: 0 }),
    waveformSVG(W, 240, { bars: 160, gap: 6, progress: 0 }),
  ];
  const canvas = flat(W, H, { ...BG, alpha: 1 });
  const layers = [];
  for (let i = 0; i < rows.length; i++) {
    // recolore p/ dim: renderiza svg, baixa opacidade via multiply do BG
    const band = await sharp(Buffer.from(rows[i])).png().toBuffer();
    layers.push({ input: band, gravity: 'center', blend: 'screen' });
  }
  layers.push({ input: await flat(W, H, { ...BG, alpha: 0.72 }).png().toBuffer(), blend: 'over' }); // esmaece geral
  layers.push({ input: await vignette(W, H, 0.7, 0.15).png().toBuffer(), blend: 'over' });
  layers.push({ input: await grain(W, H, 16).png().toBuffer(), blend: 'soft-light' });
  await canvas.composite(layers).webp({ quality: 80 }).toFile(path.join(OUT, 'bg-waveform.webp'));
  console.log('bg-waveform');
}

// retrato fantasma: sujeito quase apagado no near-black, p/ fundo de seção com texto
async function ghost(file, side, outName) {
  const W = 2560, H = 1440;
  const subj = await darkGrade(sharp(full(file))).modulate({ brightness: 0.8 })
    .resize({ height: Math.round(H * 1.15) }).toBuffer();
  const sm = await sharp(subj).metadata();
  const top = Math.round((sm.height - H) * 0.28);
  const crop = await sharp(subj).extract({ left: 0, top: Math.max(0, Math.min(top, sm.height - H)), width: sm.width, height: H }).toBuffer();
  const left = side === 'right' ? W - sm.width - Math.round(W * 0.04) : Math.round(W * 0.04);
  const glowX = side === 'right' ? 0.78 : 0.22;
  await flat(W, H, { ...BG, alpha: 1 }).composite([
    { input: await glow(W, H, { r: 40, g: 44, b: 52 }, glowX, 0.3, 0.9, 0.4).png().toBuffer(), blend: 'screen' },
    { input: crop, left, top: 0, blend: 'screen' },                       // screen: só as luzes do sujeito emergem
    { input: await flat(W, H, { ...BG, alpha: 0.62 }).png().toBuffer(), blend: 'over' }, // veu escuro -> texto-safe
    { input: await vignette(W, H, 0.6, 0.22).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 18).png().toBuffer(), blend: 'soft-light' },
  ]).webp({ quality: 80 }).toFile(path.join(OUT, outName));
  console.log(outName);
}

// ghost vertical (mobile 9:16): sujeito emerge via screen, metade livre p/ texto.
// textSide: 'bottom' (sujeito em cima) | 'top' (sujeito embaixo)
async function ghostVertical(file, textSide, outName) {
  const W = 1080, H = 1920;
  // posição vertical do rosto no crop: sujeito em cima -> foca terço superior
  const focus = textSide === 'bottom' ? 0.14 : 0.42;
  const subj = await darkGrade(sharp(full(file))).modulate({ brightness: 0.82 })
    .resize({ width: W }).toBuffer();
  const sm = await sharp(subj).metadata();
  let top = Math.round((sm.height - H) * focus);
  let crop;
  if (sm.height >= H) {
    crop = await sharp(subj).extract({ left: 0, top: Math.max(0, Math.min(top, sm.height - H)), width: W, height: H }).toBuffer();
  } else {
    // foto mais baixa que 1920: encaixa numa tela preta, ancorando ao lado do sujeito
    const g = textSide === 'bottom' ? 'north' : 'south';
    crop = await sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } } })
      .composite([{ input: subj, gravity: g }]).png().toBuffer();
  }
  // scrim direcional na metade do texto
  const textScrim = textSide === 'bottom'
    ? await bottomScrim(W, H, 0.44, 0.99).png().toBuffer()
    : await topGradient(W, H, 0.99, 0.62).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } } }).composite([
    { input: await glow(W, H, { r: 40, g: 44, b: 52 }, 0.5, textSide === 'bottom' ? 0.24 : 0.72, 0.9, 0.4).png().toBuffer(), blend: 'screen' },
    { input: crop, left: 0, top: 0, blend: 'screen' },
    { input: await sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 0.5 } } }).png().toBuffer(), blend: 'over' },
    { input: textScrim, blend: 'over' },
    { input: await vignette(W, H, 0.6, 0.22).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 18).png().toBuffer(), blend: 'soft-light' },
  ]).webp({ quality: 80 }).toFile(path.join(OUT, outName));
  console.log(outName);
}

// tile de grain seamless (CSS repeat, overlay global)
async function noiseTile() {
  const S = 256;
  await grain(S, S, 60).png().toFile(path.join(OUT, 'bg-noise.png'));
  console.log('bg-noise (tile 256)');
}

(async () => {
  await base();
  await ember();
  await waveField();
  await ghost('13.23.42 (2).jpeg', 'right', 'bg-ghost-couro-fone.webp');
  await ghost('13.23.42 (3).jpeg', 'left', 'bg-ghost-couro-terco.webp');
  await ghostVertical('13.23.42 (2).jpeg', 'bottom', 'bg-ghost-couro-fone-mobile.webp');
  await ghostVertical('13.23.42 (3).jpeg', 'top', 'bg-ghost-couro-terco-mobile.webp');
  await noiseTile();
  const manifest = fs.readdirSync(OUT).filter(f => /\.(webp|png)$/.test(f)).map(f => 'backgrounds/' + f);
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('BACKGROUNDS OK ->', manifest.length);
})();
