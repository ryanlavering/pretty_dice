---
id: PD-89
title: Amethyst, tiger's eye, opal
status: Done
assignee: []
created_date: '2026-11-10T17:32:00Z'
updated_date: '2026-11-12T03:32:00Z'
labels: []
dependencies: []
priority: low
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Additional stone types.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: Amethyst (purple zoning, quartz veils), Tiger's eye (fibres and chatoyant bands), Opal (milky or black body with play-of-colour patches) added as stones; shader ids 8-10, turquoise stays the fallback. Checked visually (swiftshader); retune with real GPU if needed.

2026-11-11 owner feedback: opal great; tiger's eye reworked (brushed-metal sheen: metalness .55, brush .18; wider, more irregular, higher-contrast bands). Choosing a stone in the dropdown now brings in that stone's natural colours (reverses the PD-94 keep-colours rule; the paintbrush draws again from the same stone).

2026-11-12 review comment addressed: amethyst now has deeper violet zoning, brighter inner pockets and crisp pale quartz veins (two vein sets), lower roughness and higher coat. True translucency not added: the PD-87 spike showed transmission muddies the look and costs a render pass. Tiger's eye stripes are closer to the original shape (mild warp, run across the stone with the brushed grain), mostly dark brown with gold crests, plus dark lowlight streaks between stripes and a darker base palette.

2026-11-12 owner: tiger's eye much better, amethyst better; upper half of the swirl scale was too busy for tiger's eye. Now the effective pattern scale is squeezed above 1.4 (slider 3.5 gives 1.82), so the stripes stay clean across the whole slider. Other stones keep the full range.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Ryan
created: 2026-11-12T00:20:00Z

---

Amethyst is a little weak; probably due to lack of translucency. Swirls with more "veins" would probably read better.
Tiger eye swirl pattern needs to be a little more toward original stripe shape (semi-aligned with metalic "grain"). Needs more dark lowlights.

---
<!-- COMMENTS:END -->
