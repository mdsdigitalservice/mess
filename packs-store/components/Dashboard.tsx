'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { BASE_PATH } from '@/lib/store';
import type { Pack, PackOrder, OrderStatus } from '@/lib/types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Cuiaba' });

export default function Dashboard() {
  const [packs, setPacks] = useState<Pack[]>([]); const [orders, setOrders] = useState<PackOrder[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function reload() {
    try {
      const [packsRes, ordersRes] = await Promise.all([fetch(`${BASE_PATH}/api/admin/packs`, { cache: 'no-store' }), fetch(`${BASE_PATH}/api/admin/orders`, { cache: 'no-store' })]);
      if (packsRes.status === 401 || ordersRes.status === 401) return location.assign(`${BASE_PATH}/login`);
      const [packsData, ordersData] = await Promise.all([packsRes.json(), ordersRes.json()]);
      if (!packsRes.ok || !ordersRes.ok) throw new Error(packsData.error || ordersData.error || 'Falha ao carregar painel.');
      setPacks(packsData.packs); setOrders(ordersData.orders);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao carregar painel.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  return <main className="admin-shell">
    <header className="admin-header"><Image src={`${BASE_PATH}/assets/logo-mess-white.png`} width={400} height={72} alt="DJ Rogério Mess" priority /><div><a href={`${BASE_PATH}/`} target="_blank">Abrir loja</a><form action={`${BASE_PATH}/api/auth/logout`} method="post"><button>Sair</button></form></div></header>
    <section className="admin-title"><p className="kicker">Operação da loja</p><h1>Packs & <em>pedidos.</em></h1><p>Arquivos no Cloudflare R2 · pedidos e aprovações na Vercel.</p></section>
    {error && <p className="admin-alert">{error}</p>}
    {loading ? <div className="admin-loading">Carregando painel…</div> : <>
      <PackForm onCreated={(pack) => setPacks((items) => [pack, ...items])} />
      <PackList packs={packs} onChanged={(pack) => setPacks((items) => items.map((item) => item.id === pack.id ? pack : item))} onDeleted={(id) => setPacks((items) => items.filter((item) => item.id !== id))} />
      <Orders orders={orders} onChanged={(order) => setOrders((items) => items.map((item) => item.id === order.id ? order : item))} />
    </>}
  </main>;
}

function PackForm({ onCreated }: { onCreated: (pack: Pack) => void }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const cover = data.get('cover'), preview = data.get('preview'), bundle = data.get('bundle');
    if (!(bundle instanceof File) || !bundle.size) return setError('Selecione o ZIP completo do pack.');
    setBusy(true); setError('');
    try {
      setMessage('Criando cadastro…');
      const response = await fetch(`${BASE_PATH}/api/admin/packs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: data.get('title'), description: data.get('description'), price_cents: Math.round(Number(data.get('price')) * 100), tracks_count: Number(data.get('tracks_count') || 0) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); let pack = result.pack as Pack;
      if (cover instanceof File && cover.size) { setMessage('Enviando capa para o R2…'); pack = await uploadPackFile(pack.id, 'cover', cover, (p) => setMessage(`Enviando capa… ${p}%`)); }
      if (preview instanceof File && preview.size) { setMessage('Enviando prévia para o R2…'); pack = await uploadPackFile(pack.id, 'preview', preview, (p) => setMessage(`Enviando prévia… ${p}%`)); }
      setMessage('Enviando ZIP para o R2…'); pack = await uploadPackFile(pack.id, 'bundle', bundle, (p) => setMessage(`Enviando ZIP… ${p}%`));
      if (data.get('active') === 'on') {
        const publish = await fetch(`${BASE_PATH}/api/admin/packs/${pack.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }) });
        const published = await publish.json(); if (!publish.ok) throw new Error(published.error); pack = published.pack;
      }
      onCreated(pack); form.reset(); setMessage(pack.active ? 'Pack publicado com sucesso.' : 'Pack salvo como rascunho.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao cadastrar o pack.'); setMessage(''); }
    finally { setBusy(false); }
  }
  return <section className="admin-card"><div className="admin-card-head"><div><p className="kicker">Catálogo</p><h2>Novo pack</h2></div><span>UPLOAD DIRETO R2</span></div><form className="admin-form" onSubmit={submit}><label>Nome do pack<input name="title" required maxLength={160} placeholder="House Premium Vol. 01" /></label><label>Preço em reais<input name="price" required type="number" min="1" step="0.01" placeholder="49,90" /></label><label className="wide">Descrição<textarea name="description" rows={3} maxLength={1200} /></label><label>Quantidade de faixas<input name="tracks_count" type="number" min="0" max="999" defaultValue="0" /></label><label>Capa · JPG, PNG ou WebP<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" /></label><label>Prévia · MP3<input name="preview" type="file" accept="audio/mpeg,.mp3" /></label><label>Pack completo · ZIP<input name="bundle" type="file" accept="application/zip,.zip" required /></label><label className="check wide"><input name="active" type="checkbox" /> Publicar após concluir os uploads</label>{error && <p className="form-error wide">{error}</p>}{message && <p className="upload-progress wide">{message}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Processando…' : 'Cadastrar pack'}</button></form></section>;
}

function PackList({ packs, onChanged, onDeleted }: { packs: Pack[]; onChanged: (pack: Pack) => void; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  async function toggle(pack: Pack) { setBusy(pack.id); setError(''); const response = await fetch(`${BASE_PATH}/api/admin/packs/${pack.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !pack.active }) }); const data = await response.json(); setBusy(''); if (!response.ok) return setError(data.error); onChanged(data.pack); }
  async function remove(pack: Pack) { if (!confirm(`Apagar “${pack.title}”?`)) return; setBusy(pack.id); const response = await fetch(`${BASE_PATH}/api/admin/packs/${pack.id}`, { method: 'DELETE' }); const data = await response.json(); setBusy(''); if (!response.ok) return setError(data.error); onDeleted(pack.id); }
  return <section className="admin-card"><div className="admin-card-head"><div><p className="kicker">Produtos</p><h2>Catálogo <small>{packs.length}</small></h2></div></div>{error && <p className="form-error">{error}</p>}<div className="admin-list">{!packs.length && <p className="empty-admin">Nenhum pack cadastrado.</p>}{packs.map((pack) => <article key={pack.id}><div><span className={`status ${pack.active ? 'approved' : 'pending'}`}>{pack.active ? 'Publicado' : 'Rascunho'}</span><h3>{pack.title}</h3><p>{money.format(pack.price_cents / 100)} · {pack.tracks_count} faixas · {pack.bundle_key ? 'R2 pronto' : 'sem ZIP'}</p></div><div><button disabled={busy === pack.id} onClick={() => toggle(pack)}>{pack.active ? 'Desativar' : 'Publicar'}</button><button disabled={busy === pack.id} onClick={() => remove(pack)}>Apagar</button></div></article>)}</div></section>;
}

function Orders({ orders, onChanged }: { orders: PackOrder[]; onChanged: (order: PackOrder) => void }) {
  const [filter, setFilter] = useState<'all' | Exclude<OrderStatus,'uploading'>>('pending'); const [busy, setBusy] = useState(''); const [message, setMessage] = useState('');
  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.status === filter), [filter, orders]);
  async function change(order: PackOrder, status: 'approved'|'rejected') { setBusy(order.id); setMessage(''); const response = await fetch(`${BASE_PATH}/api/admin/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const data = await response.json(); setBusy(''); if (!response.ok) return setMessage(data.error); onChanged(data.order); if (status === 'approved') { await navigator.clipboard.writeText(data.status_url).catch(() => {}); setMessage('Pedido aprovado. Link copiado para enviar ao cliente.'); } }
  return <section className="admin-card"><div className="admin-card-head"><div><p className="kicker">PIX manual</p><h2>Pedidos <small>{visible.length}</small></h2></div><div className="filters">{(['pending','approved','rejected','all'] as const).map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item === 'pending' ? 'Pendentes' : item === 'approved' ? 'Aprovados' : item === 'rejected' ? 'Reprovados' : 'Todos'}</button>)}</div></div>{message && <p className="upload-progress">{message}</p>}<div className="orders-table"><table><thead><tr><th>Cliente</th><th>Pack</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>{!visible.length && <tr><td colSpan={5} className="empty-admin">Nenhum pedido neste status.</td></tr>}{visible.map((order) => <tr key={order.id}><td><strong>{order.customer_name}</strong><small>{order.email}<br />{order.whatsapp}</small></td><td>{order.pack_title}</td><td>{dateTime.format(new Date(order.created_at))}</td><td><span className={`status ${order.status}`}>{order.status === 'approved' ? 'Aprovado' : order.status === 'rejected' ? 'Reprovado' : 'Pendente'}</span></td><td><div className="row-actions"><a href={`${BASE_PATH}/api/admin/orders/${order.id}/proof`} target="_blank">Comprovante</a>{order.status !== 'approved' && <button disabled={busy === order.id} onClick={() => change(order, 'approved')}>Aprovar</button>}{order.status !== 'rejected' && <button disabled={busy === order.id} onClick={() => change(order, 'rejected')}>Reprovar</button>}</div></td></tr>)}</tbody></table></div></section>;
}

async function uploadPackFile(id: string, kind: 'cover'|'preview'|'bundle', file: File, progress: (value: number) => void) {
  const mime = kind === 'bundle' ? 'application/zip' : file.type;
  const response = await fetch(`${BASE_PATH}/api/admin/packs/${id}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase: 'prepare', kind, filename: file.name, content_type: mime, size: file.size }) });
  const prepared = await response.json(); if (!response.ok) throw new Error(prepared.error);
  await upload(prepared.upload_url, file, prepared.headers, progress);
  const complete = await fetch(`${BASE_PATH}/api/admin/packs/${id}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase: 'complete', kind, key: prepared.key }) });
  const result = await complete.json(); if (!complete.ok) throw new Error(result.error); return result.pack as Pack;
}

function upload(url: string, file: File, headers: Record<string,string>, progress: (value: number) => void) { return new Promise<void>((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('PUT', url); Object.entries(headers).forEach(([key,value]) => xhr.setRequestHeader(key,value)); xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); }; xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload recusado (HTTP ${xhr.status}).`)); xhr.onerror = () => reject(new Error('Falha de rede no upload para o R2.')); xhr.send(file); }); }
