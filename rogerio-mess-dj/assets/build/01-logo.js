// Logo flutuante: remove o fundo preto do wordmark, gera PNG transparente.
// Fonte: 13.23.41.jpeg (branco + vermelho sobre preto sólido).
const sharp = require('sharp');
const path = require('path');

const SRC = path.resolve('D:/ProjetosIA/mess/imagens/WhatsApp Image 2026-07-24 at 13.23.41.jpeg');
const OUT = path.resolve('D:/ProjetosIA/mess/rogerio-mess-dj/assets');

(async () => {
  const img = sharp(SRC);
  const meta = await img.metadata();
  console.log('logo src', meta.width, meta.height);

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // luminância → alpha. preto (fundo) vira transparente; branco/vermelho ficam opacos.
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // realça a red-glyph (que tem lum baixa) usando max de canal p/ não sumir o vermelho
    const chroma = Math.max(r, g, b);
    let signal = Math.max(lum, chroma * 0.92);
    // normaliza acima do piso de ruído do jpeg
    let a = Math.max(0, (signal - 16) / (255 - 16));
    // knee: qualquer coisa claramente parte da glifa vira 100% opaco; só a borda anti-aliasa
    a = a <= 0 ? 0 : a >= 0.5 ? 1 : (a / 0.5); // rampa 0..0.5 -> 0..1, satura acima
    const alpha = Math.round(Math.min(1, a) * 255);
    // limpa cor: força branco puro onde não é vermelho, p/ traço nítido no dark
    let R = r, G = g, B = b;
    if (r > 80 && (r - g) > 38 && (r - b) > 38) {
      // pixel vermelho -> satura o vermelho da marca
      R = 227; G = 30; B = 36;
    } else if (alpha > 0) {
      R = G = B = 255; // branco puro
    }
    out[j] = R; out[j + 1] = G; out[j + 2] = B; out[j + 3] = alpha;
  }

  const base = sharp(out, { raw: { width, height, channels: 4 } });

  // trim das bordas transparentes p/ o wordmark ficar justo (bom p/ flutuar)
  const trimmed = await base.png().trim({ threshold: 10 }).toBuffer();
  const tmeta = await sharp(trimmed).metadata();
  console.log('logo trimmed', tmeta.width, tmeta.height);

  // versão full-res transparente
  await sharp(trimmed).png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'logo-mess.png'));

  // versão @2x normalizada em largura p/ nav/hero (max 1200w)
  await sharp(trimmed).resize({ width: 1200, withoutEnlargement: true })
    .png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo-mess-1200.png'));

  // versão só-branca (para fundos onde o vermelho compete): desatura mantendo alpha
  const white = await sharp(trimmed).ensureAlpha()
    .modulate({ saturation: 0 }).linear(1.05, 5).png().toBuffer();
  await sharp(white).resize({ width: 1200, withoutEnlargement: true })
    .png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo-mess-white.png'));

  console.log('OK -> logo-mess.png / logo-mess-1200.png / logo-mess-white.png');
})();
