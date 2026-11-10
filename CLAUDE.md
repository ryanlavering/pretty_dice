# Pretty Dice

Single-file Three.js prototype (`index.html`, no build). Serve with `python3 -m http.server 8123`.

- Tasks live in `backlog/` (backlog.md, prefix `pd`). Check `backlog/tasks` before starting; update status as you go. Add `PATH=$HOME/.local/opt/node/bin:$HOME/.local/npm-global/bin:$PATH` to use the `backlog` CLI.
- Headless test hooks: `?test=roll`, `?test=export`, `?test=json`; `?shape=`, `?sub=`, `?radius=` preselect a look.
- Settings persist in localStorage (`prettydice.v1`); clear it when testing defaults.
- Libraries: loaded from the CDN with a fallback to `vendor/` (see `vendor/README.md`). `python3 scripts/build-static.py` makes the single-file offline build in `dist/` (git-ignored). Keep the `<!--BOOTSTRAP-->` markers in `index.html`; the build script replaces that block. Test offline with chrome flag `--host-resolver-rules="MAP cdn.jsdelivr.net ~NOTFOUND, MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND"`.
