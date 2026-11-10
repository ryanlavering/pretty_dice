---
id: PD-53
title: 'Offline support: vendor/ fallback and single-file static build'
status: Needs Review
assignee: []
created_date: '2026-11-10T02:08:00Z'
labels:
  - infra
dependencies: []
priority: medium
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
index.html tries the CDN (3 s HEAD check) and otherwise loads three.js 0.160.0, its addons, cannon-es 0.20.0 and the latin font subsets from vendor/ (about 1.9 MB, licences recorded in vendor/README.md). ?libs=local|cdn forces a mode. scripts/build-static.py writes dist/pretty-dice-offline.html (2.9 MB, everything embedded as data: URLs, GLTFLoader patched to use the import map) that runs from file:// with no network. Verified in headless Chrome: online, CDN blocked over http, and all network blocked on file:// (undo test, roll, OBJ/STL loaders). Not verified in Firefox/Safari. Browsers will not load ES modules from file://, so vendor/ needs a local web server while the single-file build does not.
<!-- SECTION:DESCRIPTION:END -->
