# Assets — Rogério Mess DJ

Gerados a partir das fotos reais em `imagens/` (grade dark unificada: B&W frio,
pretos profundos #0B0C0E, acento vermelho #E31E24, grain + vinheta). Pipeline em
`assets/build/` (Node + sharp). Rode `node 01-logo.js && node 02-header.js && node 03-cards.js` para regenerar.

## Logo (flutuante — NÃO embutir no fundo)
| Arquivo | Uso |
|---|---|
| `logo-mess.png` | wordmark full-res, fundo transparente (branco+vermelho) |
| `logo-mess-1200.png` | normalizado 1200w para nav/hero |
| `logo-mess-white.png` | versão só-branca (fundos onde o vermelho compete) |

Flutua sobre o hero e no nav. Fundo preto do original já removido via luminância.

## Header hero (SEM logo — a logo é camada separada por cima)
| Arquivo | Dim | Uso |
|---|---|---|
| `hero-desktop.webp` / `.jpg` | 2000×1000 | hero desktop; sujeito à direita, vazio à esquerda p/ logo+copy, waveform inferior-esq |
| `hero-mobile.webp` / `.jpg` | 1080×1350 | hero mobile; rosto no terço superior |

Zona de texto: **metade esquerda (desktop)** / **terço inferior (mobile)**. Já tem
scrim, então texto branco tem contraste garantido.

## Backgrounds de página/seção (`backgrounds/`)
Atmosféricos, near-black, **text-safe** (já têm véu escuro → texto branco legível por cima).
| Arquivo | Uso | Onde o texto vai |
|---|---|---|
| `bg-base.webp` (2560×1440) | fundo padrão da página | qualquer lugar |
| `bg-ember.webp` (2560×1440) | seção CTA / booking (brasa vermelha) | qualquer lugar |
| `bg-waveform.webp` (2560×640) | divisor de seção / footer | acima da banda |
| `bg-ghost-couro-fone.webp` (2560×1440) | seção full-bleed, retrato fantasma à dir | **esquerda** |
| `bg-ghost-couro-terco.webp` (2560×1440) | seção full-bleed, retrato fantasma à esq | **direita** |
| `bg-ghost-couro-fone-mobile.webp` (1080×1920) | full-bleed mobile 9:16, sujeito em cima | **embaixo** |
| `bg-ghost-couro-terco-mobile.webp` (1080×1920) | full-bleed mobile 9:16, sujeito embaixo | **em cima** |
| `bg-noise.png` (tile 256) | grain global via CSS `background-repeat` + `mix-blend-mode: soft-light` | — |

> Use os `-mobile` (9:16) via `<picture>`/media-query no lugar dos desktop (16:9)
> em telas estreitas — o desktop cropado em portrait perderia a composição.

## Fundos de card (`cards/`) — sistema para o site inteiro
`manifest.json` lista todos. Convenção `<slug>-<ratio>.webp`:

| Slug | Origem | Melhor uso |
|---|---|---|
| `couro-fone` | couro + headphones + terço (hero) | card de destaque / set principal |
| `couro-terco` | couro + terço | card de set / sobre |
| `couro-terco-duo-3x4` | **duotone vermelho** (assinatura criativa) | 1 card de acento / release em destaque |
| `colete` | colete, sentado | card de set / grid |
| `corpo-inteiro` | corpo inteiro, silhueta spotlight | seção Sobre / banner secundário |
| `evento-01/02` | eventos (P&B) | prova social / grid de shows |

Ratios: `-3x4` (900×1200, card vertical), `-1x1` (1000×1000, grid), `-gallery`
(vertical, scrim leve, sujeito mais visível), `-16x9` (1600×900, banner/faixa wide).

**Wide `-16x9`**: sujeito ancorado num lado com feather no preto, zona de texto do
outro lado (lado alterna por foto p/ variedade — `couro-fone`/`colete` à direita,
`couro-terco`/`corpo-inteiro` à esquerda). Ideal p/ faixas de destaque, cabeçalho
de seção, banner "set da semana". `couro-fone-16x9` tem brasa vermelha de acento.

**Card treatment** já traz scrim inferior + gradiente superior → coloque o texto
embaixo (título/tag) que a legibilidade está garantida. Regra criativa: usar o
`-duo` como acento pontual (1–2 no máximo), nunca em série, pra manter o impacto.
