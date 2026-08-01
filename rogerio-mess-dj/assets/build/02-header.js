// Header hero: foto real dram\u00e1tica -> tela wide dark, fade \u00e0 esquerda,
// scrim inferior, vinheta, glow vermelho, grain e linha de waveform.
// SEM logo embutida (a logo flutua por cima no site).
const path = require('path');
const { sharp, BG, RED, hGradient, bottomScrim, vignette, glow, grain, waveformSVG, darkGrade } = require('./lib');

const SRC = 'D:/ProjetosIA/mess/imagens/WhatsApp Image 2026-07-24 at 13.23.42 (2).jpeg';
const OUT = 'D:/ProjetosIA/mess/rogerio-mess-dj/assets';

async function buildDesktop() {
  const W = 2000, H = 1000;
  const subjectH = Math.round(H * 1.06);              // leve sangria vertical
  // sujeito: grade dark, altura da tela, ancorado \u00e0 direita
  const subj = await darkGrade(sharp(SRC))
    .resize({ height: subjectH })
    .toBuffer();
  const sm = await sharp(subj).metadata();
  const subjW = sm.width;
  // recorta verticalmente pro centro
  const subjTop = Math.round((sm.height - H) / 2);
  const subjCrop = await sharp(subj)
    .extract({ left: 0, top: Math.max(0, subjTop), width: subjW, height: H })
    .toBuffer();

  // m\u00e1scara de feather (esquerda transparente -> direita opaca)
  const mask = await hGradient(subjW, H, 0.40, 0.55).raw().toBuffer();
  const subjMasked = await sharp(subjCrop).removeAlpha().joinChannel(mask, {
    raw: { width: subjW, height: H, channels: 1 }
  }).png().toBuffer();

  const left = W - subjW + Math.round(subjW * 0.02);   // encosta \u00e0 direita

  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } } });

  const wave = Buffer.from(waveformSVG(Math.round(W * 0.34), 120, { bars: 96, progress: 0.34 }));

  await canvas.composite([
    { input: await glow(W, H, { r: 40, g: 44, b: 52 }, 0.72, 0.32, 0.9, 0.5).png().toBuffer(), blend: 'screen' }, // luz de fundo fria no sujeito
    { input: subjMasked, left, top: 0 },
    { input: await bottomScrim(W, H, 0.40, 0.98).png().toBuffer(), blend: 'over' },
    { input: await glow(W, H, RED, 0.86, 0.9, 0.5, 0.28).png().toBuffer(), blend: 'screen' },        // brasa vermelha canto
    { input: await vignette(W, H, 0.5, 0.32).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 24).png().toBuffer(), blend: 'soft-light' },
  ]).png().toBuffer()
    .then(b => Promise.all([
      sharp(b).webp({ quality: 82 }).toFile(path.join(OUT, 'hero-desktop.webp')),
      sharp(b).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, 'hero-desktop.jpg')),
    ]));
  console.log('hero-desktop', W + 'x' + H, 'subjW=' + subjW, 'left=' + left);
}

async function buildMobile() {
  const W = 1080, H = 1350;
  const subj = await darkGrade(sharp(SRC)).resize({ width: W }).toBuffer();
  const sm = await sharp(subj).metadata();
  const top = Math.round((sm.height - H) * 0.32);      // foco no rosto (terço superior)
  const subjCrop = await sharp(subj)
    .extract({ left: 0, top: Math.max(0, Math.min(top, sm.height - H)), width: W, height: Math.min(H, sm.height) })
    .toBuffer();

  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } } });
  await canvas.composite([
    { input: subjCrop, gravity: 'north' },
    { input: await bottomScrim(W, H, 0.30, 0.99).png().toBuffer(), blend: 'over' },
    { input: await glow(W, H, RED, 0.78, 0.86, 0.55, 0.26).png().toBuffer(), blend: 'screen' },
    { input: await vignette(W, H, 0.5, 0.3).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 24).png().toBuffer(), blend: 'soft-light' },
  ]).png().toBuffer()
    .then(b => Promise.all([
      sharp(b).webp({ quality: 82 }).toFile(path.join(OUT, 'hero-mobile.webp')),
      sharp(b).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, 'hero-mobile.jpg')),
    ]));
  console.log('hero-mobile', W + 'x' + H);
}

(async () => { await buildDesktop(); await buildMobile(); console.log('HERO OK'); })();
