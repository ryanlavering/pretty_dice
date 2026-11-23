---
id: PD-222
title: >-
  build-static.py: guard against multi-declarator exports (export const a=...,
  b=...) in src/ modules
status: To Do
assignee: []
created_date: '2026-11-23T22:18:00Z'
labels:
  - v4.3
  - tooling
dependencies: []
ordinal: 415000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The artifact bundler collects exports with a regex that only sees the first name of 'export const a=..., b=...'. A second name is silently undefined in the bundle while dev servers and ?lite runs (real ES modules) work. Found when the Gomboc d1 (v42-gomboc-die) threw 'apex is not iterable' only in the artifact build and kicked the app back to the design room. Add a check in scripts/build-static.py that fails the build (or splits the declarators) when a multi-declarator export is found; add a test that builds the artifact and fails on it.
<!-- SECTION:DESCRIPTION:END -->
