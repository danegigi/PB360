# Pitney Bowes Shipping360 — Developer Tutorials

A multi-carrier developer tutorial suite for the Pitney Bowes **Shipping360** API,
verified against the live docs at <https://docs.shipping360.pitneybowes.com>
(API portal release **v1.0.52**, Aug 27 2026).

**Live site:** <https://danegigi.github.io/PB360/>

## Contents

- **`index.html`** — landing page: a clickable card grid grouped into
  *Start here / US carriers / Canada carriers / International & Last-mile*.
- **`tutorials/`** — the rendered HTML pages:
  - `00-basics.html` — the carrier-agnostic foundation: auth, headers, address
    verify, the runtime-metadata rule, connecting a carrier account, rating,
    Create Shipment V2, customs, returns, cancel, manifest, rate-card models,
    SDKs, and a DB schema.
  - Per-carrier pages: `usps`, `ups`, `fedex`, `canadapost`, `purolator`,
    `canpar`, `dhlexpress`, `uniuni` — each covers geography, capabilities,
    verified service/parcel/special codes (with the runtime-metadata caveat),
    label formats, how to register/connect the carrier account, the rate-card /
    who-pays model, and gotchas.
- **`content/`** — the Markdown source for each tutorial (edit these).
- **`assets/style.css` + `assets/tutorial.js`** — one shared stylesheet and a
  single client-side Markdown renderer reused by every page (sidebar TOC with
  scroll-spy, dark/light auto theme, code copy buttons, mobile menu).
- **`Shipping360_UPS_USPS_Guide.md` / `.html`** — the original standalone
  UPS+USPS guide (self-contained single-file HTML) that the suite grew out of.

## Building

The HTML tutorial pages are generated from the Markdown in `content/` by a small
wrapper step (links the shared CSS/JS and embeds the Markdown in a
`<script type="text/markdown">` block). After editing a `content/*.md` file,
re-wrap it into the matching `tutorials/*.html`.

## Key concept: fetch carrier codes at runtime

Shipping360 deliberately does **not** publish per-carrier service / parcel-type /
special-service code tables — the Carrier Catalog and per-carrier overview pages
render "Metadata information not available." Always fetch the current values at
runtime via the metadata APIs (`getServices` / `getParcelTypes` /
`getSpecialServices`, per origin/destination). See *Basics → Carrier Metadata*.

## Viewing locally

```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory .
# then open http://127.0.0.1:8080/index.html
```

## Deployment (GitHub Pages)

This is a static site served straight from the repository root. To publish:

1. Push to `git@github.com:danegigi/PB360.git`.
2. In the repo → **Settings → Pages**, set **Source = Deploy from a branch**,
   **Branch = `main`**, **Folder = `/ (root)`**.
3. The site goes live at <https://danegigi.github.io/PB360/>.

A `.nojekyll` file is included so GitHub Pages serves the files as-is (no Jekyll
processing). All page assets are relative, so it works under the `/PB360/`
sub-path.

## Security

No credentials are published in this site. All example values are placeholders:

- API keys/secrets: `your_client_id` / `your_client_secret` (read from env in the
  code samples — never hard-coded, never committed).
- Access token: a truncated `eyJhbGciOi...` placeholder.
- Emails: `@example.com` (and `DEMO@PB.COM`, documented as PB's demo value).
- Carrier account numbers: `99999992` / `0001234` (documented as demo).

The Go and TypeScript samples in `content/resources.md` read credentials from
environment variables and explicitly warn against committing them.

> Verify final field names and allowed values against the official reference and
> the Carrier Catalog before production.
