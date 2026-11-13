# Changelog

User-facing changes. Versions are git tags.

## 3.0 (unreleased)

### New
- **A new sound engine.** Impacts are short recordings of real dice (public-domain CC0 sources, credited in `sounds/CREDITS.md`) chosen by how hard each die hits. Pick a **Sound set** in settings: **Blend** (the default), **Kenney samples**, **Best-of samples**, **Procedural synth** or the **Classic synth**, and switch while you roll. **Audition** plays a sample roll.
- **Best ↔ Kenney blend.** The slider mixes the bright, clacky recordings (wood, plastic) with the darker, richer ones (felt, leather). *Layered* plays every hit from both sets, *Per hit* picks one set for each hit, *Auto* chooses by hardness.
- **Surface (for sound).** Pick felt, carpet, leather, cardboard, wood, plastic, stone, metal or glass. Together with the die material it sets how sharp each hit is, so stone on glass clacks brightly and plastic on felt thuds softly. It changes the sound only, not how the dice roll.
- **Metal / glass ring.** Metal dice, and metal or glass surfaces, ring when struck, more strongly on harder hits. A slider sets the amount (0 is off).
- **Spatial width (stereo).** Each hit is placed left or right by where it lands in the view, and is quieter and duller the farther it is from the camera. 0 is mono; the default is half. It shows on headphones or stereo speakers.
- **Rolling sound.** Soft ticks as each die tumbles across the mat, played with the same sounds and the same stereo placement as impacts. Off by default.
- Overlapping hits are limited so a big roll cannot clip.

### Changed
- **The rolling rumble is gone.** The continuous low noise sounded like wind on a phone microphone. The option is now **Rolling sound** (see above).
- Turning sound on no longer plays a blip (the Test sound button still does).
- The offline copy and the artifact build carry the sound samples inside the file.

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
