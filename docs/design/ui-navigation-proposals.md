# Navigation and control model: proposals (PD-142.38, deliverable 2)

Status: 2026-11-14, for owner review. Built on [ui-controls-audit.md](ui-controls-audit.md). Mock-ups: [ui-navigation-mockups/index.html](ui-navigation-mockups/index.html) (open at `http://localhost:8136/docs/design/ui-navigation-mockups/`), with a picture of each: [A](ui-navigation-mockups/a-two-rooms.jpg), [B](ui-navigation-mockups/b-tab-bar.jpg), [C](ui-navigation-mockups/c-clear-mat.jpg).

**Recommendation: proposal A, "Two rooms"**, with the full-mat view from C kept as an option in the drawer. Reasons are in the comparison section. Five questions for the owner are at the end.

## What the audit says the design must fix

1. Seven round buttons sit on the mat in every mode. Two of them change meaning by view and one does nothing in a game.
2. Twelve kinds of button throw dice. Nine are on screen at once in the desktop roll view; the phone game view shows two copies of the same Roll.
3. Showcase/Roll has three switches; the bag has two doors; sound has two switches; saving the bag has three.
4. Reset camera exists only as a double-click.
5. The settings panel mixes die design, app settings and files, and stays the same in a game.
6. On phone the quick roll bar, result chips and round buttons fight for the lower third of the mat.

## Three parts every proposal shares

The proposals differ in how you move between screens. They share three parts, because the audit points at the same fix whichever navigation wins.

**Top strip.** One line at the top of the mat. Its middle shows the die name (design), the total (rolling) or the game status (game). Holding the middle gives the top-down view. That is today's game strip (PD-142.34) used everywhere, so the gesture has one home. The mat total stays hidden in games.

**Dock with one gold button.** One bar at the bottom of the mat holds the screen's single primary action, and it is the only gold button on screen.

| Context | Dock shows | Gold button |
|---|---|---|
| Free rolling | what is loaded, as a formula box: `2d6+3 · Thorn axe` | **Roll** |
| Game | the game's secondary actions (Bank 12, Cash out) and a hint ("2 held · tap dice to hold") | **Roll 3** / **Roll 5 under the cup**; disabled on a bot turn or pass-the-device screen |
| Design (A only) | Undo, Redo | **Randomize** |

Everything else that throws dice today becomes a way to *load* the dock, or a gesture:

| Today | Becomes |
|---|---|
| Quick bar Roll (R3) | the dock's Roll button; the formula box is the dock's box |
| Quick bar die chips (R4) | "Dice to roll" chips: tap d20 loads a d20, tap again makes it 2d20. They do not throw |
| Set lightning button, "Open and roll now" (R10, R11) | tapping a saved set loads it; one "Open" action |
| Game panel Roll, strip Roll, Scorecard Roll, "Roll N under the cup" (R6-R9) | the dock button, relabelled by the game |
| Panel Showcase/Roll "Roll" half, round mode button (R1, R2) | removed; the room switch does not throw |
| "Re-roll leaning" chip (R5) | stays: it is a fix-up for cocked dice, not a second roll button. Worded "Fix leaning dice" so it does not read as Roll |
| R key, Enter in the box, flick, shake | stay as gestures, all meaning "press the dock button" |

**One utility drawer.** A button marked with the paired circles. On first show it is a wide pill listing its contents, then it slides shut, per [ui-notes.md](ui-notes.md). Contents: Sound on/off, Reset view (new), Full view (hide the panel), Hints, and Pause spin while a design is showing. Five items, never one. The H key and long-press calm view fold into Full view. The panel's "Sound effects" checkbox goes; the sound detail sliders stay in settings.

Ring colours, tap-to-hold and the phone tab slot are unchanged in all three.

## Proposal A: Two rooms

One switch, **Design | Play**, always in the same place. Each room has three tabs in the panel slot. The phone's [Settings | Scorecard] slot becomes the room's tab row.

| Room | Tabs | Mat |
|---|---|---|
| Design | **Look** (shape, substrate, colours, numbers, relief, spin, export) · **Bag** (designs, files) · **Sets** (list and editor) | showcase camera, shelf, dock = Randomize |
| Play | **Table** (dice to roll, saved sets, roll feel and sound) · **Games** (setup; renamed **Scorecard** while a game runs) · **Log** | table camera, dock = Roll |

```
PHONE  Design room                PHONE  Play room, free roll       PHONE  Play room, in a game
+----------------------------+   +----------------------------+   +----------------------------+
|[Design|Play ]  D20 SWIRL (oo)|  |[Design| Play]    12    (oo)|   |[Design| Play] ANA 2 of 3 (oo)|
|                            |   |                 2D6+3      |   |      [4]     [2]           |
|          ( d20 )           |   |      [5]                   |   |           [3]              |
|                            |   |             [6]            |   |    ((6))        ((6))      |
|      [#][ ][ ][ ] shelf    |   |      (Fix leaning dice)    |   |                            |
| [<-][->]      [RANDOMIZE]  |   | [2d6+3 Thorn axe ] [ ROLL ]|   | [2 held ...     ] [ROLL 3] |
+----------------------------+   +----------------------------+   +----------------------------+
|  Look  |   Bag   |  Sets   |   | Table  |  Games  |   Log   |   | Table |Scorecard|   Log   |
|  SHAPE  d4 d6 d8 ... d20   |   | DICE  d4 d6 d8 d10 d12 d20 |   | Ones              1        |
|  SUBSTRATE  Solid Swirled  |   | SETS  [Thorn axe] [Fireball]|  | Sixes            12 <-     |
|  COLOURS ...               |   | ROLL FEEL  bounciness ---  |   | Chance           21        |
+----------------------------+   +----------------------------+   +----------------------------+
 (oo) = the drawer: Sound, Reset view, Full view, Hints, Pause spin

DESKTOP  Play room
+--------------------+---------------------------------------------------------+
| [ Design | Play ]  |                          12                        (oo) |
| Table | Games | Log|                        2D6+3                            |
| DICE TO ROLL       |              [5]                                        |
|  d4 d6 d8 d10 ...  |                          [6]                            |
| SAVED SETS         |                                                         |
|  [Thorn axe 2d6+3] |                                                         |
| ROLL FEEL          |          [ 2d6+3 · Thorn axe            ] [ ROLL ]      |
+--------------------+---------------------------------------------------------+
```

- **Design/Inventory vs Roll/Game:** the two rooms are the two halves the owner named. The switch only changes room; it never throws. A game in progress survives a visit to Design and the Play half shows a dot while one is running.
- **Where things live:** Games = Play, Games tab. Bag = Design, Bag tab (the full-screen sheet stays as its "expand" view on phone). Sets = Design, Sets tab to edit; Play, Table tab to load. Log = Play, Log tab. Settings = Look tab for the die, Table tab for roll feel and sound, drawer for Reset to defaults. Scorecard = Play, Scorecard tab, on desktop too (the floating panel goes). Quick roll bar = the dock box, with its chips in the Table tab.
- **Randomize** shows only in Design, so it can no longer change dice mid-game. Space follows the room: Randomize in Design, nothing in Play.
- **Round buttons left on the mat:** none. The mat has the strip, the dock and the drawer.
- **Cost: medium.** It reuses what exists: the `rolling` flag is the room, the phone tab row already works, and the game strip already is the status handle. New work is the dock, the drawer, sorting the panel into tabs, and moving the desktop scorecard and log into tabs.
- **Risks:** the Table tab is new content for roll view. Free rolling a single die is two taps (chip, then Roll) where it is one today.

## Proposal B: Tab bar

No rooms. A bottom bar on phone (a left rail on desktop) with fixed destinations: **Design · Bag · ROLL · Games · More**. Roll is the raised centre key and is also how you reach the table.

```
PHONE  Design                     PHONE  Rolling                    DESKTOP
+----------------------------+   +----------------------------+   +----+-------------+------------------------+
|       D20 SWIRLED          |   |            12              |   |Des |DICE TO ROLL |          12            |
|          ( d20 )           |   |      [5]      2D6+3        |   |Bag | d4 d6 d8 ...|    [5]                 |
|      [#][ ][ ][ ] shelf    |   |             [6]            |   |ROLL|SAVED SETS   |          [6]           |
+----------------------------+   +----------------------------+   |Gam | [Thorn axe] |                        |
|  SHAPE  d4 d6 d8 ... d20   |   | DICE  d4 d6 d8 d10 d12 d20 |   |    |ROLL FEEL    |        [ ROLL ]        |
|  SUBSTRATE  Solid Swirled  |   | SETS  [Thorn axe] [Fireball]|  |More|             |                        |
+----------------------------+   +----------------------------+   +----+-------------+------------------------+
| Design  Bag (ROLL) Games More| | Design  Bag (ROLL) Games More|
+----------------------------+   +----------------------------+
```

- **Design/Inventory vs Roll/Game:** not a split. Design and Bag are the inventory side, Roll and Games the play side, but they sit as four equal neighbours.
- **Where things live:** Games, Bag (designs and sets as sub-tabs), Design each have a key. Log and settings go under More or inside the Roll screen. Scorecard = the Games screen. Quick roll = the Roll screen's panel. The drawer is the More key, shown as a panel, so the pill-and-circles rule has nothing to apply to.
- **Single roll control:** the centre key. It is on screen in Design and Bag too, where pressing it leaves the screen and throws, which is today's round-button behaviour that the audit flagged.
- **Cost: large.** A new permanent bar and rail, five screens to define, the panel cut into per-screen content, and the phone loses about 56 px of height that the crowding bug shows it does not have.
- **Risks:** Roll always visible means "one roll button" holds, but it is a navigation key part of the time. Log has no natural key. The bar is a pattern from apps with five peers; this app has two modes with sub-pages.

## Proposal C: Clear mat

The mat fills the screen. One stack button (the paired circles) opens a grid with every destination and utility. The Roll dock is the only other control. Panels come up as sheets when asked for and go away again.

```
PHONE  rolling 20d4               PHONE  stack open                 DESKTOP
+----------------------------+   +----------------------------+   +-------------------------------+-----------+
|(oo)         48             |   |(oo)         12             |   |(oo)          12               | DICE ...  |
|  [3][1]  [4]  [2]  20D4    |   | +------------------------+ |   |                               | d4 d6 d8  |
|   [4] [1]  [3]             |   | | Design     | Bag & sets| |   |     [5]                       | SAVED SETS|
|     ((4)) ((3))  [2]       |   | | Games      | Roll log  | |   |              [6]              | [Thorn..] |
|  [1]   [2]   [4]           |   | | Sound      | Reset view| |   |                               | ROLL FEEL |
| (Fix leaning) (2 held)     |   | | Hints      | Settings  | |   |                               |  (close)  |
| [ 20d4            ] [ROLL] |   | +------------------------+ |   |  [ 2d6+3 · Thorn axe ] [ROLL] |           |
+----------------------------+   +----------------------------+   +-------------------------------+-----------+
```

- **Design/Inventory vs Roll/Game:** the camera follows the open sheet (Design or Bag sheet = showcase, otherwise the table). There is no visible switch.
- **Where things live:** all in the stack grid: Design, Bag and sets, Games, Roll log, Settings, plus the utilities. A running game brings its scorecard up as a half sheet.
- **Single roll control:** the dock, always, including over the showcase (Roll from a design view drops to the table).
- **Cost: large.** Every panel becomes a dismissible sheet with its own open, close and drag behaviour on two form factors, and desktop loses its always-open panel, which most desktop specs and guide pages assume.
- **Risks:** every destination is two taps and hidden until the stack opens. The owner's rule 4 allows a visible menu, but Design, Bag and Games are primary entry points and would all sit behind one button. Utilities and destinations share one menu, which blurs the "one utility drawer" idea.

## Comparison

| | A Two rooms | B Tab bar | C Clear mat |
|---|---|---|---|
| Owner's A/B split | yes, as the top-level switch | no, four peers | implicit, no switch |
| One utility drawer with pill and circles cue | yes | becomes a "More" screen | merged with navigation |
| One roll button on screen | yes; none in Design | yes, but it is also a nav key | yes |
| Taps to any screen from anywhere | 2 at most (switch, tab) | 1 | 2 (stack, item) |
| Screens visible without opening anything | both rooms and three tabs | five keys | none |
| Controls on the mat besides dice | strip, dock, drawer | strip, drawer | stack, dock |
| Phone height given up | none (tab row replaces today's) | about 56 px for the bar | none; gains the panel's half |
| Fixes 20-dice crowding | partly; fully with Full view | no | yes |
| Fits today's code | closely (`rolling` flag, phone tabs, game strip) | new shell | new sheet system |
| Specs to rework (27 specs today) | 10 to 14, mostly selectors | most that touch navigation | most desktop specs |
| Guide pages to redo (10) | 6 already flagged by the guide lane | 8 or more | 8 or more |
| Slices to land | about 7 | about 10 | about 10 |

## Recommendation

**A, Two rooms.** It is the owner's split made complete: two rooms, three tabs each, one strip, one dock, one drawer. Every screen has one address ("Play, Log"), so the guide and the playtest brief can say where things are in a sentence. It removes all seven round buttons, and it brings the roll buttons on screen from nine to one without removing any ability. It is also the cheapest, because the app already behaves this way underneath.

Two things to borrow from the others:

- From C: **Full view** in the drawer hides the tab panel so the mat fills the phone screen, and remembers that choice in the Play room. That answers the 20-dice case without giving up visible tabs for everyone else.
- From B: nothing structural, but its lesson holds for A's switch: keep it in one fixed place on both form factors (strip left on phone, panel head on desktop) and never let it throw dice.

B is the fallback if the owner finds two levels (room, then tab) too deep in practice. C is worth revisiting only for a phone-first rebuild.

## Questions for the owner

1. **A, B or C?** (Recommended: A plus Full view.)
2. **Die chips load or throw?** Recommended: load only (tap d20, then Roll), which keeps exactly one roll button but costs a second tap for a quick single die. The alternative keeps one-tap chips and accepts that they are roll buttons.
3. **Room names:** "Design | Play" (recommended), or keep "Showcase | Roll"?
4. **Desktop scorecard:** move into the left panel's Scorecard tab (recommended, one home on both form factors), or keep the floating panel on wide screens?
5. **Randomize as the Design room's gold dock button** (recommended), or leave it at the top of the Look tab and give Design no dock?
