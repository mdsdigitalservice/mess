// Fundos de card unificados para o site inteiro.
// Cada foto -> 3:4 (card de set/galeria) + 1:1 (grid). Grade dark coesa,
// scrim inferior p/ texto, grain, vinheta. + variantes criativas (duotone, gallery limpa).
const path = require('path');
const fs = require('fs');
const { sharp, BG, RED, INK, hGradient, bottomScrim, topGradient, vignette, glow, grain, darkGrade } = require('./lib');

const SRC = 'D:/ProjetosIA/mess/imagens/';
const OUT = 'D:/ProjetosIA/mess/rogerio-mess-dj/assets/cards';
fs.mkdirSync(OUT, { recursive: true });

const PHOTOS = [
  { slug: 'couro-fone', file: '13.23.42 (2).jpeg', role: 'hero,card,gallery,wide', side: 'right', wideRed: true },
  { slug: 'couro-terco', file: '13.23.42 (3).jpeg', role: 'card,gallery,duo,wide', side: 'left' },
  { slug: 'colete', file: '13.23.42 (1).jpeg', role: 'card,gallery,wide', side: 'right' },
  { slug: 'corpo-inteiro', file: '13.23.43.jpeg', role: 'card,gallery,wide', crush: 0.5, side: 'left' },
  { slug: 'evento-01', file: '13.23.42 (4).jpeg', role: 'square' },
  { slug: 'evento-02', file: '13.23.42 (5).jpeg', role: 'square' },
];

const full = f => SRC + 'WhatsApp Image 2026-07-24 at ' + f;

// grade + crop + tratamento de card (scrim p/ texto)
async function cardVariant(file, W, H, gravity, outPath, { scrim = 0.9, topScrim = 0.28, crush = 0 } = {}) {
  let g = darkGrade(sharp(full(file)));
  if (crush) g = g.modulate({ brightness: 1 - crush });   // afunda fundos claros (ex: estúdio branco)
  const graded = await g.toBuffer();
  const base = await sharp(graded)
    .resize({ width: W, height: H, fit: 'cover', position: gravity })
    .toBuffer();

  const layers = [
    { input: await topGradient(W, H, topScrim, 0.5).png().toBuffer(), blend: 'over' }, // gradiente, sem emenda
    { input: await bottomScrim(W, H, 0.42, scrim).png().toBuffer(), blend: 'over' },
    { input: await vignette(W, H, 0.45, 0.35).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 22).png().toBuffer(), blend: 'soft-light' },
  ];
  await sharp(base).composite(layers).webp({ quality: 80 }).toFile(outPath);
}

// gallery limpa: grade dark, scrim minimo, sujeito bem vis\u00edvel
async function galleryVariant(file, W, H, gravity, outPath, { crush = 0 } = {}) {
  let g = darkGrade(sharp(full(file)));
  if (crush) g = g.linear(1 - crush, 0);          // afunda est\u00fadio branco p/ silhueta moody
  const graded = await g.toBuffer();
  const base = await sharp(graded).resize({ width: W, height: H, fit: 'cover', position: gravity }).toBuffer();
  await sharp(base).composite([
    { input: await bottomScrim(W, H, 0.62, 0.7).png().toBuffer(), blend: 'over' },
    { input: await vignette(W, H, crush ? 0.5 : 0.35, crush ? 0.28 : 0.4).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 18).png().toBuffer(), blend: 'soft-light' },
  ]).webp({ quality: 82 }).toFile(outPath);
}

// wide 16:9: sujeito retrato ancorado num lado de uma tela dark, com feather
// no lado interno (some no preto) -> sobra zona de texto do outro lado.
// side: 'right' (texto à esq) | 'left' (texto à dir). Alterna p/ variedade.
async function wideVariant(file, W, H, side, outPath, { crush = 0, red = false } = {}) {
  let g = darkGrade(sharp(full(file)));
  if (crush) g = g.linear(1 - crush, 0);
  const subjH = Math.round(H * 1.06);
  const subj = await g.resize({ height: subjH }).toBuffer();
  const sm = await sharp(subj).metadata();
  const top = Math.round((sm.height - H) * 0.30);        // foco terço superior (rosto)
  const subjCrop = await sharp(subj)
    .extract({ left: 0, top: Math.max(0, Math.min(top, sm.height - H)), width: sm.width, height: H })
    .toBuffer();

  // feather do lado interno
  let mask = hGradient(sm.width, H, 0.42, 0.55);         // 0(esq)->255(dir): pronto p/ 'right'
  if (side === 'left') mask = mask.flop();               // espelha p/ 'left'
  const maskBuf = await mask.raw().toBuffer();
  const subjMasked = await sharp(subjCrop).removeAlpha()
    .joinChannel(maskBuf, { raw: { width: sm.width, height: H, channels: 1 } })
    .png().toBuffer();

  const left = side === 'right'
    ? W - sm.width + Math.round(sm.width * 0.02)
    : Math.round(-sm.width * 0.02);

  const glowX = side === 'right' ? 0.80 : 0.20;
  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: { ...BG, alpha: 1 } } });
  await canvas.composite([
    { input: await glow(W, H, { r: 38, g: 42, b: 50 }, glowX, 0.32, 0.85, 0.45).png().toBuffer(), blend: 'screen' },
    { input: subjMasked, left, top: 0 },
    { input: await bottomScrim(W, H, 0.46, 0.9).png().toBuffer(), blend: 'over' },
    { input: await topGradient(W, H, 0.22, 0.5).png().toBuffer(), blend: 'over' },
    ...(red ? [{ input: await glow(W, H, RED, glowX, 0.88, 0.5, 0.26).png().toBuffer(), blend: 'screen' }] : []),
    { input: await vignette(W, H, 0.45, 0.34).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 22).png().toBuffer(), blend: 'soft-light' },
  ]).png().toBuffer()
    .then(b => sharp(b).webp({ quality: 80 }).toFile(outPath));
}

// duotone vermelho: assinatura criativa (shadows -> BG, highlights -> vermelho)
async function duotoneVariant(file, W, H, gravity, outPath) {
  const gray = await sharp(full(file)).grayscale().linear(1.2, -18).resize({ width: W, height: H, fit: 'cover', position: gravity }).toBuffer();
  // mapeia luminancia: escuro=BG, claro=vermelho. Usa tint sobre grayscale + multiply do BG.
  const toned = await sharp(gray)
    .tint({ r: 255, g: 60, b: 66 })                 // empurra highlights p/ vermelho
    .modulate({ brightness: 0.9 })
    .toBuffer();
  await sharp(toned).composite([
    // piso escuro: multiplica um leve BG p/ afundar as sombras no dark do site
    { input: await sharp({ create: { width: W, height: H, channels: 4, background: { r: 60, g: 12, b: 14, alpha: 1 } } }).png().toBuffer(), blend: 'multiply' },
    { input: await vignette(W, H, 0.5, 0.3).png().toBuffer(), blend: 'over' },
    { input: await grain(W, H, 20).png().toBuffer(), blend: 'soft-light' },
  ]).webp({ quality: 82 }).toFile(outPath);
}

(async () => {
  const manifest = [];
  for (const p of PHOTOS) {
    const roles = p.role.split(',');
    const opt = { crush: p.crush || 0 };
    if (roles.includes('card') || roles.includes('square')) {
      const sq = path.join(OUT, `${p.slug}-1x1.webp`);
      await cardVariant(p.file, 1000, 1000, 'north', sq, opt);
      manifest.push(`cards/${p.slug}-1x1.webp`);
    }
    if (roles.includes('card')) {
      const pr = path.join(OUT, `${p.slug}-3x4.webp`);
      await cardVariant(p.file, 900, 1200, 'north', pr, opt);
      manifest.push(`cards/${p.slug}-3x4.webp`);
    }
    if (roles.includes('gallery')) {
      const g = path.join(OUT, `${p.slug}-gallery.webp`);
      await galleryVariant(p.file, 900, 1200, 'north', g, opt);
      manifest.push(`cards/${p.slug}-gallery.webp`);
    }
    if (roles.includes('wide')) {
      const wd = path.join(OUT, `${p.slug}-16x9.webp`);
      await wideVariant(p.file, 1600, 900, p.side || 'right', wd, { crush: p.crush || 0, red: !!p.wideRed });
      manifest.push(`cards/${p.slug}-16x9.webp`);
    }
    if (roles.includes('duo')) {
      const d = path.join(OUT, `${p.slug}-duo-3x4.webp`);
      await duotoneVariant(p.file, 900, 1200, 'north', d);
      manifest.push(`cards/${p.slug}-duo-3x4.webp`);
    }
    console.log('  ok', p.slug);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('CARDS OK ->', manifest.length, 'arquivos');
})();
