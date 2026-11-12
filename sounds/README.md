# Dice sounds

How the app makes impact sounds, and how to tune them. Card: PD-114. Credits and licences: `CREDITS.md`.

## Engine (in `index.html`, search "sound backends (PD-114)")
- The physics calls `onImpact` / `playChime` / `playFumble` / `updateRumble`; they hand off to the active backend in `SB`:
  `classic` (original synth), `proc` (procedural synth), `best` and `kenney` (real samples), `mix` (both sample sets; the default).
- Everything goes through a limiter (fast compressor plus soft clipper) so overlapping hits cannot clip.
- **Blend** (`mix`): the Best <-> Kenney slider sets the proportion (0 = Best, bright and clacky; 1 = Kenney, dark and rich). Modes: *Layered* (every hit plays from both sets, equal-power gains; the default), *Per hit* (one set per hit, chosen by the slider), *Auto* (both sets as one pool, chosen by hardness alone).
- **Hardness**: each material has a hardness 0 (felt) to 1 (glass) in `MAT_HARD`. A pair is `2ab/(a+b)` (the softer partner dominates), plus a bump for harder hits and for die-on-die, plus random wobble. The target picks clips of a similar *clack* score and loudness; any remainder is corrected with a lowpass or high shelf and a small pitch shift. Rough on purpose: the randomness is a feature.
- **Metal and glass ring**: struck metal and glass sing, which brightness alone cannot give. When the die is metal, or the surface is metal or glass (die on die: the die only), `ringFor` adds a few decaying sine partials on top of the sample hit. `RING` holds base pitch, loudness, partial ratios, gains and decays per material (metal uses free-bar ratios 1/2.76/5.4/8.93 around 1.75 kHz, glass wine-glass-like ratios 1/2.32/4.25/6.63 around 3.1 kHz). Pitch is fixed per material (+-3% per hit); upper partials only sound on hard hits; taps below speed 2.5 do not ring; at most 8 rings sound at once. The "Metal / glass ring" slider scales it (`state.ringAmt` 0..1, 0 = off, default 0.5; the effective strength is `ringAmt * 0.2`, because the useful range turned out to be the first 10% of an earlier 0..2 slider). Stone, wood and the rest do not ring.
- The surface a die lands on is a sound-only setting for now (`state.surfaceMat`, "Surface (for sound)" in settings). PD-100 (roll-feel presets) should bind its surface list to it.
- Stingers (nat 20 chime, nat 1 fumble) and the rolling rumble still come from the classic synth.
- Sample files load from `sounds/<set>/` (manifest.json + WAVs). The offline and artifact builds (`scripts/build-static.py`) embed them as `window.__SOUNDS`. A missing or broken set falls back to the procedural synth.

## Sample sets (`sounds/best`, `sounds/kenney`)
Single impacts cut from CC0 recordings by `scripts/build-sounds.mjs` (needs ffmpeg and the downloaded source packs; see the header comment for the layout and `CREDITS.md` for where to get them):

    FFMPEG=/path/to/ffmpeg node scripts/build-sounds.mjs <sources-dir>

It cuts throws into hits by onset detection, trims each clip to its first clear audio (first sample within 24 dB of the clip's peak), drops slow-attack and too-quiet clips, keeps a spread of loudness levels, and scores each clip's *clackiness* 0..1 (high-frequency share, brightness, short decay, little low body; ranked over all clips). Output: WAVs, `manifest.json` per set (clip lists plus `meta` {db, clack}) and `candidates.json` (everything, for the audition tool). Clips are WAV on purpose: no codec delay, and plays on iOS.

## Tuning tool: `tools/sound-audition.html`
Listen to every clip (waveform, loudness, clack score, how fast it starts), mark Keep/Drop, sort by loudness or clackiness, and throw simulated rolls with our own bounce model (dice count, bounciness, throw strength), the blend slider and modes, and a die/surface material pair. It uses the same hardness model and limiter as the app, and shows the output peak.

- From the repo: `python3 -m http.server 8123`, open `http://localhost:8123/tools/sound-audition.html`. It reads `sounds/` directly, so it is always current.
- As a single file / Artifact: `node scripts/build-sound-audition.mjs` writes `dist/sound-audition-artifact.html` with the clips embedded. Published copy: https://claude.ai/artifact/UBwHfpfJaXgRNsdSyqBJCX (republish to the same URL after changing sounds or the tool).
- The page duplicates the hardness model (`MAT_HARD`, `pairHard`, `hardnessFor`, the clip scoring and filter correction) from `index.html`. A test (`tests/sound.spec.mjs`) fails if the material table drifts; keep the rest in step by hand when you change the model.

## Open tuning work
Loudness matching across backends (`trim` per set), real stone/metal/glass hits and a rolling loop, samples for the stingers, and Keep/Drop pruning from listening sessions.
