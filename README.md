# Healthcare and Biotechnology: CV to portfolio

Open `index.html`, upload a PDF CV and the page rebuilds itself as a clean biotech-style portfolio (hero, profile strip, project cards, counting stats bar, experience, skills with animated map, contact banner). "Download site" saves the finished page as one standalone HTML file.

- `index.html` – the page (theme, script and images inlined so it works on its own)
- `clinical-light.css` / `clinical-light.js` – the reusable theme (all classes prefixed `hc-`)
- `page.html`, `helpers.js`, `build.py` – source: page template, PDF parser, build script (`python3 build.py`)
- `img/` – photos cut from the Nexora design; `prep.py` is how they were cut

Theme features: scroll reveal, word-by-word headings, counting numbers, light that travels round box borders, hover spotlight, pulsing map pins. Colours live in the first block of `clinical-light.css`.
