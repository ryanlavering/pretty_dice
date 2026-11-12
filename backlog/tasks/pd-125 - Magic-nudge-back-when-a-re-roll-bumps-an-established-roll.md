---
id: PD-125
title: Magic "nudge back" when a re-roll bumps an established roll
status: To Do
assignee: []
created_date: '2026-11-12T17:46:00Z'
labels: []
dependencies: []
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sometimes a re-roll of a leaning die bumps a settled die into a new roll. In real play, that wouldn't be allowed (else you could aim at bad dice to improve your roll), and the proper response would be to reset the die to its previous established value. We should follow suit, recording the original established value, and adding a post-reroll action of picking up and correcting the rotation of the tipped dice. (Right now our reroll action is to re-record the changed dice, so the infrastructure is in place, the logic just needs reversing and some UI work to animate the replacement.)

If we can work out how to "magically" nudge the dice so they roll back to the correct face that would be really cool, but it may involve difficult tracking if the nudge spans multiple faces. If that's overcomplicated, levitate-free_rotate-replace is probably okay. Maybe a hybrid approach: nudge for one-face adjustments and lift and spin for multiple? I think that's what a real player would do.
<!-- SECTION:DESCRIPTION:END -->
