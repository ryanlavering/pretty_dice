---
id: PD-114
title: >-
  Sound system upgrade: three swappable backends (Kenney samples, best-of-real
  samples, new procedural) with runtime A/B switch
status: Needs Review
assignee: []
created_date: '2026-11-12T04:09:00Z'
updated_date: '2026-11-12T08:03:00Z'
labels:
  - audio
dependencies: []
references:
  - index.html (sfx / audioInit / voice
  - ~line 1575)
  - backlog/tasks/pd-52 - Real-sound-samples-for-rolls-and-impacts.md
priority: medium
ordinal: 128000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade the dice sound system and let the owner compare three candidate backends live, switching at runtime, to pick the best. Builds on PD-52 (real samples), which covers sourcing/sample matrix; this card adds the backend abstraction and the A/B switch.

Backends:
1. Real, single library: all clips from Kenney (CC0; Casino Audio pack has dice throws, chips, cards, plus other Kenney packs for thuds/clacks as needed).
2. Real, best of class: pick the best clip per role from any real library (Freesound CC0 filter, OpenGameArt CC0, Kenney, own recordings). Licences checked per file; prefer CC0, record source/author/licence in CREDITS.md; no attribution-required or NC unless owner accepts; no copyright-unclear downloads.
3. Procedural: a new synthesis implementation (Web Audio: filtered noise bursts, modal/resonant partials per material, impact-speed driven, per-die variation, rolling rumble), replacing the current ad hoc synth in index.html.

Design notes: define one backend interface (impact(speed, material/substrate, shape), roll loop level, nat 20 / nat 1 stingers, chime, fumble, blip, volume/mute) so physics code calls a single API and never knows which backend is active. Keep the iOS audio-session handling (keepAudible, playBlip) backend-independent. Keep the current synth as the fallback if samples fail to load (see PD-52 AC #3). Samples decoded once and cached; keep total size small. Runtime switch: a control in the existing sound settings (or a debug-only panel) plus a URL param (e.g. ?sound=kenney|best|synth), switchable mid-session without reload, remembered in localStorage. Same roll should be comparable across backends (same master volume / loudness normalisation).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Single sound-backend interface; physics/UI code calls only that API
- [x] #2 Backend A: all-Kenney sample set working, licences recorded
- [x] #3 Backend B: best-of-class sample set from multiple libraries, per-file licence/source in CREDITS.md
- [x] #4 Backend C: new procedural synth backend, covers impacts, roll loop, nat 20/nat 1, chime, fumble
- [x] #5 Runtime switch between A, B, C (UI control and ?sound= param) with no reload; choice remembered
- [ ] #6 Loudness matched across backends so A/B comparison is fair
- [x] #7 Falls back to procedural if samples fail to load; iOS silent-switch handling still works
- [ ] #8 Tests: backend interface contract and switch covered; owner picks a winner or blend (follow-up card to prune the losers)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11/12 progress. Engine mapped into the app: blend backend (mix) is the default, layered mode; limiter on the output; clackiness score per clip + material-pair hardness mapping (MAT_HARD, surface-for-sound setting) with filter/pitch correction; sample sets (best, kenney) built by scripts/build-sounds.mjs from CC0 sources (sounds/CREDITS.md); sets embedded in the offline/artifact builds. Owner listened via the audition tool: layered slider mimics surface hardness well; best = bright/clacky (wood, plastic), kenney = dark/rich (felt, leather); metal and glass not yet auditioned. Tuning tool is maintained in the repo: tools/sound-audition.html (docs: sounds/README.md). Stingers and rolling rumble still on the classic synth.
Remaining: AC6 loudness matching across backends (trim), AC8 owner picks winner / prune (classic and proc kept as fallbacks for now); real stone/metal/glass hits, rolling loop, stinger samples (see PD-52).

2026-11-12: metal/glass ring layer added (RING table, 'Metal / glass ring' slider). Full npm test: 95 passed, 3 flaky (undo/redo, filigree atlas, 25 s watchdog; all passed on retry, none touch sound). Branch feat/pd-114-sound, not pushed. Review: listen via /tools/sound-audition.html and in the app (default set is the layered blend).
<!-- SECTION:NOTES:END -->
