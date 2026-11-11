---
id: PD-58
title: Occasional hangs; switching away and back fixes it
status: Done
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-11T07:04:00Z'
labels:
  - bug
  - perf
dependencies: []
priority: high
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
App occasionally hangs; switching to another app/tab and back sometimes recovers it. Suspect rAF/visibility handling or a physics-step stall. Profile and reproduce.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cause identified and fixed or documented
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 investigated; owner has not seen it recently, so it may be fixed or transient. Could not reproduce. Physics is not a CPU hazard (set7 / 20d6 steps ~0.3 ms mean, max ~3 ms). Plausible causes found and hardened: (1) an exception in one frame ends the render loop for good (three.js stops scheduling frames after a throwing callback) -> frame body now wrapped in try/catch (logs up to 3 errors); (2) a roll that never settles -> watchdog finishes any roll after 25 s; (3) rescue attempts (tip / drop-in) tripped the 12 s settle fallback at once on late rolls -> they now restart the wait (rollT capped at 4); (4) coming back to the tab: visibilitychange drops the long clock gap, resumes a suspended AudioContext and re-measures the stage. Test: ?test=watchdog. If it recurs, note what was on screen (rolling? which shape/count?) and whether the console shows 'frame error'.

Owner approved 2026-11-10 as safeguards; merged to main.

Rebased onto main after the PD-20 test suite landed; old ?test=watchdog hook replaced by specs: physics.spec 'a roll that never settles is finished by the 25 s watchdog' (needs the new __pd.rollT setter) and smoke.spec 'the render loop survives a frame that throws'. npm test: 47 passed, 3 flaky-then-pass (2 pre-existing logic specs under load, plus the watchdog spec once; 6/6 clean when run alone).
<!-- SECTION:NOTES:END -->
