# Project review, roadmap and test plan (2026-11-14)

Status: review written 2026-11-14 at v4 head `efbd1bb`, with the owner's decisions of the same day folded in. Based on the docs, the backlog, the test and CI config, the playtest 1 log and a light competitor search. The test suite and the app were not run for this review. Market and revenue figures are estimates, not data.

Related: [v4-roadmap.md](v4-roadmap.md), [testing.md](testing.md), [manufacturing-plan.md](manufacturing-plan.md), [games-engine.md](games-engine.md).

## Owner decisions (2026-11-14)

1. **Games in 4.0:** five games stay: the Yahtzee-style game, the Farkle-style game, Pig, Craps and Liar's Dice. Shut the Box, Ship Captain and Crew and Bunco are dropped for now.
2. **Names:** any game whose name is a trademark gets a non-trademark name in the app.

How decision 2 applies (see "Game names" below): Yahtzee becomes **Yacht**. Farkle becomes **Ten Thousand** (owner confirmed 2026-11-14). Pig, Craps and Liar's Dice keep their names.

## 1. Niche and value proposition

Rolling dice is a commodity. App stores hold many ad-funded 3D rollers and Yahtzee-style apps. For tabletop players, D&D Beyond sells digital dice sets (about $6-15 each in the listings found), dddice sells artist-made themes with VTT integrations, and Foundry and Roll20 have 3D dice built in.

Designing dice is not a commodity. The search found no other free, in-browser procedural dice designer with this material range (swirl, epoxy with inclusions, stone, filigree, relief) together with physics and real-sample sound. The nearest is Hero Forge's dice maker, which exists to sell physical dice (from $39 per die at its 2025 Kickstarter).

**Value proposition:** design dice you would want to own, then roll them. No install, works offline, open source.

**Risk in v4:** built-in games are the most crowded segment. They are worth having as a showcase for the dice, not as the reason to come. That is why the 4.0 list is cut to five.

## 2. Popularity and profit

**Realistic expectation:** a well-liked niche tool. A good launch (r/DnD, r/dice, Show HN) could bring thousands of visits and a few hundred to low thousands of returning users. Revenue is most likely $0 to a few hundred dollars a month from tips. The ceiling is higher only if a physical-dice path works, and Hero Forge is already there with its own colour printing.

Steps, in order:

1. **A public URL.** No public deployment was found; the README says to serve the folder locally. Add hosting, a domain and a landing page.
2. **A sharing loop.** A design in a link, a gallery of presets, transparent and turntable export (PD-21).
3. **Go where players are.** An OBS overlay first, then an Owlbear Rodeo or Foundry extension.
4. **Measure, then monetise.** Privacy-friendly analytics and a tip jar. Later, a "send this design to a dice maker" handoff per the manufacturing plan.

Not recommended: paid feature packs (hard to sell for an Apache-2.0 single file), ads, or accounts and servers before demand shows.

## 3. History and roadmap

Three releases (1.0 on 2026-11-09, 2.0 on 11-11, 3.0 on 11-13), 309 commits and 223 cards in five days. The bottleneck is owner review, not building: about 25 cards are in Needs Review and 15 in Review Complete.

| Version | Theme | Contents |
|---|---|---|
| 4.0 | Game table | Yacht, Ten Thousand, Pig, Craps, Liar's Dice, polished. Hold dice, advantage and keep-highest notation, quick roll bar, log labels, advanced-control labels, render-on-demand and a pixel-ratio cap. |
| 4.1 | Out in the world | Public hosting, PWA, share-by-link, preset gallery, export for sharing, first-run onboarding, a pass on real devices. |
| 5.0 | At the table (RPG) | Characters (PD-73), attack + damage (PD-90), hidden DM rolls, initiative, table lookup, dice jail (PD-105). |
| 6.0 | Shared table | Rooms where everyone sees the roll, stream overlay, VTT integration. |
| Future | | STL/3MF export (PD-23; needs true relief, PD-80), custom faces (PD-127), d24/d30 (PD-16), tray, dice cup, coins, the three dropped games. |

**Missing from the board**
- Roll statistics, and the fairness test (PD-20.6 is deferred; it is cheap and builds trust).
- Accessibility: announced results, reduced motion, colour-blind checks.
- A backup warning, since the bag lives only in localStorage.
- Splitting `index.html` (365 KB, edited by three lanes at once) into modules.

**Proposed cuts and deferrals (not yet decided by the owner)**
- Lite 2D fallback (PD-142.12): a second UI to maintain for few devices. Defer.
- Sound sets: five sets and three blend modes could become Blend plus one synth fallback.
- Weighted dice (PD-74): undermines trust in the roller. Drop.
- Games research cards PD-142.18 to .26: move to Future.
- Cosmetic cards PD-79 to 86 to Future; PD-52 is superseded by PD-114 and PD-132.

### Dropping the three games

"For now" means out of the app, kept in the repo. Proposed way:
- Take `shutbox`, `shipcaptain` and `bunco` out of the engine registry in `games/core.js` and out of the picker list in `index.html`; leave the module files and their bot strategies in place.
- Mark their tests skipped with a reason (`tests/games-extra.spec.mjs`, three tests in `tests/games-turn-ui.spec.mjs`, the bot cases in `tests/games-bots.spec.mjs`). `tests/games-phone.spec.mjs` uses Shut the Box as its example and needs another game.
- Remove them from `docs/guide/10-games.md` and `docs/guide/README.md`; mark them parked in `games-engine.md`.
- PD-142.27 (their engines, Needs Review) moves out of the v4.0 milestone.

### Game names

| Game | Finding | Name in the app |
|---|---|---|
| Yahtzee | Registered Hasbro trademark, listed as live. | **Yacht** (the older public-domain game). The five-of-a-kind category and its bonus need new labels too. |
| Farkle | PlayMonster (formerly Patch Products) owns Farkle-family marks such as FARKLE FRENZY. The status of the bare word was not confirmed. | **Ten Thousand** (a traditional name for the game). Owner confirmed 2026-11-14. |
| Pig | Traditional name. No trademark search was done for it. | Pig |
| Craps | Traditional name. No trademark search was done for it. | Craps |
| Liar's Dice | Traditional name (Perudo is the commercial brand). No trademark search was done for it. | Liar's Dice |

This is not legal advice. Keep the internal ids (`yahtzee`, `farkle`) so saved games and preferences still load; change display names, UI strings, the guide and the tests that assert them. The old names should not appear in the UI or the guide.

## 4. Test plan

**Where it stands**
- 256 tests in 31 specs, all Playwright on software WebGL, Chromium only.
- A full local run takes about 30 minutes (checkpoint 10: 251 passed, 6 flaky).
- The nightly "slow" CI job matches no files (`tests/slow/` does not exist), so it runs nothing.
- The visual spec (PD-20.2) is not written.
- Branch `feat/pd-20.7-ci` holds an unmerged commit that reports tests three times faster and no CI hangs.
- `retries: 1` hides flaky tests.
- `test:quick` selects partly by file name, so new cheap specs are easy to leave out.

**Four tiers**

| Tier | Budget | When | Contents |
|---|---|---|---|
| Unit (`test:unit`) | under 30 s | every edit | Pure Node, no browser, no machine lock. The games engine is already written this way. Move the notation parser, bag model and design migration into modules to join it. |
| Quick (`test:quick`) | under 5 min | every change | Unit, plus shared-page tests tagged `@quick`, plus one boot smoke. Selected by tag only. Picks extra specs from the changed paths (`games/` → games specs, `sounds/` → sound spec). The script fails if the run passes 4 minutes. |
| Batch (`test:batch`) | 15-30 min local; about 6 min in CI with 3-4 shards | checkpoints, pushes to `v4` | The full functional suite. Prints the flaky list and fails if it grows. |
| Release (`test:release`) | hours, overnight | nightly and before a tag | See below. One report at the end. |

**Release tier contents**
- Visual baselines in Docker (PD-20.2); perf and leak checks (PD-20.5).
- Fairness chi-square (PD-20.6) and thousands of seeded rolls per shape.
- Bot-versus-bot full games in Node, with invariants (scores add up, every game ends).
- Saved-storage fixtures from 1.0, 2.0 and 3.0 loaded into the current build.
- Phone, tablet and desktop viewports; WebKit and Firefox as well as Chromium.
- Offline build, artifact build, the live-CDN check, guide screenshot drift (`npm run guide`).
- One headed run on a real GPU, since everything else runs on software GL.

**Order of work**
1. Land `feat/pd-20.7-ci`.
2. Add the four `npm` scripts and make tags the only selector.
3. Fix the empty nightly job.
4. Add the time budget check and the flaky report.
5. Fill the release tier, cheapest first: bot games, storage fixtures, fairness, then visual and browsers.

## Sources

- [dddice themes docs](https://docs.dddice.com/docs/guides/themes)
- [Hero Forge custom dice (Wargamer)](https://www.wargamer.com/dnd/hero-forge-custom-dice)
- [Hero Forge dice Kickstarter (GamingTrend)](https://gamingtrend.com/previews/roll-for-initiative-hero-forge-launches-custom-dice-kickstarter-march-6th)
- [D&D Beyond Pigment dice pack](https://marketplace.dndbeyond.com/digi-dice/DCE-00300)
- [D&D Beyond digital dice sale post](https://www.dndbeyond.com/posts/1175-live-now-an-epic-digital-dice-sale-and-a-new-dice)
- [Dice Roller 3D: Yahtzee, Ludo (App Store)](https://apps.apple.com/us/app/id6504456544)
- [YAHTZEE registration 72006734](https://markinton.com/trademark/yahtzee-72006734)
- [PlayMonster Group trademarks (Justia)](https://trademark.justia.com/owners/playmonster-group-llc-5385185)
