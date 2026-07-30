// Gera data/sets.json a partir das listas reais do Rogério Mess.
// Fonte: listas enviadas pelo cliente (Sertanejo & Pagode, House, FlashBack's).
// src/dur/bpm ficam vazios até os MP3s reais chegarem — a UI trata isso.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const RAW = {
  'sertanejo-pagode': {
    label: 'Sertanejo & Pagode',
    short: 'Sertanejo',
    blurb: 'Modão, pagode e sertanejo — do raiz ao pisadinha, ao vivo e mixado.',
    items: `Xande de Pilares -Samba Raiz Completo-
#Lambadao #NovoSom #RealSom #BandaEllus 01
#Lambadao #NovoSom #RealSom #BandaEllus 02
Mixados #Sertanejos #Vol.29
Mixados #Sertanejos #Vol.25 (Pisadinha)
PANDA -AS MELHORES-
Mixados #Sertanejos #PoutPourri #ModaViola Vol.02
Mixados #Sertanejos #PoutPourri #ModaViola Vol.01
Funk SetMix Antigas Furacao 2000
Gusttavo Lima - Bruno e Marrone - Só Modão
AsPatroas #MaríliaMendonça #Maiara&Maraisa
Joatham & Elder Souza - Modao Akustico Derramado
Joathan Freitas Niver
Joathan -Rancho Lima- Akustico Live
Clayton&Romario #NoChurrasco
Gino & Geno -As Melhores Novas e Antigas
Hugo&Guilherme #NoPelo Vol.02
Hugo&Guilherme #Remake #GrandesSucessos
RogerModao #LiveSertanejo #CanellasVg
Fernando Sorocaba Ao Vivo Jaguariúna 2024
Marcio Art Ao Vivo cantando Sucessos do Pagode 90
Pagode no Quintal - Encontro de Batuqueiros
Sorriso Maroto - Completo + Amigos 2024
BokaLoka #RodadeSamba
Molejo #ProgramaResenhaMusical
Resenhado #TôTeQuerendo
Thiago Martins Quintal do TG
Quinteto Belém PA
Quinteto Florianópolis SC
ThiagoSoares #SambadaFeira`,
  },
  'house': {
    label: 'House',
    short: 'House',
    blurb: 'Do comercial ao melodic techno — a espinha dorsal dos sets de pista.',
    items: `#129 #SetLive #HouseComercial #Brasil
#128 #TechnoMelodic #MissMonique #Korolova #Monolink
#127 #TechnoMelodic #SébastienLéger #MindAgainst #SandyRivera
#126 #DeepHouse #Lounge #Salles
#125 #TechnoMelodic #Monolink #MissMonique #KamiloSanclemente
#124 #TecHouse #FlasHouse #CanalDaMusicaOficiall
#123 #HouseComercial #Dezko #PeggyGou #Lavern #VintageCulture
#122 #TecHouse #Malandro #House
#121 #FlasHouse HouseProgerssive
#120 #TecHouse #Comercial #AsTops
#119 #TechnoMelodic #HouseProgressivo
#118 #HouseProgressiv #Tecno -Boxberg-
#117 #HouseMelodic #Progressiv -Boxberg-
#116 #AfroHouse #Progressive -Boxberg-
#115 #Tecno #HouseProgerssive #B2B #BoxBerg
#114 #HouseComercial #Atuais-Novas (98min)
#113 #HouseOrganic #BoxBerg
#112 HouseMelodic #Box65 #BenBöhmer #EelkeKleijn #NoraEnPure
#111 HouseMelodic #Box65 #Artbat #Aiwaska #RufusDoSol
#110 HouseMelodic #Korolova #Anyma
#109 HouseMelodic #MissMonique #AdamSellouk
#108 #House #Melodic #Tops2022
#107 #House #Melodic #Techouse (Antigas)
#106 #House #Melodic #ShoppingEstacao #Top
#105 #House #Melodic #Tocadas
#104 #Techouse #Tocadas
#103 #House #SetLive #HouseMistura
#102 #House #SetLive #VintageCulture
#94 #HouseDeep #MundoMusic #Quarentena IV
#89 #HouseDisco #PurpleDiscoMachine #ChapadaMt
#88 #HouseComercial #ChapadaMt #Meduza #VictorLou #Vintage #Blaze
#84 #SetLive #HouseComercial #Vintage
#76 #DeepHouse #LoungeLenta
#73 #HouseComercial #Explosao`,
  },
  'flashback': {
    label: "FlashBack's",
    short: 'FlashBack',
    blurb: 'Dos anos 80 aos 2010 — pop, rock, tribal e dance que enchem a pista de nostalgia.',
    items: `#FlashBack #80 Frestylle
#FlashBack #80 Modern Talking
#FlashBack80 LentaPop
#FlashBack80 LoungeLenta
#FlashBack 85-90 Dominguinhos
#FlashBack #80 #House-Tops- (Bday-Jacare)
#FlashBack #80 #LivramentoMt
#FlashBack #80 #BomSucessoVg
#FlashBack-#80Rock #Internacional
#FlashBack #80Rock #JovemGuarda #Internacional
#FlashBack #80 #House #Lento
#FlashBack #80 (60Min.)
#FlashBack #80 (70min.)
#FlashBack #80-90 #House
#FlashBack #80-85-90
#FlashBack 90 LentaTop Dominguinhos
#FlashBack #90 #EdilsonPm #CanellasVG -01-
#FlashBack #90 #EdilsonPm #CanellasVG -02-
#FlashBack #90 #VideoLive #CasaMess
#FlashBack #90 #NiverMacacoVG
#FlashBack #90
#FlashBack #90 #Tribal (Resenha Marcelo Tal)
#FlashBack #90 #Tribal
#FlashBack #2000 #Dance (Resenha Marcelo Tal)
#FlashBack #2000 #BomClima
#Flashback #2000 #CasaMess
#FlashBack #2005 #Topsss
#FlashBack #2000-2005 #CanalDaMusicaOficiall
#FlashBack #2000-2005 #Pancadao
#FlashBack #2010 #House #Transas #Zagaia
#FlashBack #2011 #OmegaJacare #Vol.07 #Live
FlashBack #2000-2005-2010 #DNA
FlashBack #2010-2015 MidBack
#FlashBack #2014 #Relembrando #Dance`,
  },
};

const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Extrai tags de hashtags, limpa o título para exibição.
function parse(line) {
  const raw = line.trim();
  const tags = [...raw.matchAll(/#([A-Za-zÀ-ÿ0-9&.]+)/g)].map(m => m[1]);
  return { title: raw, tags };
}

const sections = Object.entries(RAW).map(([id, s]) => {
  const tracks = s.items.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
    const { title, tags } = parse(line);
    return { id: `${id}-${String(i + 1).padStart(2, '0')}-${slug(title) || 'set'}`, title, tags, dur: '', bpm: null, src: '' };
  });
  return { id, label: s.label, short: s.short, blurb: s.blurb, count: tracks.length, tracks };
});

const out = {
  artist: 'Rogério Mess',
  updated: new Date().toISOString().slice(0, 10),
  note: 'src/dur/bpm vazios = aguardando arquivos MP3 reais. Preencher src com caminho relativo (ex: audio/house/129.mp3).',
  sections,
};

const DIR = fileURLToPath(new URL('./data', import.meta.url));
await mkdir(DIR, { recursive: true });
await writeFile(new URL('./data/sets.json', import.meta.url), JSON.stringify(out, null, 2), 'utf8');
console.log('sets.json ->', sections.map(s => `${s.label}: ${s.count}`).join(' · '), '=', sections.reduce((a, s) => a + s.count, 0), 'sets');
