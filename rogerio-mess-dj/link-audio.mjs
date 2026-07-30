// ─────────────────────────────────────────────────────────────────────────
// link-audio.mjs — auto-vínculo MP3 ↔ sets.json
//
// Varre uma pasta de áudio, casa cada MP3 com o set correspondente no
// sets.json (por número de set — #129 — e por palavras-chave do título),
// lê a DURAÇÃO REAL do arquivo (parser MP3 próprio, zero dependências) e
// preenche os campos src / dur / secs de cada faixa.
//
// USO:
//   node link-audio.mjs                 # dry-run: mostra o que casaria (não grava)
//   node link-audio.mjs --apply         # grava sets.json (backup em sets.json.bak)
//   node link-audio.mjs --dir <pasta>   # pasta de MP3s (padrão: ./audio)
//   node link-audio.mjs --min 3         # score mínimo p/ aceitar um match (padrão 3)
//
// CONVENÇÃO DE PASTA (recomendada, melhora a precisão):
//   rogerio-mess-dj/audio/sertanejo-pagode/xande-samba-raiz.mp3
//   rogerio-mess-dj/audio/house/129-setlive-comercial.mp3
//   rogerio-mess-dj/audio/flashback/80-modern-talking.mp3
//   (subpasta = id/label da seção → o match fica restrito àquela seção)
//   Também funciona com todos os MP3s soltos numa pasta só.
// ─────────────────────────────────────────────────────────────────────────
import { readFile, writeFile, readdir, stat, mkdir, copyFile } from 'node:fs/promises';
import { existsSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));      // .../rogerio-mess-dj
const PROJECT_ROOT = path.resolve(HERE, '..');                 // .../mess
const SETS = path.join(HERE, 'data', 'sets.json');

// ── args ──
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const APPLY = flag('--apply');
const AUDIO_DIR = path.resolve(val('--dir', path.join(HERE, 'audio')));
const MIN_SCORE = Number(val('--min', 3));

// ── normalização / tokens ──
const norm = s => String(s).toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['set','live','mix','mixado','mixados','vol','the','ao','vivo','feat','part','com','completo','melhores','as','os','de','da','do','no','na']);
const words = s => norm(s).split(' ').filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
const nums = s => [...norm(s).matchAll(/\d+/g)].map(m => m[0]).filter(n => n.length >= 2); // números 2+ dígitos = chave forte

// peso por raridade: token que aparece em 1 só set = muito distintivo (nome de artista)
let DF = new Map();
const buildDF = data => {
  DF = new Map();
  for (const sec of data.sections) for (const t of sec.tracks)
    for (const w of new Set(words(t.title))) DF.set(w, (DF.get(w) || 0) + 1);
};
const wWeight = w => { const c = DF.get(w) || 1; return c === 1 ? 4 : c <= 3 ? 2 : 1; };

function score(file, track) {
  const fw = new Set(words(file.name)), tw = new Set(words(track.title));
  const fn = new Set(nums(file.name)), tn = nums(track.title);
  let s = 0;
  for (const n of tn) if (fn.has(n)) s += 5;              // número de set batendo pesa muito (#129)
  for (const w of tw) if (fw.has(w)) s += wWeight(w);     // palavra-chave, ponderada por raridade
  if (norm(file.name).includes(norm(track.title).slice(0, 14))) s += 2; // título quase inteiro no nome
  return s;
}

// ── duração de MP3 (Xing/Info VBR, VBRI, ou estimativa CBR) — sem libs ──
function mp3Duration(fp) {
  const size = statSync(fp).size;
  const fd = openSync(fp, 'r');
  const head = Buffer.alloc(Math.min(size, 200 * 1024));       // 200KB bastam p/ header + tag VBR
  readSync(fd, head, 0, head.length, 0);
  closeSync(fd);

  let off = 0;
  if (head.slice(0, 3).toString('latin1') === 'ID3') {         // pula tag ID3v2
    const sz = (head[6] & 0x7f) << 21 | (head[7] & 0x7f) << 14 | (head[8] & 0x7f) << 7 | (head[9] & 0x7f);
    off = 10 + sz;
  }
  while (off < head.length - 4 && !(head[off] === 0xff && (head[off + 1] & 0xe0) === 0xe0)) off++;
  if (off >= head.length - 4) return null;

  const b1 = head[off + 1], b2 = head[off + 2], b3 = head[off + 3];
  const ver = (b1 >> 3) & 3;    // 0=2.5, 2=2, 3=1
  const layer = (b1 >> 1) & 3;  // 1=Layer III
  if (layer !== 1) return null;
  const brB = (b2 >> 4) & 0xf, srB = (b2 >> 2) & 3;
  const mpeg1 = ver === 3;
  const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  const bitrate = (mpeg1 ? BR1 : BR2)[brB] * 1000;
  const sampleRate = (SR[ver] || SR[3])[srB];
  if (!bitrate || !sampleRate) return null;
  const spf = mpeg1 ? 1152 : 576;

  const chan = (b3 >> 6) & 3;   // 3 = mono
  const sideInfo = mpeg1 ? (chan === 3 ? 17 : 32) : (chan === 3 ? 9 : 17);
  const xo = off + 4 + sideInfo;
  const tag = head.slice(xo, xo + 4).toString('latin1');
  if ((tag === 'Xing' || tag === 'Info') && xo + 12 <= head.length) {
    const flags = head.readUInt32BE(xo + 4);
    if (flags & 1) return head.readUInt32BE(xo + 8) * spf / sampleRate;   // VBR: nº de frames exato
  }
  const vo = off + 4 + 32;
  if (head.slice(vo, vo + 4).toString('latin1') === 'VBRI' && vo + 18 <= head.length) {
    return head.readUInt32BE(vo + 14) * spf / sampleRate;
  }
  return (size - off) * 8 / bitrate;   // CBR: estimativa por tamanho/bitrate
}

const fmt = s => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60;
  const p = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sc)}` : `${m}:${p(sc)}`;
};

// ── varre a pasta de áudio (recursivo) ──
async function walk(dir, base = dir) {
  const out = [];
  let ents;
  try { ents = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of ents) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(fp, base));
    else if (/\.mp3$/i.test(e.name)) {
      const rel = path.relative(base, fp);
      const seg = rel.split(path.sep);
      out.push({
        abs: fp,
        name: path.basename(e.name, path.extname(e.name)),
        section: seg.length > 1 ? norm(seg[0]) : null,   // subpasta = dica de seção
      });
    }
  }
  return out;
}

// ── main ──
const data = JSON.parse(await readFile(SETS, 'utf8'));
buildDF(data);

if (!existsSync(AUDIO_DIR)) {
  await mkdir(AUDIO_DIR, { recursive: true });
  console.log(`\n📁 Pasta de áudio criada (estava vazia): ${AUDIO_DIR}`);
  console.log('   Solte os MP3s aí (de preferência em subpastas sertanejo-pagode / house / flashback) e rode de novo.\n');
  process.exit(0);
}

const files = await walk(AUDIO_DIR);
if (!files.length) {
  console.log(`\n⚠ Nenhum .mp3 encontrado em ${AUDIO_DIR}\n`);
  process.exit(0);
}

// mapeia dica-de-seção da subpasta -> índice de seção
const secKey = data.sections.map(s => [norm(s.id), norm(s.label), norm(s.short)]);
const sectionOf = hint => hint == null ? null
  : secKey.findIndex(keys => keys.some(k => k && (k === hint || k.includes(hint) || hint.includes(k))));

// gera candidatos (file, track, score), respeitando dica de seção quando houver
const cand = [];
files.forEach((f, fi) => {
  const secHint = sectionOf(f.section);
  data.sections.forEach((sec, si) => {
    if (secHint >= 0 && secHint !== si) return;
    sec.tracks.forEach((t, ti) => {
      const sc = score(f, t);
      if (sc >= MIN_SCORE) cand.push({ fi, si, ti, sc });
    });
  });
});

// atribuição gulosa 1-para-1 (maior score primeiro)
cand.sort((a, b) => b.sc - a.sc);
const fileUsed = new Set(), trackUsed = new Set();
const matches = [];
for (const c of cand) {
  const tkey = c.si + ':' + c.ti;
  if (fileUsed.has(c.fi) || trackUsed.has(tkey)) continue;
  fileUsed.add(c.fi); trackUsed.add(tkey);
  matches.push(c);
}

// aplica + relatório
let applied = 0;
const rows = [];
for (const m of matches) {
  const f = files[m.fi], t = data.sections[m.si].tracks[m.ti];
  const dur = mp3Duration(f.abs);
  const src = path.relative(PROJECT_ROOT, f.abs).split(path.sep).join('/');
  rows.push({ set: t.title.slice(0, 42), file: path.basename(f.abs), dur: dur ? fmt(dur) : '??', sc: m.sc });
  if (APPLY) {
    t.src = src;
    if (dur) { t.dur = fmt(dur); t.secs = Math.round(dur); }
    applied++;
  }
}

console.log(`\n🔗 ${matches.length} match(es)  ·  ${files.length} MP3(s)  ·  score mínimo ${MIN_SCORE}\n`);
for (const r of rows) console.log(`  [${String(r.sc).padStart(2)}] ${r.dur.padStart(8)}  ${r.set.padEnd(44)} ← ${r.file}`);

const unmatchedFiles = files.filter((_, i) => !fileUsed.has(i));
if (unmatchedFiles.length) {
  console.log(`\n❔ ${unmatchedFiles.length} MP3(s) sem match (renomeie incluindo o nº do set ou palavras do título):`);
  for (const f of unmatchedFiles) console.log('   · ' + path.basename(f.abs));
}
const totalTracks = data.sections.reduce((a, s) => a + s.tracks.length, 0);
console.log(`\n📀 Cobertura: ${matches.length}/${totalTracks} sets com áudio vinculado.`);

if (APPLY) {
  await copyFile(SETS, SETS + '.bak');
  await writeFile(SETS, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✅ sets.json atualizado (${applied} faixas). Backup: sets.json.bak\n`);
} else {
  console.log('\nℹ Dry-run (nada gravado). Rode com --apply para escrever o sets.json.\n');
}
