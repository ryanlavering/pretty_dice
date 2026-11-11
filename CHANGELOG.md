# Changelog

User-facing changes. Versions are git tags.

## 2.0 (2026-11-11)

### New
- **Roll feel & sound** section: **Bounciness**, **Dice friction** and **Mat friction** sliders. The defaults are slipperier, so dice slide apart instead of snagging. The section moves to the top of the settings pane while you roll.
- **Leaning dice are flagged.** A die resting propped on another, or balanced on an edge, gets an orange ring on the mat and a warning. **Re-roll leaning** drops only those dice in again from above. Nothing hops or nudges on its own.
- **The roll tray is sized from the dice**, by their count and size, instead of from the screen. The camera starts far enough back to show the whole tray, and zoom works freely on top. Standard 7 and big custom sets have room.
- **Showcase and Roll have separate cameras** (angle and zoom), so repositioning one leaves the other alone.
- **Layout toggle:** hide the settings for a full-screen view and bring them back with one button. Settings are visible by default; on a phone they sit under the view.
- **Toolbar along the bottom of the view:** layout toggle, sound, pause/play for the spin, control hints (ⓘ) and the Showcase/Roll switch. The hint text lives behind ⓘ.
- **Sound button on the view.** Sound is now **off by default**; turn it on when you want it. The continuous rolling rumble is a separate option (off by default). **Test sound** plays a blip and reports the audio state.
- **Shared colors:** the three base colors are kept when you change substrate or stone type. A shuffle button beside the swatches re-rolls only the base colors; a paintbrush button next to the stone type paints in that stone's natural colors.
- **Number size from 0.45 to 5 times the face** on a log slider. Big sizes are cropped by the face edges.
- **Clear button** for the custom set: back to a single d20.
- **Spin speed** moved into a Showcase section in settings; the pause button stays on the view.
- Randomize sits in one row with Undo / Redo, with an "Also randomize substrate / shape" line under it. The Export section is now **Save & export**.

### Fixed
- **Load design works on phones.**
- **iPhone:** tapping a text field no longer zooms the page in and cuts off the play field.
- **iPhone sound:** it plays with the ring/silent switch on silent, and wakes up again after you switch apps.
- Toggling the layout on a phone no longer leaves the view pushed up with its title cut off.
- Zoom in the roll view works again; zooming out no longer clips the back of the table.
- A result and a natural 20 effect no longer stay on screen after a die balanced on an edge tips over onto a different face: the dice are read again.
- Rolls that could stall are guarded: an error in one frame can no longer stop the display, a roll that never settles is finished after 25 seconds, and returning to the tab restores audio and size.
- A single die can no longer be left leaning on nothing; the d4 numbering at the corners is the default.

### Under the hood
- A Playwright test suite with CI (`npm test`), covering the physics, the settings and the phone layouts. See [docs/design/testing.md](docs/design/testing.md).

## 1.0 (2026-11-09)

First tagged version: procedural polyhedral dice with swirl, metal, epoxy and stone substrates, numbers, relief and filigree, physics rolling, and design files.
