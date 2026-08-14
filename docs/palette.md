# UKG palette

Sprinner uses UKG's brand colours. These values were extracted from UKG's **live properties in
August 2026**, not from the 2020 "logo, color, and typography guide" — UKG has rebranded since, and
the older guide omits the chartreuse and forest tones now used throughout their sites.

## How these were obtained

`www.ukg.com` sits behind a Cloudflare challenge that refuses automated requests (403). The values
below come from UKG-operated subdomains that serve their current brand CSS directly:

| Source                | Evidence                                                        |
| --------------------- | --------------------------------------------------------------- |
| `developer.ukg.com`   | `--color-primary: #005151` declared explicitly; 161 occurrences |
| `marketplace.ukg.com` | `#005151`, `#30cebb`, `#e5ff1f`, `#13352c`                      |
| `careers.ukg.com`     | `#005151`, `#13352c`, `#e5ff1f`, plus the slate tint ramp       |

A colour was only adopted where it appeared on **at least two** of the three, which filters out
platform defaults from the third-party software each subdomain runs on (readme.io blues, for
instance, appear only on the developer hub).

`#30CEBB` also matches the Light Teal in the 2020 guide (Pantone 7465, RGB 48 206 187), so that one
has survived the rebrand unchanged.

## Brand constants

| Token              | Hex       | Role                                  |
| ------------------ | --------- | ------------------------------------- |
| `--ukg-dark-teal`  | `#005151` | Primary. UKG's `--color-primary`.     |
| `--ukg-light-teal` | `#30CEBB` | Interactive accent, primary on dark.  |
| `--ukg-forest`     | `#13352C` | Darkest surface; body text on light.  |
| `--ukg-chartreuse` | `#E5FF1F` | Highlight only — never a text colour. |
| `--ukg-cream`      | `#F7EFE3` | Warm raised surface on light.         |

Ramps: `--ukg-teal-100…900` (`#CEF5F1` → `#001E1E`) and `--ukg-slate-100…500`
(`#E6EEEE` → `#80A8A8`), both observed on UKG properties.

## Semantic tokens

Components never reference a brand constant directly — they use the semantic layer, which is the
only thing that changes between themes.

`--bg` `--surface` `--surface-alt` `--border` `--fg` `--muted` `--primary` `--on-primary`
`--accent` `--highlight` `--on-highlight` `--focus`

| Token           | Light           | Dark              |
| --------------- | --------------- | ----------------- |
| `--bg`          | `#FFFFFF`       | `#17191A` neutral |
| `--surface`     | `#F7EFE3` cream | `#212527`         |
| `--surface-alt` | `#E6EEEE`       | `#2A2F31`         |
| `--border`      | `#CCDCDC`       | `#4E575A`         |
| `--fg`          | `#13352C`       | `#E6EEEE`         |
| `--muted`       | `#3F5E5E`       | `#99B9B9`         |
| `--primary`     | `#005151`       | `#30CEBB`         |

### Why the dark canvas is grey, not forest

The first cut used `#13352C` as the dark background. A saturated green ground is heavy, and it
fights the per-assignee ticket colours arriving in phase 1 — every card would sit on a competing
hue. The canvas is therefore a **neutral grey ramp** (`--neutral-900…700`), with UKG's teal and
chartreuse carrying the brand as accents. These greys are the only values in the file that are not
UKG's; they are labelled as such in `index.css`.

It also measures better: light teal on grey is 8.96:1 against 6.78:1 on forest.

### Measured contrast

Every foreground/background pair the UI actually renders, computed rather than eyeballed. All clear
WCAG AA (4.5:1) for body text.

| Pair                                | Ratio   |
| ----------------------------------- | ------- |
| light `--fg` on `--bg`              | 13.35:1 |
| light `--primary` on `--bg`         | 9.15:1  |
| light `--muted` on `--bg`           | 7.06:1  |
| light `--muted` on `--surface`      | 6.19:1  |
| light `--on-primary` on `--primary` | 9.15:1  |
| dark `--fg` on `--bg`               | 14.98:1 |
| dark `--fg` on `--surface`          | 13.12:1 |
| dark `--primary` on `--bg`          | 8.96:1  |
| dark `--primary` on `--surface`     | 7.86:1  |
| dark `--muted` on `--bg`            | 8.40:1  |
| dark `--muted` on `--surface`       | 7.36:1  |
| dark `--on-primary` on `--primary`  | 8.86:1  |

Two caveats, stated rather than buried:

- `--muted` on light (`#3F5E5E`) is **not** a UKG value. Their slate ramp bottoms out at `#80A8A8`,
  which is 2.54:1 on white and fails as text.
- dark `--border` on `--bg` is 2.38:1, below the 3:1 that non-text UI boundaries ideally meet. It
  reads fine as a divider, but phase 1's board grid lines may want a stronger dedicated token.

## Theme resolution

Three states, in precedence order:

1. `:root[data-theme='dark'|'light']` — an explicit choice, persisted under `sprinner-theme`.
2. `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-theme='light'])` — the OS
   setting, so system-dark cannot override a deliberate light selection.
3. Bare `:root` — light, the default.

Choosing "Auto" removes the attribute rather than writing a resolved value, so the page keeps
tracking the OS if it changes later. An inline script in `index.html` applies a stored choice before
first paint, otherwise dark users get a white flash while React mounts.

The theme is **not** part of the board state: it is a per-device viewing preference and must not
travel inside an exported board file.
