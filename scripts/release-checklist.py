#!/usr/bin/env python3
"""Build the release checklist page (integrator-owned).

usage: python3 scripts/release-checklist.py OUT.html [--version 4.1]
Card status/priority/title come live from backlog/tasks in this checkout and the
v4.1 checkout (../pretty_dice-v4.1); the release gates below are edited by hand
(done = True) as they are completed.  Publish OUT.html with the Artifact tool
(same url each time).
"""
import glob, html, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOTS = [os.path.join(HERE, '..', '..', 'pretty_dice-v4.1'), os.path.join(HERE, '..')]  # later roots win

GROUPS = [
  ('Story Dice review tweaks', ['PD-171', 'PD-172', 'PD-173', 'PD-174', 'PD-175', 'PD-176']),
  ('Story Dice features', ['PD-160', 'PD-167', 'PD-166']),
  ('Carried into 4.1', ['PD-155', 'PD-164', 'PD-168', 'PD-169']),
  ('Reviewed and landed (4.1 so far)', ['PD-154', 'PD-157', 'PD-156', 'PD-158', 'PD-159', 'PD-162', 'PD-163', 'PD-165']),
]

# (gate, done, note)
GATES = [
  ('Story Dice review tweaks landed and reviewed (PD-171 to PD-176)', False, 'owner threads on the v4.1 Dev artifact resolve one by one'),
  ('Grammar slice 1 (PD-167) landed', True, 'c3c514d: NdS{pack#seed} faces in normal rolls; owner review and 3 small decisions pending'),
  ('PD-166 Story Dice set editor (Games menu) landed; PD-161 glyph controls moved to 4.2', False, 'owner decided 2026-11-19; PD-166 lane running'),
  ('PD-155 bad-6 check: add the read-face vs scored-value self-check, or close as not reproducible', False, ''),
  ('PD-168 factoring pass S10 (main.js split) done before the final regression', False, 'mechanical; golden must stay unchanged'),
  ('PD-164 release tingles: owner picks the 5 to 10 highlights', False, 'needs the final feature list'),
  ('Owner round with no new change requests (4.1 settled)', False, 'comment-free review of a normal Dev artifact'),
  ('Full suite green on the release candidate (two clean runs, --retries=0)', False, 'about 21 min each; take the test lock'),
  ('Golden set unchanged (no re-record)', True, 'held through the Story Dice merge'),
  ('Artifact CSP spec and single-file build boot clean', True, 'rechecked at each publish'),
  ('Guide review and update (Story Dice, Whoopsie, desktop click, Craps secret, gravity if in)', False, 'guide lane; desktop and phone shots'),
  ('CHANGELOG 4.1 (from docs/design/v41-changelog-draft.md) and README', False, ''),
  ('Merge v4 backlog commits into v4.1; then ff main to v4.1', False, 'main is at 4.0.1; check ls-remote afterwards'),
  ('Annotated tag v4.1, push, verify with git ls-remote', False, 'never pipe a failing merge into tail'),
  ('Release artifact: build with the review flag stripped, no tingles', False, 'then enable release tingles (PD-164) for the new version'),
  ('Cards: Review Complete moved to Done once on main', False, ''),
  ('Cleanup: remove v4.1 worktrees and lane branches after the artifact scan', False, 'also the stale ~/code/pretty_dice checkout: owner decides'),
  ('Memory and notes: update pretty-dice memory files and docs/design/integrator-workflow.md', False, ''),
]

OWNER_QS = [
  'Antique relief preset: under Base or Numbers?',
  'Adopt the CI v5 bump on branch feat/pd-20.7-ci?',
  'Discard the stale uncommitted edits in ~/code/pretty_dice and fast-forward its main?',
  'PD-127 label; Save and export own head.',
  'PD-152 (software rendering profile, needs Opus) and PD-142.42.1 are moved to 4.2: keep there?',
]


def card_files():
    cards = {}
    for root in ROOTS:
        for f in glob.glob(os.path.join(root, 'backlog', 'tasks', '*.md')):
            t = open(f, encoding='utf8').read()
            m = re.search(r'^id:\s*(\S+)', t, re.M)
            if not m:
                continue
            g = lambda k: (re.search(r'^%s:\s*(.*)$' % k, t, re.M) or [None, ''])[1].strip().strip("'\"")
            cards[m.group(1)] = dict(id=m.group(1), title=g('title'), status=g('status'), prio=g('priority'),
                                     labels=re.findall(r'^  - (\S+)$', t.split('---')[1], re.M))
    return cards


def main():
    out = sys.argv[1]
    ver = '4.1'
    if '--version' in sys.argv:
        ver = sys.argv[sys.argv.index('--version') + 1]
    cards = card_files()
    listed = {i for _, ids in GROUPS for i in ids}
    stray = sorted(c['id'] for c in cards.values() if 'v4.1' in c['labels'] and c['id'] not in listed
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
        rows.append('<h3>Labelled v4.1 but not on the list</h3><ul class="cards">')
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


PAGE = r'''<title>Pretty Dice 4.1 Checklist</title>
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

<h2>Cards in 4.1</h2>
@CARDS@

<h2>Waiting on the owner</h2>
<ul class="qs">@QS@</ul>

<footer>Source: backlog cards (live at build time) plus the gate list in scripts/release-checklist.py. Everything not listed here is labelled v4.2.</footer>
</main>
'''

if __name__ == '__main__':
    main()
