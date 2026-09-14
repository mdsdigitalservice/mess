'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { BASE_PATH } from '@/lib/store';

type PublicPack = { id: string; title: string; description: string; price_cents: number; tracks_count: number; cover_url: string | null; preview_url: string | null };
type Store = { packs: PublicPack[]; pix: { key: string; beneficiary: string; city: string }; whatsapp: string };
type OrderState = { status: 'pending'|'approved'|'rejected'; pack_title: string; price_cents: number; remaining_downloads: number; download_url: string | null };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Storefront() {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PublicPack | null>(null);
  const [orderToken, setOrderToken] = useState('');
  const [order, setOrder] = useState<OrderState | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [playing, setPlaying] = useState('');
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/store`).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setStore(data);
    }).catch(() => setError('Não foi possível carregar os packs agora.'));
    const token = new URLSearchParams(location.search).get('pedido') || localStorage.getItem('mess_pack_order') || '';
    if (token) { setOrderToken(token); setStatusOpen(true); loadOrder(token); }
  }, []);

  async function loadOrder(token: string) {
    const response = await fetch(`${BASE_PATH}/api/orders/${token}`, { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setOrder(data); else setOrder(null);
  }

  function play(pack: PublicPack) {
    if (!audio.current || !pack.preview_url) return;
    if (playing === pack.id) { audio.current.pause(); setPlaying(''); return; }
    audio.current.src = pack.preview_url;
    audio.current.play().then(() => setPlaying(pack.id)).catch(() => setPlaying(''));
  }

  return <>
    <header className="site-nav">
      <a href="https://rogeriomessdj.com.br" className="brand"><Image src={`${BASE_PATH}/assets/logo-mess-white.png`} width={400} height={72} alt="DJ Rogério Mess" priority /></a>
      <nav><a href="https://rogeriomessdj.com.br">Início</a><a href="#packs">Packs</a><a href="#como-funciona">Como comprar</a></nav>
      <a className="nav-cta" href="#packs">Comprar packs</a>
    </header>

    <main>
      <section className="store-hero">
        <div className="hero-rings" aria-hidden="true" />
        <div className="hero-content reveal">
          <p className="kicker"><span /> Curadoria profissional para DJs</p>
          <h1>Packs que fazem<br />a pista <em>responder.</em></h1>
          <p className="hero-copy">Seleções exclusivas, organizadas e prontas para tocar. Escolha seu pack, pague por PIX e receba o download após a confirmação.</p>
          <div className="hero-actions"><a className="primary" href="#packs">Explorar packs</a><a className="ghost" href="#como-funciona">Como funciona</a></div>
        </div>
        <div className="hero-stats">
          <span><b>Alta</b> qualidade</span><span><b>PIX</b> seguro</span><span><b>R2</b> download protegido</span>
        </div>
      </section>

      <section className="catalog-section" id="packs">
        <div className="section-heading"><div><p className="kicker">Coleção disponível</p><h2>Escolha sua próxima <em>arma de pista.</em></h2></div><span className="catalog-count">{store ? `${store.packs.length} PACK${store.packs.length === 1 ? '' : 'S'}` : 'CARREGANDO'}</span></div>
        <div className="pack-grid">
          {error && <div className="empty-state">{error}</div>}
          {!store && !error && [1,2,3].map((item) => <div className="pack-card skeleton" key={item} />)}
          {store?.packs.length === 0 && <div className="empty-state">Novos packs chegando. Acompanhe o Rogério no Instagram.</div>}
          {store?.packs.map((pack, index) => <article className="pack-card" key={pack.id}>
            <div className="pack-cover">
              {pack.cover_url ? <Image src={pack.cover_url} alt={`Capa do ${pack.title}`} fill sizes="(max-width: 560px) 100vw, (max-width: 820px) 50vw, 33vw" unoptimized /> : <div className="cover-fallback"><Image src={`${BASE_PATH}/assets/logo-mess-white.png`} width={400} height={72} alt="" /></div>}
              <span className="pack-index">{String(index + 1).padStart(2, '0')}</span><span className="pack-label">PACK DIGITAL</span>
              {pack.preview_url && <button className="play" onClick={() => play(pack)} aria-label={`${playing === pack.id ? 'Pausar' : 'Ouvir'} prévia`}>{playing === pack.id ? 'Ⅱ' : '▶'}</button>}
            </div>
            <div className="pack-info"><p className="pack-meta">{pack.tracks_count ? `${pack.tracks_count} faixas` : 'Seleção exclusiva'}</p><h3>{pack.title}</h3><p>{pack.description || 'Curadoria exclusiva pronta para download.'}</p><div className="pack-buy"><strong>{money.format(pack.price_cents / 100)}</strong><button className="primary" onClick={() => setSelected(pack)}>Comprar com PIX</button></div></div>
          </article>)}
        </div>
      </section>

      <section className="how-section" id="como-funciona">
        <div className="section-heading"><div><p className="kicker">Processo simples</p><h2>Da escolha ao <em>download.</em></h2></div></div>
        <div className="steps-grid">
          <article><span>01</span><h3>Escolha o pack</h3><p>Veja os detalhes, escute a prévia e escolha a seleção certa para o seu set.</p></article>
          <article><span>02</span><h3>Faça o PIX</h3><p>Use a chave exibida na compra e envie seu comprovante com segurança.</p></article>
          <article><span>03</span><h3>Receba o acesso</h3><p>Após a aprovação, o download protegido aparece no acompanhamento do pedido.</p></article>
        </div>
      </section>

      <section className="final-cta"><p className="kicker">DJ Rogério Mess</p><h2>Sua próxima pista<br />começa <em>aqui.</em></h2><a className="primary" href="#packs">Ver todos os packs</a></section>
    </main>

    <footer><Image src={`${BASE_PATH}/assets/logo-mess-white.png`} width={400} height={72} alt="DJ Rogério Mess" /><p>Curadoria e performance sonora premium.</p><div><a href="https://rogeriomessdj.com.br">Site oficial</a><a href="https://www.instagram.com/rogeriomess" target="_blank" rel="noreferrer">Instagram</a><a href={`${BASE_PATH}/login`}>Painel</a></div><small>© 2026 DJ Rogério Mess · Desenvolvido por MDS Digital</small></footer>
    <audio ref={audio} onEnded={() => setPlaying('')} />

    {selected && store && <Checkout pack={selected} store={store} onClose={() => setSelected(null)} onComplete={(token) => { setSelected(null); setOrderToken(token); setStatusOpen(true); loadOrder(token); }} />}
    {statusOpen && orderToken && <StatusModal order={order} onRefresh={() => loadOrder(orderToken)} onClose={() => setStatusOpen(false)} />}
  </>;
}

function Checkout({ pack, store, onClose, onComplete }: { pack: PublicPack; store: Store; onClose: () => void; onComplete: (token: string) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [progress, setProgress] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget); const proof = data.get('proof');
    if (!(proof instanceof File) || !proof.size) { setBusy(false); return setError('Selecione o comprovante.'); }
    try {
      setProgress('Preparando envio seguro…');
      const response = await fetch(`${BASE_PATH}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack_id: pack.id, customer_name: data.get('customer_name'), email: data.get('email'), whatsapp: data.get('whatsapp'), proof_filename: proof.name, proof_type: proof.type, proof_size: proof.size }) });
      const prepared = await response.json(); if (!response.ok) throw new Error(prepared.error || 'Não foi possível criar o pedido.');
      setProgress('Enviando comprovante…');
      await upload(prepared.upload_url, proof, prepared.headers, (value) => setProgress(`Enviando comprovante… ${value}%`));
      setProgress('Confirmando pedido…');
      const completed = await fetch(prepared.complete_url, { method: 'POST' }); const result = await completed.json();
      if (!completed.ok) throw new Error(result.error || 'Não foi possível confirmar o comprovante.');
      localStorage.setItem('mess_pack_order', prepared.token); history.replaceState({}, '', `?pedido=${prepared.token}`); onComplete(prepared.token);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao enviar o pedido.'); }
    finally { setBusy(false); setProgress(''); }
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="checkout-sheet"><button className="modal-close" onClick={onClose}>×</button><p className="kicker">Finalizar pedido</p><h2>{pack.title}</h2><p className="muted">{pack.description}</p><div className="pix-card"><div><span>Valor do PIX</span><strong>{money.format(pack.price_cents / 100)}</strong></div><div><span>Chave PIX</span><strong>{store.pix.key || 'Não configurada'}</strong><button onClick={() => navigator.clipboard.writeText(store.pix.key)}>Copiar</button></div><small>{[store.pix.beneficiary, store.pix.city].filter(Boolean).join(' · ')}</small></div><form className="checkout-form" onSubmit={submit}><label>Seu nome<input name="customer_name" required maxLength={120} /></label><label>WhatsApp<input name="whatsapp" required inputMode="tel" placeholder="(65) 99999-9999" /></label><label className="full">E-mail<input name="email" type="email" required maxLength={180} /></label><label className="full">Comprovante · JPG, PNG ou PDF até 10 MB<input name="proof" type="file" required accept="image/jpeg,image/png,application/pdf" /></label>{error && <p className="form-error full">{error}</p>}{progress && <p className="upload-progress full">{progress}</p>}<button className="primary full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar comprovante'}</button></form></section></div>;
}

function StatusModal({ order, onRefresh, onClose }: { order: OrderState | null; onRefresh: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="checkout-sheet status-sheet"><button className="modal-close" onClick={onClose}>×</button><p className="kicker">Acompanhamento</p><h2>Seu pedido</h2>{!order ? <p className="muted">Consultando pedido…</p> : <div className="order-status"><span className={`status ${order.status}`}>{order.status === 'approved' ? 'Aprovado' : order.status === 'rejected' ? 'Não aprovado' : 'Em análise'}</span><h3>{order.pack_title}</h3><p>{money.format(order.price_cents / 100)} · {order.remaining_downloads} download(s) disponível(is)</p>{order.download_url ? <a className="primary" href={order.download_url}>Baixar pack agora</a> : <button className="ghost" onClick={onRefresh}>Atualizar situação</button>}</div>}</section></div>;
}

function upload(url: string, file: File, headers: Record<string,string>, progress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('PUT', url); Object.entries(headers || {}).forEach(([key,value]) => xhr.setRequestHeader(key,value)); xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); }; xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload recusado (HTTP ${xhr.status}).`)); xhr.onerror = () => reject(new Error('Erro de rede ao enviar para o Cloudflare R2.')); xhr.send(file); });
}
