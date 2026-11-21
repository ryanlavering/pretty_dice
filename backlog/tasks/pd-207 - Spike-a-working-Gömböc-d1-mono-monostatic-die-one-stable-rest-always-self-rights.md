---
id: PD-207
title: >-
  Spike: a working Gömböc d1 (mono-monostatic die: one stable rest, always
  self-rights)
status: In Progress
assignee: []
created_date: '2026-11-21T16:12:00Z'
updated_date: '2026-11-21T16:42:00Z'
labels:
  - v4.3
dependencies: []
priority: low
ordinal: 400000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea (2026-11-21): can we make a working Gömböc d1? A Gömböc is a smooth convex homogeneous body with exactly one stable and one unstable equilibrium (Várkonyi & Domokos 2006). As a die it has one 'face' (always rolls 1) and the fun is the wobble and self-righting behaviour. Feasibility notes: the physics engine is cannon-es with CANNON.ConvexPolyhedron (faceted hull), and every facet of a faceted approximation is itself a stable rest, so a polyhedral Gömböc only works if the facet count is high enough that the spurious stable facets are negligible (or if the facets are tilted so none of them are stable: Bezdek's 14-face monostable polyhedron and Conway-Guy's 19-face one exist but are extremely thin/flat). Real Gömböc flatness is small (a few %), so numerical precision and convex hull tolerances matter. Spike plan: (1) find the published radial parametrisation and verify numerically that it has exactly 1 stable + 1 unstable equilibrium (sample the distance-from-centre-of-mass function over the sphere, count minima/maxima/saddles); (2) a standalone spike page (tools/gomboc-spike.html) that renders the surface and rolls it on a plane with its own rolling-body integrator, to see it wobble and self-right; (3) test whether the surface meshed at N vertices inside cannon-es ConvexPolyhedron still self-rights (how many spurious stable facets at N=200/500/1000?), and whether a custom support-function shape is possible; (4) report whether it can ship as a novelty die (d1 shape option in Look, result always 1, maybe a quirky sound) or only as a tool page.
<!-- SECTION:DESCRIPTION:END -->

## Owner (2026-11-21)
Wants an experimental spike and a PLAYABLE SAMPLE when available (artifact page). Lane v42-gomboc (Sonnet, research allowed) builds tools/gomboc-spike.html (self-contained, CDN libs only) and docs/design/gomboc-spike.md; sample published as an artifact for the owner to play.
