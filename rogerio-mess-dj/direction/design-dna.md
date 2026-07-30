# DESIGN DNA — Rogério Mess DJ

> **Portable, actionable design contract for the site build.** Every token below has a concrete value (hex / px / rem / ms / cubic-bezier), not an adjective. Confidence is tagged `observed` (measured live off the reference), `provided` (from the brief), or `inferred` (reconstructed by us, labeled).
>
> **Reference captured live** via Playwright (headless Chromium, 1512×950 @2x + 390×844 mobile): `https://auralport.framer.website/`. Evidence in `screenshots/auralport-*.png` and `source/auralport.*.json`.

---

## 0. Stance (one direction)

A **dark-native audio console**: pure-black void, hairline-thin white structure, and a single hot **crimson** signal color that behaves like a play-head — it lights up what is *active* (playing, focused, hovered). Type is a **techy grotesque** paired with a **tabular mono** so timecodes, BPM and track indices read like real DAW/console readouts. Density with air: content-rich, but every element sits on a strict 4px grid with generous vertical rhythm. **No gradients-as-decoration, no purple/blue startup cliché** — the reference itself rejects them (its accents are crimson `#ED315D` + acid-yellow `#ECF74A` on flat black). The signature texture is a faint **concentric-ring radar** + film grain over black.

**Feels like:** the standby screen of a high-end audio interface at 2am — black, precise, one glowing indicator.

---

## 1. Color — layered dark palette

Dark mode is **native**, not an inverted light theme: the base is true black and elevation is expressed by **white-alpha overlays + hairline borders + backdrop-blur**, exactly as the reference does. Solid gray surfaces are used only for form controls.

### Background layers (elevation)
| Token | Value | Confidence | Use |
|---|---|---|---|
| `--bg-0` | `#000000` | observed (body bg `rgb(0,0,0)`) | Page void / base |
| `--bg-1` | `#0A0A0B` | inferred (raised from #000) | Sections that need separation from void |
| `--bg-2` | `#121214` | inferred | Elevated panels / booking card |
| `--bg-3` | `#1A1A1D` | observed (inputs `rgb(26,26,26)`) | Input & control fills |

### White-alpha ramp (the elevation & structure system — observed verbatim from `:root`)
| Token | Value | Confidence | Use |
|---|---|---|---|
| `--w-04` | `rgba(255,255,255,0.04)` | observed `#ffffff0a` | Chip fill, faint raised surface |
| `--w-06` | `rgba(255,255,255,0.06)` | observed `#ffffff0f` | Hover surface tint |
| `--w-08` | `rgba(255,255,255,0.08)` | observed `#ffffff14` | **Hairline border (default)** |
| `--w-16` | `rgba(255,255,255,0.16)` | observed `#ffffff29` | Hairline strong / idle waveform bar |
| `--w-24` | `rgba(255,255,255,0.24)` | observed `#ffffff3d` | Divider on hover, disabled fg |
| `--w-36` | `rgba(255,255,255,0.36)` | observed `#ffffff5c` | Badge fill, muted text on media |

### Text ramp (observed from live text nodes)
| Token | Value | Confidence | Use |
|---|---|---|---|
| `--fg` | `rgba(255,255,255,0.92)` | observed `#ffffffeb` (titles) | Primary text / headings |
| `--fg-2` | `rgba(255,255,255,0.64)` | observed `#ffffffa3` | Secondary / body-dim |
| `--fg-3` | `rgba(255,255,255,0.36)` | observed (labels, chips, `opacity:0.6` on 14px) | Muted labels, meta |
| `--fg-on-accent` | `#0A0A0B` | inferred | Text on crimson/white fills |

### Accent (signal colors — observed brand tokens)
| Token | Value | Confidence | Use |
|---|---|---|---|
| `--accent` | `#ED315D` | observed (`--token-14f87c9b…`) | **Play / active / links / focus / progress fill** |
| `--accent-press` | `#B81239` | observed (`--token-735880c7…`) | Pressed/active crimson |
| `--accent-tint` | `rgba(237,49,93,0.12)` | inferred | Active-row wash, subtle |
| `--live` | `#ECF74A` | observed (`--token-4ecdfbf8…`) | **RARE** — "AO VIVO / NOW PLAYING / BPM" spark only |

> **Anti-slop gate:** accent is crimson `#ED315D`, explicitly **not** default Tailwind indigo (`#6366f1`/`#4f46e5`/…). No hero trust-gradient. Both P0 checks pass.

### Signature textures
- **Grain/noise:** SVG `feTurbulence` (baseFrequency `0.9`, 2 octaves), mono, `opacity: 0.035`, `mix-blend-mode: overlay`, fixed overlay on dark sections. Confidence: inferred (reference hero shows fine film grain).
- **Radar rings:** concentric 1px circles in `--w-08`→transparent, centered, behind hero. Confidence: observed (hero motif).
- **Glow:** crimson bloom under active play controls; white bloom under primary CTA. See `--glow-*` below.

---

## 2. Typography

Three families, performance-first (variable/subset, `font-display: swap`). The reference pairs a heavy grotesque display (Basement Grotesque, proprietary) + Inter UI + Instrument Serif accent. We substitute **free, self-hostable** faces that keep the audio-console character.

| Role | Family | Weights | Confidence | Notes |
|---|---|---|---|---|
| `--font-display` | **Space Grotesk** | 500, 700 | inferred (substitute for observed Basement Grotesque) | Techy grotesque — hero, headings, set titles, wordmark. Uppercase + tight tracking for impact. |
| `--font-sans` | **Inter** | 400, 500, 600 | observed (reference UI uses Inter) | Body, UI labels, buttons, inputs. |
| `--font-mono` | **JetBrains Mono** | 500 | inferred (audio-console requirement, brief) | **Tabular** timecodes, BPM, track index, meta kickers. `font-variant-numeric: tabular-nums`. |

Self-host as `woff2` (`/fonts/`). Do **not** hit a font CDN at runtime (perf + privacy). Total ~90KB gzip for the used subsets.

### Type scale (fluid, web-native `clamp()`)
| Token | clamp | line-height | tracking | family / weight | Use |
|---|---|---|---|---|---|
| `--t-display` | `clamp(3rem, 8vw, 6.5rem)` | `0.95` | `-0.03em` | Display 700, **UPPERCASE** | Hero headline |
| `--t-h1` | `clamp(2.25rem, 5vw, 4rem)` | `1.0` | `-0.02em` | Display 700 | Section titles |
| `--t-h2` | `clamp(1.5rem, 3vw, 2.25rem)` | `1.05` | `-0.01em` | Display 500/700 | Sub-sections |
| `--t-h3` | `1.25rem` (20px) | `1.2` | `-0.01em` | Display 500 / Inter 600 | Card / set title |
| `--t-body` | `1rem` (16px) | `1.6` | `0` | Inter 400 | Paragraphs |
| `--t-small` | `0.875rem` (14px) | `1.5` | `0` | Inter 400/500 | Secondary text |
| `--t-meta` | `0.75rem` (12px) | `1.3` | `0.08em` | **Mono 500, UPPERCASE** | Kickers, chips, labels |
| `--t-time` | `0.8125rem` (13px) | `1` | `0` | Mono 500, **tabular-nums** | Timecodes, BPM, duration |

Observed anchors: hero display SVG-rendered heavy uppercase; card title `16px / fw400 / rgba(255,255,255,0.92)`; duration `13px / fw600 / tabular`; muted labels `12px / fw500 / rgba(255,255,255,0.36)`; form label `14px / opacity 0.6`. Mobile body base `16px` (prevents iOS zoom).

---

## 3. Spacing & grid

4px base unit (observed grid; reference gap dominant `10px`, also `4/8/12/30/33px`).

| Token | px | Token | px |
|---|---|---|---|
| `--space-1` | 4 | `--space-6` | 32 |
| `--space-2` | 8 | `--space-7` | 48 |
| `--space-3` | 12 | `--space-8` | 64 |
| `--space-4` | 16 | `--space-9` | 96 |
| `--space-5` | 24 | `--space-10` | 128 |

- **Container:** `--container: 1200px`; wide hero/gallery `--container-wide: 1440px`; gutters `clamp(16px, 4vw, 48px)`.
- **Section rhythm:** `--section-y: clamp(64px, 10vw, 128px)` top/bottom.
- **Grid:** gallery uses `repeat(auto-fill, minmax(clamp(260px, 30vw, 300px), 1fr))`, gap `--space-5`. Reference cards measured **300×619px** portrait.
- **Breakpoints:** `sm 480` · `md 768` · `lg 1024` · `xl 1280`.

---

## 4. Radii, elevation, blur, motion

### Radii (observed 6 / 10 / 11 / 16 / 44 / pill)
| Token | Value | Use |
|---|---|---|
| `--r-xs` | `6px` | Chips, small badges (observed chip r=6) |
| `--r-sm` | `10px` | Inputs, buttons, count-pill (observed input r=8–10) |
| `--r-md` | `16px` | Cards, panels (observed card r=16) |
| `--r-lg` | `24px` | Large media / modals |
| `--r-pill` | `999px` | Nav rail, CTA pills, avatars (observed rail r=44) |

### Elevation (dark UI = hairline + blur + glow, minimal drop-shadow)
| Token | Value | Confidence |
|---|---|---|
| `--shadow-1` | `0 1px 2px rgba(0,0,0,.5)` | inferred |
| `--shadow-2` | `0 8px 24px -6px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.4)` | observed-ish (layered soft shadow) |
| `--glow-accent` | `0 0 0 1px rgba(237,49,93,.35), 0 10px 34px -6px rgba(237,49,93,.5)` | inferred (crimson play glow) |
| `--glow-white` | `0 10px 44px -6px rgba(255,255,255,.28)` | observed (hero CTA bloom) |

### Backdrop blur (observed: 5 / 13 / 50px)
`--blur-sm: blur(6px)` (chips) · `--blur-md: blur(14px)` (badges/bars) · `--blur-lg: blur(50px)` (nav, floating panels).

### Motion (observed transitions `0.3s ease`; reference does smooth scroll-reveals)
| Token | Value |
|---|---|
| `--dur-fast` | `150ms` |
| `--dur-med` | `300ms` |
| `--dur-slow` | `600ms` |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |

**Rules:**
- **Scroll reveal:** `opacity 0→1` + `translateY(16px→0)`, `600ms var(--ease-out)`, stagger `60ms` per item. Respect `prefers-reduced-motion` → no transform, instant.
- **Card hover:** `transform: scale(1.02)` + cover `filter: brightness(1.08)`, `300ms var(--ease-out)`; play button fades/scales in.
- **Play button:** press `scale(0.96)`; active gets `--glow-accent`.
- **Scrubber thumb:** `150ms` position; waveform bars `120ms` color crossfade at play-head.
- **Now-playing pulse (`--live`):** 2s ease-in-out opacity `1↔0.4` on a small dot only.
- Global default transition budget: `≤300ms`; never animate `width/top` (use transform).

---

## 5. Component specs

All components are built **only from the tokens above** (no literal hex/px in component code).

### 5.1 Nav
- Sticky top bar, `height 64px`, transparent at top → on scroll: `background: rgba(0,0,0,.6)` + `--blur-lg` + bottom `1px solid var(--w-08)`.
- **Left:** waveform glyph mark + wordmark `ROGÉRIO MESS` (Display 700, uppercase, `-0.02em`).
- **Center/right:** links (Inter 500, `--fg-2` → `--fg` on hover, crimson underline grows `--dur-fast`). Items: `Sets · Sobre · Agenda · Contato`.
- **CTA:** `Booking` pill — white fill / `--fg-on-accent` text OR crimson; `--r-pill`, `--glow-white` on hover.
- **Mobile:** collapses to a floating bottom **pill rail** (audio-app feel, echoes reference left-rail): `--w-16` bg + `--blur-lg`, `--r-pill`, icon tabs (Home · Sets · Play · Contato).
- **Focus:** `:focus-visible` → `2px` crimson ring offset `2px`.

### 5.2 Hero
- Full-viewport (`min-height: 92vh`), `--bg-0`, grain overlay + concentric **radar rings** centered behind.
- **Kicker** (Mono meta, uppercase): e.g. `CUIABÁ · OPEN FORMAT · SINCE 2011`.
- **Headline:** `--t-display`, Display 700, uppercase — e.g. `SETS QUE MOVEM A PISTA`.
- **Sub:** Inter, `--fg-2`, max `52ch`.
- **CTAs:** primary white glow pill `Ouvir Sets` (`--glow-white`), secondary ghost `Booking` (hairline border).
- **Foot of hero:** inline **mini-player** teaser (waveform + play + timecode) to signal the audio-first product.

### 5.3 Set Card (portfolio)
- Portrait, `aspect-ratio: 3/4`, `--r-md`, cover image + bottom scrim `linear-gradient(transparent, rgba(0,0,0,.85))`.
- **Top-left:** genre chip (`--w-04` bg, `--blur-sm`, `--r-xs`, Mono meta, `--fg-3`).
- **Top-right:** track-count pill `♪ 12` (`--w-36` bg, `--blur-md`, `--r-sm`).
- **Bottom overlay:** title (Display 500, `--fg`) + duration (Mono, `--fg-2`).
- **Center:** play button fades in on hover; whole card is the link.
- **Hover:** `scale(1.02)`, cover brightens. **Active/playing:** `1px` crimson inset ring + title turns `--fg`.
- **States:** Loading = skeleton (shimmer on `--w-06`); Empty = dashed hairline tile + "Nenhum set"; Error = crimson hairline + retry.

### 5.4 Player (custom, MP3 + Web Audio waveform)
The audio core. Two forms: **inline mini-player** (nav-docked / hero) and **full track view**.

- **Play/Pause button:** circle, `48px` (list) / `64px` (hero). Default `--accent` fill, white glyph, `--glow-accent` when playing. Hover `scale(1.05)`; press `scale(0.96)`. Buffering → glyph replaced by a `2px` crimson spinner ring.
- **Waveform** (`<canvas>`, Web Audio analyser or pre-decoded peaks):
  - **Idle:** bars `--w-16`, bar width `3px`, gap `2px`, height range `20–100%` of a `56px` track.
  - **Playing:** played bars = `--accent` (or crimson→`--accent-press` vertical grad); un-played = `--w-16`; play-head = `1px` `--accent` line. Nearest 2–3 bars get a subtle `scaleY` breathe.
  - **Buffering:** left-to-right opacity shimmer over `--w-08` bars.
  - **Scrub:** the waveform is the seek surface — click/drag sets time; hover shows a `1px` `--fg-3` guide + timecode tooltip (Mono).
- **Scrubber (fallback linear):** track `--w-08` `4px` `--r-pill`; fill `--accent`; thumb `12px` white circle, `--glow-accent` on grab.
- **Timecode:** `--t-time` Mono tabular, format `M:SS / M:SS`; elapsed tinted `--accent` while playing.
- **Track list row:** grid `[index] [title + genre] [BPM] [duration] [play]`.
  - index: Mono `--fg-3` → morphs to play glyph on row hover.
  - title: Inter 600 `--fg`; genre chip inline.
  - **BPM badge:** Mono, `--r-xs`, `--w-04` bg; number may use `--live` acid-yellow for emphasis (`128 BPM`).
  - duration: Mono `--fg-2`, right-aligned, tabular.
  - **Active row:** `2px` crimson left-border + `--accent-tint` wash; **hover row:** `--w-06` wash.
- **States:** Loading (rows skeleton) · Empty ("Nenhuma faixa") · Error (retry) · Populated · Edge (very long title → truncate w/ ellipsis; 3-digit BPM ok).

### 5.5 Genre / BPM badge
- Chip: `--r-xs`, `--w-04` bg, optional `--blur-sm`, Mono `--t-meta` uppercase `--fg-3`, padding `4px 8px`.
- BPM variant: prefix `♩`, number in `--live` for the now-playing track only.

### 5.6 Gallery grid
- `display: grid`, `auto-fill minmax(clamp(260px,30vw,300px), 1fr)`, gap `--space-5`.
- Filter bar above (chips, single-select highlight = `--accent` text + `--w-08` fill). "Filters" label Mono uppercase (observed).
- 2-col mobile → 3-col md → 4-col xl.

### 5.7 Booking section
- Elevated panel `--bg-2`, `--r-lg`, hairline border `--w-08`, inner padding `--space-7`.
- **Fields:** label above (Inter 500 `--fg-3`), input `--bg-3` (#1A1A1D), `--r-sm`, `height 44px`, `1px` `--w-08` border → focus `--accent` border + ring. (Observed input pattern verbatim.)
- Textarea same; leading icons allowed (observed lock/eye pattern).
- **Submit:** crimson pill, Inter 600, arrow suffix `→` (observed), `--glow-accent` hover.
- **Real channel:** WhatsApp is the primary booking route (see content inventory) — surface a prominent `Agendar no WhatsApp` button alongside/above the form.
- **States:** Untouched · Dirty-valid (crimson-ready submit) · Invalid (field `--accent` error border + helper) · Submitting (spinner in button) · Success (checkmark + confirmation).

### 5.8 Footer
- `--bg-0`, top hairline `--w-08`, `--section-y` padding.
- Wordmark + tagline `#SoVem`; social icon row (Instagram, SoundCloud, Facebook, WhatsApp — the real profiles); copyright in Mono `--fg-3`; back-to-top.

---

## 6. Anti-patterns (reject on sight)
- ❌ Indigo/purple/blue startup accent or a two-stop "trust" hero gradient. Accent is crimson `#ED315D`; acid-yellow is a rare spark only.
- ❌ Light surfaces / inverted-light dark mode. Base is true black; elevation via white-alpha + blur.
- ❌ Solid gray card backgrounds. Cards are media + scrim + hairline, not `#222` boxes.
- ❌ Heavy drop-shadows for depth. Use hairline + blur + glow.
- ❌ Decorative gradients, emoji, or stocky "music note" clip-art. The waveform + radar rings are the only motifs.
- ❌ Non-tabular numerals in timecodes/BPM. Always Mono + `tabular-nums`.
- ❌ Runtime font-CDN calls. Self-host woff2.
- ❌ Animating `width`/`top`/`height`; ignoring `prefers-reduced-motion`.
- ❌ Shipping only the "populated" state — every data surface renders Loading/Empty/Error/Edge.

---

## 7. Token block (paste-ready `:root`)

```css
:root{
  /* bg layers */
  --bg-0:#000000; --bg-1:#0A0A0B; --bg-2:#121214; --bg-3:#1A1A1D;
  /* white-alpha ramp (structure/elevation) */
  --w-04:rgba(255,255,255,.04); --w-06:rgba(255,255,255,.06);
  --w-08:rgba(255,255,255,.08); --w-16:rgba(255,255,255,.16);
  --w-24:rgba(255,255,255,.24); --w-36:rgba(255,255,255,.36);
  /* text */
  --fg:rgba(255,255,255,.92); --fg-2:rgba(255,255,255,.64);
  --fg-3:rgba(255,255,255,.36); --fg-on-accent:#0A0A0B;
  /* accent / signal */
  --accent:#ED315D; --accent-press:#B81239; --accent-tint:rgba(237,49,93,.12);
  --live:#ECF74A;
  /* type */
  --font-display:'Space Grotesk',system-ui,sans-serif;
  --font-sans:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  /* spacing */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px;
  --space-6:32px; --space-7:48px; --space-8:64px; --space-9:96px; --space-10:128px;
  --container:1200px; --container-wide:1440px;
  --section-y:clamp(64px,10vw,128px); --gutter:clamp(16px,4vw,48px);
  /* radii */
  --r-xs:6px; --r-sm:10px; --r-md:16px; --r-lg:24px; --r-pill:999px;
  /* elevation / blur / glow */
  --shadow-1:0 1px 2px rgba(0,0,0,.5);
  --shadow-2:0 8px 24px -6px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.4);
  --glow-accent:0 0 0 1px rgba(237,49,93,.35),0 10px 34px -6px rgba(237,49,93,.5);
  --glow-white:0 10px 44px -6px rgba(255,255,255,.28);
  --blur-sm:blur(6px); --blur-md:blur(14px); --blur-lg:blur(50px);
  /* motion */
  --dur-fast:150ms; --dur-med:300ms; --dur-slow:600ms;
  --ease-out:cubic-bezier(.22,1,.36,1); --ease-in-out:cubic-bezier(.65,0,.35,1);
}
```

---

## 8. Risks & unknowns
- **Display font** is a substitute (`Space Grotesk`) for the reference's proprietary *Basement Grotesque* — `inferred`. If a heavier hero impact is wanted, `Anton` (single-weight) can be layered for the giant headline only.
- **Grain/radar** intensities are `inferred` from screenshots, not measured values — tune to taste at build.
- **Waveform peak color grad** (crimson→press) is a design choice, not observed — the reference's players are decorative.
- **Cover art** for set cards does not exist yet (current site has zero photography) — build must ship with tasteful generated/placeholder covers until real assets arrive. See `content-inventory.md`.
- **Acid-yellow `--live`** dosage is `provided/inferred` — keep it to now-playing/BPM sparks; overuse breaks the palette.
