# Pretty Dice

Single-file Three.js prototype (`index.html`, no build). Serve with `python3 -m http.server 8123`.

- Tasks live in `backlog/` (backlog.md, prefix `pd`). Check `backlog/tasks` before starting; update status as you go. Add `PATH=$HOME/.local/opt/node/bin:$HOME/.local/npm-global/bin:$PATH` to use the `backlog` CLI.
- Headless test hooks: `?test=roll`, `?test=export`, `?test=json`; `?shape=`, `?sub=`, `?radius=` preselect a look.
- Settings persist in localStorage (`prettydice.v1`); clear it when testing defaults.
