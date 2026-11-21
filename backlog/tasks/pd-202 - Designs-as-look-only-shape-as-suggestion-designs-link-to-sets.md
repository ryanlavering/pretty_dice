---
id: PD-202
title: 'Designs as look only: shape as suggestion, designs link to sets'
status: To Do
assignee: []
created_date: '2026-11-21T00:26:00Z'
updated_date: '2026-11-21T00:29:00Z'
labels:
  - v4.2
dependencies: []
priority: high
ordinal: 395000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea (RC thread on PD-197): apply only styling when picking a design (also in Design), treating the design's default shape/formula as a suggestion; formulas should live in sets, and a design could include several default sets (loading the design also populates/offers its sets). Opinion given in the thread: split 'design = how dice look, set = what you roll'; show a 'Suggested: d20' chip instead of silently swapping shape; link sets with a prompt, never overwrite edited sets, skip/ask on name clash; trade-off: one more tap to reproduce a shared design exactly (optional 'Load design and its sets' action). Open question for owner: with several linked sets, make the default set active on pick, or only add chips and leave the current formula (lean: leave alone). 4.1 only does: Bag pick in Play changes the look only (PD-197).
<!-- SECTION:DESCRIPTION:END -->

## Owner decisions (RC thread, 2026-11-20)
- Picking a design NEVER touches the current formula; only the look changes. If the user wants a formula they pick the set.
- Direction of the link is reversed from the first idea: a SET may optionally reference a design (picking the set can bring its look along); a design does not need to carry sets. Drop the 'default set' idea.
- Open detail for 4.2 start: if a set names a design and the user has since restyled, apply the set's design every time (lean) or only on opt-in, with a way to turn it off.
- 4.2, high priority. 4.1 only does PD-197 (room return; look-only pick in Play).
