#!/usr/bin/env python3
"""Build the release checklist page (integrator-owned).

usage: python3 scripts/release-checklist-4.2.py OUT.html [--version 4.2]
Card status/priority/title come live from backlog/tasks in this checkout and the
(4.2 cards live on this branch); the release gates below are edited by hand
(done = True) as they are completed.  Publish OUT.html with the Artifact tool
(same url each time).
"""
import glob, html, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOTS = [os.path.join(HERE, '..')]

GROUPS = [
  ('A. Designs, sets and game looks (the 4.2 headline; review on the RC)', ['PD-202', 'PD-206', 'PD-190', 'PD-188']),
  ('B. Physics and view', ['PD-201', 'PD-149']),
  ('C. Roll notation and quick roll box', ['PD-142.42.1', 'PD-142.2', 'PD-142.42.2', 'PD-142.42.3', 'PD-142.42', 'PD-198']),
  ('Carried over', ['PD-20.7']),
  ('Gomboc research and filed follow-ups (not blocking the release)', ['PD-207', 'PD-208', 'PD-209', 'PD-210', 'PD-211']),
]

# (gate, done, note)
GATES = [
  ('Design memo approved (designs are looks, draft kinds, sets name a design, lobby hold)', True, 'docs/design/designs-sets-model.md; owner answered Q1/Q2/Q4 yes, Q3/Q5 default'),
  ('S1 look-only picks + Suggested chip (PD-202)', True, '2a45428'),
  ('S2 sets can name a design (PD-202)', True, '09079e2'),
  ('S3 lobby dice for every game, bag.hold (PD-206)', True, 'be02a88; P4/P5/P6 fixed; Games-screen label golden value re-recorded as approved'),
  ('S4 game look is a real draft (PD-190)', True, '0cbdb91 + 77cdd4e (draft flag restored after a game)'),
  ('S5 Yacht Use d6 pips (PD-188)', True, '3a5c20e + ad548b8; golden screens re-recorded as approved (new row)'),
  ('S6 guide pages, CHANGELOG, screenshots', True, '60e0443; update again for reroll, history, glare'),
  ('PD-201 dice settle: cocked dice topple, hop-free rest at default gravity', True, '52b9cd7 + 5a21b5c; four golden files re-recorded as approved'),
  ('PD-149 top-down glare: matte rework landed; owner eyeballs it on the device', True, '9874851 (first pass bb146a6 was still glary); epoxy/metal contrast moderate, owner check pending'),
  ('PD-142.42.1 per-die reroll shorthand r landed', True, '4fb69fc; re-evaluate from the seeded stream; PD-142.2 audit: only exploding dice missing'),
  ('PD-198 quick roll history landed', True, '7c9f12f'),
  ('Decide: PD-142.42.2 longhand and PD-142.42.3 chained rolls in 4.2 or 4.3', False, 'larger, design draft docs/design/roll-triggers.md; owner call'),
  ('Full suite green on the release candidate (two clean runs, --retries=0)', True, 'CHECKPOINT E @7c9f12f: 679/679 twice, 0 failed (17.6 and 16.9 min). Earlier checkpoints found and fixed: nav-rooms restore (test), game-look-pips isolation (test), active.draft restore after a game (app, 77cdd4e)'),
  ('Golden set stable (only owner-approved re-records)', True, 'approvals: PD-201 four files, S3 label, S5 pips row'),
  ('Review build of the tested head for owner review (Dev artifact)', True, 'v24 at 7c9f12f: https://claude.ai/artifact/RxfqVoxXtRYJNvdXpR8MR2'),
  ('Release candidate artifact (review flag stripped, 4.2 release tour: owner picks highlights first)', False, 'tour entries for 4.2 not chosen yet'),
  ('Artifact CSP spec and single-file build boot clean', True, 'csptest ready:true at 7c9f12f; recheck at each publish'),
  ('Owner review of Needs Review cards on the RC', False, 'all Needs Review: PD-202, 206, 190, 188, 201, 149, 198, 142.42.1'),
  ('Guide and CHANGELOG 4.2 complete (reroll, history, glare lines)', True, 'S6 60e0443 + lane lines for glare, reroll (guide 04), history (guide 05/08); owner skim optional'),
  ('Owner round with no new change requests; final sign-off', False, ''),
  ('Merge v4 backlog commits into v4.2; then ff main to v4.2', False, 'wait for sign-off'),
  ('Annotated tag v4.2, push, verify with git ls-remote', False, 'wait for sign-off'),
  ('Release artifact: final build at the tag with the release tour', False, ''),
  ('Cards: Review Complete moved to Done once on main', False, ''),
  ('Stale ~/code/pretty_dice checkout fast-forwarded to main', False, 'owner standing request'),
  ('Cleanup: remove v4.2 worktrees and lane branches after the artifact scan', False, 's1 s2 s3 s4 s5 s6 wiggle gomboc glare reroll history; 4.1 worktree too'),
  ('Memory and notes: update pretty-dice memory files and docs/design/integrator-workflow.md', False, ''),
]

OWNER_QS = [
  'Yacht: after End game the lobby (with its draft) stays on the Games tab and your own design returns when you leave Games. OK, or return it at once?',
  'PD-210 memo polish (the On the mat line and the Look: (from set) status line) stays 4.3 unless you want it in 4.2.',
  'Gomboc: approximate body with a ~3% centre-of-mass shift as an extra d1 option, or keep researching the exact body (level-set painting and face-flow path plots)? The app d1 is the Mobius strip (PD-211, 4.3).',
  'PD-142.42.2 and PD-142.42.3 (longhand triggers, chained rolls): in 4.2 or 4.3?',
  'PD-149 glare: please eyeball the reworked top-down view on your device once it lands.',
  'PD-20.7 (CI v5, sharding): stays in Needs Review until the first green GitHub run.',
  'Final sign-off on the release candidate before the tag.',
]



def card_files():
    cards = {}
    for root in ROOTS:
        for f in glob.glob(os.path.join(root, 'backlog', 'tasks', '*.md')):
            t = open(f, encoding='utf8').read()
            m = re.search(r'^id:\s*(\S+)', t, re.M)
            if not m:
                continue
            def g(k):
                # a YAML folded/literal scalar ("title: >-" or "|") keeps its text on the indented lines below
                mm = re.search(r'^%s:[ \t]*([>|][-+]?)[ \t]*\n((?:[ \t]+.*\n?)+)' % k, t, re.M)
                if mm:
                    return ' '.join(l.strip() for l in mm.group(2).splitlines() if l.strip()).replace("''", "'")
                return (re.search(r'^%s:[ \t]*(.*)$' % k, t, re.M) or [None, ''])[1].strip().strip("'\"").replace("''", "'")
            cards[m.group(1)] = dict(id=m.group(1), title=g('title'), status=g('status'), prio=g('priority'),
                                     labels=re.findall(r'^  - (\S+)$', t.split('---')[1], re.M))
    return cards


def main():
    out = sys.argv[1]
    ver = '4.2'
    if '--version' in sys.argv:
        ver = sys.argv[sys.argv.index('--version') + 1]
    cards = card_files()
    listed = {i for _, ids in GROUPS for i in ids}
    stray = sorted(c['id'] for c in cards.values() if 'v4.2' in c['labels'] and c['id'] not in listed
                   and c['status'] not in ('Done',) )
    done_st = ('Review Complete', 'Done')
    total = [cards[i] for _, ids in GROUPS for i in ids if i in cards]
    ndone = sum(c['status'] in done_st for c in total)
    gdone = sum(1 for g in GATES if g[1])
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

    def pill(st):
        k = {'Review Complete': 'ok', 'Done': 'ok', 'Needs Review': 'rev', 'In Progress': 'wip'}.get(st, 'todo')
        return '<span class="pill %s">%s</span>' % (k, html.escape(st or 'To Do'))

    rows = []
    for name, ids in GROUPS:
        rows.append('<h3>%s</h3><ul class="cards">' % html.escape(name))
        for i in ids:
            c = cards.get(i)
            if not c:
                rows.append('<li><b>%s</b> <span class="t">card not found</span></li>' % i)
                continue
            rows.append('<li><b>%s</b><span class="t">%s</span>%s<span class="pr">%s</span></li>'
                        % (i, html.escape(c['title']), pill(c['status']), html.escape(c['prio'])))
        rows.append('</ul>')
    if stray:
        rows.append('<h3>Labelled v4.2 but not on the list</h3><ul class="cards">')
        for i in stray:
            c = cards[i]
            rows.append('<li><b>%s</b><span class="t">%s</span>%s<span class="pr">%s</span></li>'
                        % (i, html.escape(c['title']), pill(c['status']), html.escape(c['prio'])))
        rows.append('</ul>')

    gates = ''.join('<li class="%s"><span class="box">%s</span><div><b>%s</b>%s</div></li>' % (
        'done' if d else '', '&#10003;' if d else '', html.escape(g),
        ('<small>%s</small>' % html.escape(n)) if n else '') for g, d, n in GATES)
    qs = ''.join('<li>%s</li>' % html.escape(q) for q in OWNER_QS)

    page = PAGE.replace('@VER@', ver).replace('@STAMP@', stamp) \
        .replace('@CARDS@', ''.join(rows)).replace('@GATES@', gates).replace('@QS@', qs) \
        .replace('@ND@', str(ndone)).replace('@NT@', str(len(total))) \
        .replace('@GD@', str(gdone)).replace('@GT@', str(len(GATES))) \
        .replace('@PC@', str(round(100 * (ndone + gdone) / max(1, len(total) + len(GATES)))))
    open(out, 'w', encoding='utf8').write(page)
    print('wrote', out, 'cards', ndone, '/', len(total), 'gates', gdone, '/', len(GATES), 'stray', stray)


PAGE = r'''<title>Pretty Dice 4.2 Checklist</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{--bg:#f6f5f2;--panel:#ffffff;--ink:#1d1f26;--dim:#667085;--line:#e2e0d9;--accent:#a8741a;--ok:#2e7d4f;--rev:#8a5a00;--wip:#2b5fb4;--todo:#667085;--okbg:#e3f2e9;--revbg:#fbefd2;--wipbg:#e1ebfa;--todobg:#eceae4}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1015;--panel:#161922;--ink:#e8e9ee;--dim:#8b90a0;--line:#262a36;--accent:#e2b85c;--ok:#6fcf97;--rev:#f2c14e;--wip:#7aa7ff;--todo:#8b90a0;--okbg:#14301f;--revbg:#33290f;--wipbg:#152541;--todobg:#1d212c;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0e1015;--panel:#161922;--ink:#e8e9ee;--dim:#8b90a0;--line:#262a36;--accent:#e2b85c;--ok:#6fcf97;--rev:#f2c14e;--wip:#7aa7ff;--todo:#8b90a0;--okbg:#14301f;--revbg:#33290f;--wipbg:#152541;--todobg:#1d212c;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:15px/1.45 Inter,system-ui,sans-serif;padding-block:28px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
main{max-width:860px;margin:0 auto}
h1{font:700 26px/1.15 "Space Grotesk",Inter,sans-serif;margin:0 0 4px;letter-spacing:.01em}
h2{font:700 13px "Space Grotesk",Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:34px 0 10px}
h3{font-size:14px;margin:18px 0 6px;color:var(--dim);font-weight:600}
.sub{color:var(--dim);margin:0 0 18px}
.bar{height:10px;border-radius:99px;background:var(--line);overflow:hidden;margin:10px 0 6px}
.bar i{display:block;height:100%;width:@PC@%;background:var(--ok)}
.nums{display:flex;gap:18px;flex-wrap:wrap;font-variant-numeric:tabular-nums;color:var(--dim);font-size:13px}.nums b{color:var(--ink)}
ul{list-style:none;margin:0;padding:0}
.gates li{display:flex;gap:12px;align-items:flex-start;padding:9px 12px;background:var(--panel);border:1px solid var(--line);border-radius:10px;margin-bottom:6px}
.gates .box{flex:none;width:20px;height:20px;border:2px solid var(--line);border-radius:6px;display:grid;place-items:center;font-size:13px;color:#fff;margin-top:1px}
.gates li.done .box{background:var(--ok);border-color:var(--ok)}.gates li.done b{color:var(--dim);text-decoration:line-through;text-decoration-color:var(--line)}
.gates small{display:block;color:var(--dim);font-size:12px}
.cards li{display:grid;grid-template-columns:64px minmax(0,1fr) auto 52px;gap:10px;align-items:center;padding:7px 10px;background:var(--panel);border:1px solid var(--line);border-radius:10px;margin-bottom:5px;font-size:14px}
.cards b{font-variant-numeric:tabular-nums;color:var(--dim);font-size:12px}.cards .t{min-width:0;overflow-wrap:anywhere}.cards .pr{color:var(--dim);font-size:11px;text-align:right}
.pill{font-size:11px;font-weight:600;padding:2px 9px;border-radius:99px;white-space:nowrap}
.pill.ok{background:var(--okbg);color:var(--ok)}.pill.rev{background:var(--revbg);color:var(--rev)}.pill.wip{background:var(--wipbg);color:var(--wip)}.pill.todo{background:var(--todobg);color:var(--todo)}
.qs li{padding:6px 0;border-bottom:1px solid var(--line)}
footer{margin-top:30px;color:var(--dim);font-size:12px}
@media (max-width:560px){.cards li{grid-template-columns:56px minmax(0,1fr) auto}.cards .pr{display:none}}
</style>
<main>
<h1>Pretty Dice @VER@ release checklist</h1>
<p class="sub">Everything between today's v@VER@ branch and the tag. Updated by the integrator; last built @STAMP@.</p>
<div class="bar"><i></i></div>
<div class="nums"><span><b>@ND@</b> of <b>@NT@</b> cards reviewed</span><span><b>@GD@</b> of <b>@GT@</b> release gates passed</span><span><b>@PC@%</b> overall</span></div>

<h2>Release gates</h2>
<ul class="gates">@GATES@</ul>

<h2>Cards in 4.2</h2>
@CARDS@

<h2>Waiting on the owner</h2>
<ul class="qs">@QS@</ul>

<footer>Source: backlog cards (live at build time) plus the gate list in scripts/release-checklist.py. Everything not listed here is labelled v4.2.</footer>
</main>
'''

if __name__ == '__main__':
    main()
