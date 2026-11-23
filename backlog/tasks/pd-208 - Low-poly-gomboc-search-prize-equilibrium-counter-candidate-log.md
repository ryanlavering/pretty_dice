---
id: PD-208
title: 'Low-poly gomboc search (prize): equilibrium counter + candidate log'
status: To Do
assignee: []
created_date: '2026-11-21T19:15:00Z'
updated_date: '2026-11-23T05:42:00Z'
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

## Round 3 findings (gomboc lane, 2026-11-21; docs/design/gomboc-spike.md sections 11-14 on branch v42-gomboc)
- Certified mono-monostatic polytopes: Schettini Gherardini arXiv:2609.07827 (P56946: F 56,946, E 170,832, V 113,888, C 341,664; P272971: C 1,637,814). Data: github.com/Tancredi-Schettini-Gherardini/certified_gomboc (not downloaded). Paper footnote says its 56,946-face body guarantees "at least $2.93", which equals 10^6/C, not the $10,000/C quoted by Wikipedia: prize statement UNVERIFIED, original announcement still to find. Author also offers 3*log10(56946/#faces) cents per improved record.
- Other bodies cited from that paper (not read): 21-face/21-vertex mono-monostatic 0-skeleton (point masses), 8-face/11-vertex minimal mono-unstable polyhedron, Reshetov 14-face monostable.
- Ridged physical-gomboc shape NOT reproduced: Varkonyi-Domokos explicit body (gomboc.eu/docs/100.pdf, Eqs 1-6, c~0.275, d<5e-5) is a near-sphere; commercial specimen geometry unpublished (Couey 2604.17120). Best verified shape stays "More pronounced body" (r_max/r_min 1.10).

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner 2026-11-22 (round 15 plan): the 194-face S=2 body will not morph into a gomboc (two distinct stable faces; would need a macroscopic turtle-back ridge on one side and matching puffing opposite). Start a fresh low-poly search with the current heuristics: exact checker arbiter, incremental optimiser, foot-point margin cost, strict exact convexity, weighted-CoM shift as secondary objective; structured seeds (elongated, ridge + opposite bulge, twist), 30-300 faces, many seeds.

Opus review 2026-11-22: homogeneous S=1 polyhedra are classical (Reshetov 14 faces); the open target is S=U=1 (record 56,946 faces). Round 14 has a homogeneous 92-face S=1 (U=11), re-verified independently. Conditions are linear in face offsets at fixed normals and CoM -> LP/Gauss-Newton formulation. Ranked experiments in docs/design/gomboc-findings.md (v4.2).
<!-- SECTION:NOTES:END -->
