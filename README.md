# DSA

Interactive labs for learning data structures and algorithms. Each lab runs real code one line at a
time and draws what that line does to memory.

Credit to [Real DSA](https://realdsa.com/) by Ankush Dharkar, where these topics come from.

Built with [Astro](https://astro.build) as a fully static site: no server, no framework runtime.

## Run it

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

## Layout

```
src/
  data/topics.ts               registry of topics (drives the home page and page titles)
  layouts/BaseLayout.astro     <head>, fonts, site header/footer, theme toggle
  styles/global.css            colour tokens (light + dark), typography, .wrap column
  pages/
    index.astro                home page: topic cards
    topics/<slug>.astro        one thin page per topic
  topics/<slug>/               the lab itself
    <Name>Lab.astro            markup
    lab.css                    lab-only styles (global, because lab.js builds DOM at runtime)
    lab.js                     behaviour
public/                        copied as-is (favicon, images)
```

## Adding a topic

Start from a standalone HTML artifact (e.g. `stack-lab.html`):

1. **Make the folder** `src/topics/stack/`.
2. **Split the HTML** into three files:
   - `lab.css`: the artifact's `<style>` contents. Leave out `:root` tokens, `body`, `h1`, `h2`,
     `p`, `code`, `.eyebrow`, `.lede` and `.wrap`, because `global.css` already provides them. Keep
     the same token names (`--bg`, `--surface`, `--fg`, `--muted`, `--line`, `--ptr`, `--hl`,
     `--hl-soft`, `--grid`, `--display`, `--body`, `--mono`) and light/dark mode just works.
     Don't style bare `header`/`footer`/`main`; give the lab's elements a class instead.
   - `lab.js`: the artifact's `<script>` contents. It runs as an ES module, so a wrapping IIFE is
     optional.
   - `StackLab.astro`: everything inside `<body>` except the script, wrapped like this:
     ```astro
     ---
     import './lab.css';
     ---
     <div class="wrap">
       <!-- artifact body markup -->
     </div>
     <script>
       import './lab.js';
     </script>
     ```
     Astro reads `{` and `}` in markup as expressions. If the markup contains literal braces
     (in a `<pre>` code sample, say), write them as `{'{'}` and `{'}'}`.
3. **Add the page** `src/pages/topics/stack.astro`:
   ```astro
   ---
   import BaseLayout from '../../layouts/BaseLayout.astro';
   import StackLab from '../../topics/stack/StackLab.astro';
   import { getTopic } from '../../data/topics';
   const topic = getTopic('stack');
   ---
   <BaseLayout title={`${topic.title} · DSA`} description={topic.summary}>
     <StackLab />
   </BaseLayout>
   ```
4. **Register it** in `src/data/topics.ts`. The `slug` must match the page's file name.

Run `npm run build` to check.

## Hosting

`npm run build` writes plain static files to `dist/`, which any static host can serve:

- **Vercel / Netlify / Cloudflare Pages**: import the repo. Build command `npm run build`, output
  directory `dist`. Nothing else to configure.
- **GitHub Pages**: if the site lives at `https://<user>.github.io/<repo>/`, set
  `base: '/<repo>'` (and `site`) in `astro.config.mjs`. Internal links go through `url()` in
  `src/lib/url.ts`, so they pick up the base automatically; use it for any new internal link.

Set `site` in `astro.config.mjs` to your real domain once you have one, so pages get canonical URLs.
