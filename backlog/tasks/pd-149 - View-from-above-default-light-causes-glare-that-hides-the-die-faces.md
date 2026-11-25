---
id: PD-149
title: 'View from above: default light causes glare that hides the die faces'
status: In Progress
assignee: []
created_date: '2026-11-18T07:44:00Z'
updated_date: '2026-11-22T17:18:00Z'
labels:
  - v4.3
dependencies: []
priority: medium
ordinal: 335000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (thread 2ac3daf9, 2026-11-18): 'in view from above, the default light position makes it very hard to see the die faces because of glare. A different light angle or some other adjustment to avoid that glare is necessary.' Not 4.0 unless easy, otherwise early 4.1. Options: move the key light off-axis only while the top-down hold is active, or soften specular on the faces in that view. Settings lane: after .38.58, spend a short time-boxed look and report effort in the REVIEW post; if the fix is a small, isolated change confined to the top-down view (e.g. light offset while the handle is held), it may go into 4.0; else leave labelled v4.1.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Settings agent look 2026-11-18: no code change. Single DirectionalLight (3,6,4)x1.6 plus RoomEnvironment env reflections of overhead panels into the overhead camera; fix = while topBlend>0 move/dim the key and fade envMapIntensity, needs visual iteration per substrate. Stays v4.1.

Owner review 2026-11-21: does not like the washed-out look of the matte rework (9874851); the problem is the lighting angle combined with the camera, not the dice presentation. New approach: an exploration artifact with a sticky Default/Top view toggle and adjustable light positions, to find a good top-view lighting; then either use those lights all the time or fly the lights between roll-view and top positions on toggle/hold. OK to slip to 4.3 if not settled soon (then revert the matte rework commits bb146a6 and 9874851 for 4.2 so the release ships the old look).

Lighting lab (2026-11-21): artifact https://claude.ai/artifact/2Vsxbh3Fvcz9XFMBufBiYs, branch v42-lighttune (a155c80, 6605c6b; build with build-static.py --artifact --lights; NOT on v4.2). Lane finding: the 4.2 matte rework (topGlareOn: zero specular/clearcoat/sheen, roughness up, key down) is the washed-out part. First-pass best look: matte OFF + key (-3,3.5,5) intensity 1.7 white, fill directional (4,5,-2) 0.35, env intensity 0.6 rotated y=2.4 rad, ambient 0, exposure 1.5 (the lab button 'Load suggested top lights'); tested on one copper d20 only. Env rotation is not tweened (swaps at blend 0.5). Waiting for the owner to tune and Copy settings.

Owner 2026-11-22: slips to 4.3. Revert of bb146a6 + 9874851 on v4.2 in progress. Resume from the lighting lab (v42-lighttune 6605c6b, suggested top lights recorded earlier).
<!-- SECTION:NOTES:END -->
