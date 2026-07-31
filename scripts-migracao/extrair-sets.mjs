import fs from 'fs';

// Mudamos a rota de 'posts' para 'media' e pedimos apenas áudios!
const WP_API_BASE = 'https://rogeriomessdj.com.br/wp-json/wp/v2/media?media_type=audio&per_page=100';

// Alguns itens ficam com o título genérico de contato ("@RogerioMessDj #65*99622-6120")
// em vez do nome real do set — nesses casos o nome do ARQUIVO é a fonte confiável.
const isJunkTitle = t => !t || /rogeriomessdj|996226120/i.test(t);

const cleanWpTitle = s => s
  .replace(/&#8211;/g, '-')
  .replace(/&#8217;/g, "'")
  .replace(/&#038;/g, '&')
  .replace(/&amp;/g, '&');

const filenameToTitle = src => decodeURIComponent(src.split('/').pop() || '')
  .replace(/\.mp3$/i, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function fetchAllPages() {
  const first = await fetch(WP_API_BASE);
  if (!first.ok) throw new Error(`Erro de rede: ${first.status}`);
  const totalPages = Number(first.headers.get('X-WP-TotalPages')) || 1;
  let items = await first.json();
  console.log(`📄 ${totalPages} página(s) de mídia encontradas (${first.headers.get('X-WP-Total') || '?'} itens no total).`);

  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(`${WP_API_BASE}&page=${page}`);
    if (!res.ok) throw new Error(`Erro de rede na página ${page}: ${res.status}`);
    items = items.concat(await res.json());
  }
  return items;
}

async function extrairSets() {
  console.log('⏳ Vasculhando direto a biblioteca de mídia do WordPress...');

  try {
    const mediaItems = await fetchAllPages();
    let tracks = [];
    let idCounter = 1;
    let recuperados = 0;

    console.log(`📦 ${mediaItems.length} arquivos de mídia encontrados. Processando os links...`);

    mediaItems.forEach(item => {
      const src = item.source_url;
      if (!src || !src.toLowerCase().endsWith('.mp3')) return; // só MP3

      const wpTitle = item.title && item.title.rendered ? cleanWpTitle(item.title.rendered) : '';
      let title;
      if (isJunkTitle(wpTitle)) {
        title = filenameToTitle(src);
        recuperados++;
      } else {
        title = wpTitle;
      }

      tracks.push({
        id: idCounter.toString(),
        title,
        src,
        tags: ["Migração WP"],
        bpm: null,
        dur: "" // duração real: rode link-audio.mjs ou preencha via painel ADM
      });
      idCounter++;
    });

    if (recuperados) {
      console.log(`🩹 ${recuperados} título(s) estavam quebrados no WordPress (título de contato genérico) — recuperados a partir do nome do arquivo.`);
    }

    const jsonData = {
      sections: [
        {
          label: "Acervo Resgatado",
          count: tracks.length,
          blurb: "Sets resgatados diretamente da biblioteca de mídia do WordPress.",
          tracks: tracks
        }
      ]
    };

    fs.writeFileSync('sets.json', JSON.stringify(jsonData, null, 2));

    console.log(`✅ SUCESSO! ${tracks.length} MP3s extraídos e salvos em 'sets.json'.`);

  } catch (error) {
    console.error('❌ Falha ao extrair dados:', error);
  }
}

extrairSets();
