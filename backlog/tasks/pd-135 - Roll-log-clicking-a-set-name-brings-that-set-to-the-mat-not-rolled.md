---
id: PD-135
title: 'Roll log: clicking a set name brings that set to the mat (not rolled)'
status: Review Complete
assignee: []
created_date: '2026-11-13T06:11:00Z'
updated_date: '2026-11-13T08:09:00Z'
labels: []
milestone: m-0
dependencies: []
ordinal: 142000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner request: in the roll log, clicking the set name places that set's dice on the mat at rest, like selecting the set in the set view. Entries now store the set id (older entries match by name); a set that no longer exists is plain text. The panel closes on click.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done in index.html (renderLog, logRoll stores setId); test 'clicking a set name in the roll log brings that set to the mat without rolling it'.
<!-- SECTION:NOTES:END -->
