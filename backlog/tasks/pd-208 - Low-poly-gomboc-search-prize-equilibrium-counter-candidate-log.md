---
id: PD-208
title: 'Low-poly gomboc search (prize): equilibrium counter + candidate log'
status: To Do
assignee: []
created_date: '2026-11-21T19:15:00Z'
labels:
  - v4.3
dependencies: []
ordinal: 401000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner: there is a prize for a low-poly shape that acts as a gomboc. Not searching yet; set up for it. Reusable equilibrium counter (vertex list in, stable/unstable equilibria out, uniform density) in tools/gomboc-spike-verify/, and a 'Low-poly search log' section in docs/design/gomboc-spike.md recording every candidate tried, its vertex/face count and equilibria, including negative results. Prize rules and links to be added to the log (cite source). Follows PD-207.
<!-- SECTION:DESCRIPTION:END -->

## Prize rules (owner, 2026-11-21; checked against Wikipedia "Gömböc")
Prize offered by Domokos and Várkonyi (Wikipedia; footnote: Rehmeyer, "Can't Knock It Down", Science News, 5 April 2007, not read) to anyone who finds the minimal numbers F, E, V of faces, edges and vertices of a mono-monostatic polyhedron. Amount: $10,000 / C, where mechanical complexity C = F + E + V - 2. Simpler polyhedron = bigger prize. Terms beyond that, and whether it was ever awarded, are unknown; the original announcement is still to be located. Note S + U - H = 2 (stable + unstable - saddle) is the equilibrium count identity our counter checks; C = F + E + V - 2 is the complexity to minimise, so the search log should record F, E, V and C for every candidate polyhedron (uniform density, one stable face, one unstable vertex).
