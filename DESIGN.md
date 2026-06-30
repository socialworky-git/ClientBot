# Socialworky — Design & Build Conventions

This is the reference for keeping the site (and every new tool) visually and
structurally consistent. If you build a new activity, match what's here and it
will line up with everything else automatically.

The fastest way to start a new tool is to copy
[`tools/_template/index.html`](tools/_template/index.html) — it already follows
every convention below.

---

## 1. How the site is wired

It's a static site on Vercel. Three shared files do the heavy lifting:

| File | What it owns | Who links it |
|------|--------------|--------------|
| **`/tokens.css`** | Design tokens only — brand colors, the font stack, and the page-shell width/gutter (CSS variables, no element styles). Safe to link anywhere. | Every page (tool pages link it directly; main pages get it via `theme.css`). |
| **`/theme.css`** | `@import`s tokens, then adds shared **components** (base type, `.btn`, `.section-title`, `.lead`, `.foot`, `.wrap`). | The **main** pages only (home, training, tools hub). Tool pages do **not** link this, so its component classes can't collide with a tool's own styles. |
| **`/header.js`** | Renders the nav bar, loads the Hanken font, builds the Training/Tools dropdowns, and runs the Clerk login gate. | Every page. |

**Change brand colors or the site width in ONE place: [`tokens.css`](tokens.css).**

---

## 2. The page shell (this is what keeps the header constant)

Every page is one centered column at the **same width and gutter**, and the
header bar lines up with it. The header (`header.js`) mounts itself as a
full-width band at the top of `<body>` and centers its contents at the shared
width — so its on-screen position no longer depends on the page's content
column. For that to line up, the page's content column must use the same shell:

```css
body{ /* no left/right padding — the column provides the gutter */ }
.wrap{
  max-width: var(--sw-maxw, 820px);   /* shared column width  */
  margin: 0 auto;
  padding: var(--sw-gutter, 24px);    /* shared left/right gutter */
}
```

```html
<body>
  <script src="/header.js"></script>   <!-- mounts the bar at the top of <body> -->
  <div class="wrap">
    … page content …
  </div>
</body>
```

- **Column width:** `--sw-maxw` = **820px**.
- **Gutter:** `--sw-gutter` = **24px** (16px on phones).
- Don't set a different `max-width` on your column, and don't put left/right
  padding on `<body>` — that's exactly what used to make the header drift.

> Existing tools built before this convention carry a small "shared shell"
> `<style>` block near `</head>` that snaps their older column to the standard.
> New tools built from the template don't need it.

---

## 3. Tokens (the design language)

All defined in [`tokens.css`](tokens.css):

| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#1A1A1A` | primary text |
| `--muted` | `#5B5B5B` | secondary text |
| `--line` | `#E4E4E7` | borders/dividers |
| `--surface` | `#F6F7F8` | card / panel backgrounds |
| `--accent` | `#EB786B` | coral — primary actions, highlights |
| `--accentDeep` | `#C2452F` | darker coral — hovers, links, labels |
| `--coral-bg` | `#FDEEEB` | tinted callout / hero background |
| `--coral-line` | `#F6D4CD` | border for coral surfaces |
| `--sans` | Hanken Grotesk stack | all type |
| `--sw-maxw` / `--sw-gutter` | 820px / 24px | page shell |

**Font:** Hanken Grotesk, loaded by `header.js` — you don't need a separate
font `<link>`. Always drive type off `var(--sans)`.

---

## 4. Typography

| Role | Size / weight |
|------|---------------|
| Page / tool H1 | `clamp(26px, 3.4vw, 40px)`, weight 800, letter-spacing −0.02em |
| Section label (`.section-title`) | 12px, weight 700, UPPERCASE, letter-spacing 1.5px, color `--accentDeep` |
| Body | 15–16px, line-height ~1.6 |
| Small / footnote | 12.5–14px, color `--muted` |

---

## 5. Components

**Buttons** (on main pages via `theme.css`; tools may restyle locally):
```html
<a class="btn btn-primary" href="…">Primary action →</a>
<button class="btn btn-ghost">Secondary</button>
```

**Standard tool hero** — the coral banner at the top of every tool:
```html
<div class="toolhero">
  <div class="ico"><svg …>…</svg></div>      <!-- activity-type icon -->
  <div>
    <div class="brand">Tool <span class="bot">Name</span></div>
    <div class="tagline">One line on what you'll practice.</div>
  </div>
</div>
```

**Activity-type icon** (use the one that matches the format):
- **Simulation** (speech bubble), **Game** (controller), **Practice sheet** (pencil), **Quiz** (brain).
- The exact `<path>` sets are in the comment block inside
  [`tools/index.html`](tools/index.html) and in the template.

**Footer disclaimer** — every tool ends with:
```html
<div class="foot">A Socialworky training resource. For practice only —
  please use fictional details, not real client information.</div>
```

---

## 6. The standard `<head>`

Every page carries (swap the per-page text):
- `<title>Tool Name | Socialworky</title>` — **always `Name | Socialworky`**.
- `<meta name="description">` — one sentence, format: *"A [sim / game / practice sheet / quiz] to practice [goal]."*
- `<link rel="canonical">` + Open Graph + Twitter-card tags (share preview).
- Favicon set: `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png` (in `/images/`).
- `<link rel="stylesheet" href="/tokens.css" />`.
- Vercel analytics snippet.

The template has all of this filled in with `TODO` markers.

---

## 7. Accessibility & content rules

- Wrap any animation in `@media (prefers-reduced-motion: reduce)` and stop it
  (JS animations: check `matchMedia('(prefers-reduced-motion: reduce)')`).
- Tools are practice simulations, **not** clinical advice — keep the footer
  disclaimer and never invite real client information.

---

## 8. Adding a new tool — checklist

1. Copy [`tools/_template/index.html`](tools/_template/index.html) to
   `tools/<your-slug>/index.html`.
2. Fill in the `TODO`s: title, description, canonical/OG URLs, hero name +
   tagline, the activity-type icon, and your activity's content.
3. Add it to the **Tools** dropdown: edit the `TOOLS` array in
   [`header.js`](header.js) (drop a `{ name, href }` under the right category).
4. Add a card to the catalog: copy a `.tool` card in
   [`tools/index.html`](tools/index.html) under the right section.
5. Open the Vercel preview and confirm the header lines up with your content.
