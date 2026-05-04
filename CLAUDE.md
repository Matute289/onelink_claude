# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn install      # install dependencies
yarn dev          # dev server at http://localhost:3000
yarn build        # production build
yarn preview      # preview production build locally
yarn generate     # static site generation
```

No lint or test commands are configured.

## Architecture

**Onelink** is a Nuxt 3 link-in-bio tool where all profile data lives entirely in the URL — no backend, no database. Data flows as: form → JSON → Base64 → URL query param → decode on the public page.

### Data encoding

`utils/transformer.js` is the core data layer. `encodeData` serializes the form state to Base64 and `decodeData` reverses it. The URL looks like `/1?data=<base64>`. The JSON keys are intentionally kept minimal (single letters) to limit URL length.

### Data schema (abbreviated keys)

| Key | Field |
|-----|-------|
| `n` | name |
| `d` | description |
| `i` | image URL |
| `f/t/ig/gh/tg/l/e/w/y` | social links (facebook, twitter, instagram, github, telegram, linkedin, email, whatsapp, youtube) |
| `ls` | custom links array: `[{ l: label, i: iconKey, u: url }]` |

### Page routing

- `pages/index.vue` — the editor: left panel is the form, right panel is a live phone-shaped preview via `AppForm/Preview.vue`. "Publish" encodes the current state and copies the URL to clipboard.
- `pages/1.vue` — the public profile page: decodes `?data=` from the query string and renders via `Templates/Simple.vue`. The `1` in the route corresponds to template #1 (roadmap plans for more templates).

### Component structure

- `components/AppForm/` — editor form sections (Profile, SocialLinks, Links, Hr). `Links.vue` uses `vuedraggable` for reordering.
- `components/Templates/Simple.vue` — the only public-facing template. Receives the decoded `acc` object as a prop and renders profile + social icons + custom links.
- `components/Base/` — shared primitives (FormSection layout wrapper, Loading spinner).
- `components/ExternalLink.vue` — renders a single custom link with an icon from `nuxt-icon`.

### Icons

Icon keys (e.g. `ph:globe-duotone`) come from [icones.js.org](https://icones.js.org/) and are rendered via the `nuxt-icon` module.
