#!/usr/bin/env python3
"""Build the 4.2 planning page (integrator-owned).

usage: python3 scripts/plan-4.2.py OUT.html
Card ids, titles, priorities and statuses come live from backlog/tasks in this checkout;
the theme grouping, the suggested scope and the 4.2 release gates are edited by hand below.
Publish OUT.html with the Artifact tool (same url each time).
"""
import glob, html, json, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

# (key, name, why, [card ids])
THEMES = [
  ('A', 'Designs, sets and game looks', 'Your current thread, built on what 4.1 shipped. A design is how the dice look; a set is what you roll.',
   ['PD-202', 'PD-206', 'PD-190', 'PD-188']),
  ('B', 'Physics feel', 'Follow-ups to the twitch fix and the view from above.', ['PD-201', 'PD-149']),
  ('C', 'Roll language', 'Rerolls, advantage, triggers and chains, then traits and variables. Large; start with the first slice.',
   ['PD-142.42.1', 'PD-142.2', 'PD-142.42.2', 'PD-142.42.3', 'PD-142.42', 'PD-142.42.4', 'PD-142.42.5', 'PD-198']),
  ('D', 'Performance and reach', 'Software rendering, quality ladder, Lite 2D fallback, installable PWA. Big enough for its own milestone.',
   ['PD-152', 'PD-142.10', 'PD-142.11', 'PD-142.12', 'PD-142.13']),
  ('E', 'Games', 'Story Dice voting and rulings, plus playtest leftovers.', ['PD-194', 'PD-185', 'PD-182', 'PD-193']),
  ('F', 'Tech debt and tests', 'Factoring and one slow-run test.', ['PD-177', 'PD-142.15', 'PD-189']),
  ('G', 'Small UI items', 'Cheap, independent; pick up between larger work.',
   ['PD-142.38.27', 'PD-142.38.30', 'PD-142.38.19', 'PD-148', 'PD-150', 'PD-151', 'PD-153', 'PD-170']),
  ('H', 'Unscheduled and experiments', 'Not planned for 4.2 unless you say so.', ['PD-127', 'PD-161', 'PD-207']),
]
SUGGESTED = {'PD-202', 'PD-206', 'PD-190', 'PD-188', 'PD-201', 'PD-149', 'PD-142.42.1'}

WAVES = [
  ('Wave 1', 'Designs, sets and game looks (A) with the physics follow-ups (B)',
   'PD-202 first (look-only designs, sets name a design), then PD-206 and PD-190 on the same model, then PD-188. PD-201 runs as a separate lane in different code.'),
  ('Wave 2', 'A first slice of roll language (C)', 'PD-142.42.1 (reroll shorthand) as the start. The rest of C waits for how that lands.'),
  ('Later', 'Performance and reach (D) as its own milestone', 'PD-152 profiling decides how much of D is needed at all.'),
]

QUESTIONS = [
  ('q1', 'Order', 'Which order for 4.2?',
   [('rec', 'A and B first, then a first slice of C (suggested)'), ('c', 'Roll language (C) earlier'), ('d', 'Performance (D) earlier')]),
  ('q2', 'Scope', 'How big should 4.2 be?',
   [('rec', 'A + B only, then ship'), ('c', 'A + B + the first slice of C (suggested)'), ('big', 'Everything ticked below')]),
  ('q3', 'Design pass', 'Opus design pass for PD-202 and PD-190 together before any code?',
   [('rec', 'Yes: one model for look-only designs, draft designs and sets (suggested)'), ('no', 'No: Sonnet lanes straight away')]),
]

GATES = [
  ('Scope agreed and cards labelled v4.2 (this page)', 'owner'),
  ('First-slice design note for the designs/sets model (PD-202 + PD-190), reviewed by the owner', 'integrator'),
  ('Lanes landed, one worktree each, own specs run (not the full suite)', 'lanes'),
  ('Owner reviews on a Dev artifact, one card at a time (ok / more review)', 'owner'),
  ('Full suite: two clean runs at the release candidate commit, --retries=0', 'integrator'),
  ('First green GitHub CI run on main (closes PD-20.7)', 'owner'),
  ('CHANGELOG 4.2 and guide pages updated; screenshots refreshed where UI moved', 'lanes'),
  ('Release candidate artifact built (review flag stripped, release tour for the new items if any)', 'integrator'),
  ('Owner sign-off, then merge, annotated tag v4.2, push, verify with git ls-remote', 'integrator'),
  ('Fast-forward ~/code/pretty_dice (main) after the push', 'integrator'),
  ('Cards Review Complete to Done; lane worktrees, branches and stray servers cleaned up', 'integrator'),
  ('Memory and workflow notes updated', 'integrator'),
]


def load_cards():
    cards = {}
    for f in glob.glob(os.path.join(ROOT, 'backlog', 'tasks', '*.md')):
        t = open(f, encoding='utf8').read()
        head = t.split('---')[1] if t.startswith('---') else ''

        def g(k):
            m = re.search(r'^%s:[ \t]*([>|][-+]?)[ \t]*\n((?:[ \t]+.*\n?)+)' % k, head, re.M)
            if m:
                return ' '.join(l.strip() for l in m.group(2).splitlines() if l.strip()).replace("''", "'")
            m = re.search(r'^%s:[ \t]*(.*)$' % k, head, re.M)
            return (m.group(1).strip().strip("'\"").replace("''", "'") if m else '')
        i = g('id')
        if i:
            cards[i] = dict(id=i, title=g('title'), status=g('status'), prio=g('priority') or 'none',
                            labels=re.findall(r'^  - (\S+)$', head, re.M))
    return cards


def main():
    out = sys.argv[1]
    cards = load_cards()
    listed = {i for _, _, _, ids in THEMES for i in ids}
    open42 = {c['id'] for c in cards.values() if any(l in ('v4.2', 'v4.3') for l in c['labels']) and c['status'] != 'Done'}
    missing = sorted(open42 - listed)
    extra = sorted(i for i in listed if i not in cards)
    data = []
    sections = []
    for key, name, why, ids in THEMES:
        rows = []
        for i in ids:
            c = cards.get(i)
            if not c:
                continue
            on = i in SUGGESTED
            data.append(i)
            rows.append(
                '<li><label><input type="checkbox" data-card="%s"%s><span class="cid">%s</span><span class="ct">%s</span>'
                '<span class="pr %s">%s</span></label></li>' % (
                    html.escape(i), ' checked' if on else '', html.escape(i), html.escape(c['title']),
                    html.escape(c['prio']), html.escape(c['prio'])))
        sections.append('<section class="theme" id="t%s"><h3><span class="tk">%s</span>%s</h3><p class="why">%s</p><ul class="cards">%s</ul></section>' % (
            key, key, html.escape(name), html.escape(why), ''.join(rows)))
    waves = ''.join('<div class="wave"><b>%s</b><div class="wn">%s</div><p>%s</p></div>' % (html.escape(a), html.escape(b), html.escape(c)) for a, b, c in WAVES)
    qs = []
    for qid, short, q, opts in QUESTIONS:
        os_ = ''.join('<label class="opt"><input type="radio" name="%s" value="%s"%s><span>%s</span></label>' % (
            qid, v, ' checked' if v == 'rec' or (qid == 'q2' and v == 'c') else '', html.escape(t)) for v, t in opts)
        qs.append('<fieldset data-q="%s" data-short="%s"><legend>%s</legend>%s</fieldset>' % (qid, html.escape(short), html.escape(q), os_))
    gates = ''.join('<li><label><input type="checkbox"><span class="gt">%s</span><span class="who">%s</span></label></li>' % (html.escape(g), html.escape(w)) for g, w in GATES)
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    page = PAGE.replace('@WAVES@', waves).replace('@QS@', ''.join(qs)).replace('@THEMES@', ''.join(sections)) \
        .replace('@GATES@', gates).replace('@STAMP@', stamp).replace('@N@', str(len(data)))
    open(out, 'w', encoding='utf8').write(page)
    print('wrote', out, 'cards', len(data), 'unlisted open 4.2/4.3 cards:', missing, 'listed but missing:', extra)


PAGE = r'''<title>4.2 Planning</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap">
<style>
/* Layout: one reading column; direction first, then decisions, then the cards by theme with scope ticks, then the 4.2 release gates. */
:root{--bg:#f4f5f7;--panel:#ffffff;--ink:#1c2030;--dim:#5f6678;--line:#dde0e8;--accent:#b4781a;--accentbg:#f8ecd3;--hi:#b0413e;--mid:#8a6d1c;--lo:#5f6678;--sans:Inter,system-ui,sans-serif;--head:"Space Grotesk",Inter,system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1117;--panel:#171a23;--ink:#e8eaf1;--dim:#9096a8;--line:#272b38;--accent:#e4b45c;--accentbg:#2e2614;--hi:#ec8a85;--mid:#d9bb62;--lo:#9096a8;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f1117;--panel:#171a23;--ink:#e8eaf1;--dim:#9096a8;--line:#272b38;--accent:#e4b45c;--accentbg:#2e2614;--hi:#ec8a85;--mid:#d9bb62;--lo:#9096a8;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:15px/1.5 var(--sans);padding-block:28px 72px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
main{max-width:780px;margin:0 auto}
h1{font:700 28px/1.15 var(--head);margin:0 0 6px;text-wrap:balance}
h2{font:700 12px var(--head);letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:34px 0 10px}
h3{font:700 17px/1.25 var(--head);margin:0 0 2px;display:flex;gap:10px;align-items:baseline}
.sub{color:var(--dim);margin:0 0 18px;max-width:64ch}
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);padding:10px 0;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.count{font-variant-numeric:tabular-nums;color:var(--dim);font-size:13px}.count b{color:var(--ink)}
button{font:600 13px var(--sans);padding:8px 14px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) button{color:#1a1405}}
:root[data-theme="dark"] button{color:#1a1405}
button.ghost{background:transparent;color:var(--accent)}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.waves{display:grid;gap:8px}
.wave{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.wave b{font:700 11px var(--head);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.wave .wn{font:600 15px var(--head);margin:2px 0}.wave p{margin:0;color:var(--dim);font-size:13.5px}
fieldset{border:1px solid var(--line);border-radius:10px;background:var(--panel);margin:0 0 10px;padding:10px 14px 8px;min-width:0}
legend{font:600 14px var(--head);padding:0 6px}
.opt{display:flex;gap:10px;align-items:flex-start;padding:4px 0;cursor:pointer}.opt input{margin-top:4px;accent-color:var(--accent)}
.theme{margin:0 0 20px}.why{margin:0 0 8px;color:var(--dim);font-size:13.5px;max-width:66ch}
.tk{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:var(--accentbg);color:var(--accent);font:700 12px var(--head)}
ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.cards li label{display:grid;grid-template-columns:22px 92px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 12px;background:var(--panel);border:1px solid var(--line);border-radius:10px;cursor:pointer}
.cards li label:has(input:checked){border-color:var(--accent);background:var(--accentbg)}
input[type=checkbox]{width:18px;height:18px;margin-top:2px;accent-color:var(--accent)}
.cid{font:600 12px var(--sans);color:var(--dim);font-variant-numeric:tabular-nums;padding-top:2px}.ct{min-width:0;overflow-wrap:anywhere}
.pr{font:600 11px var(--sans);padding:1px 8px;border-radius:99px;border:1px solid var(--line);color:var(--lo);align-self:start}
.pr.high{color:var(--hi);border-color:var(--hi)}.pr.medium{color:var(--mid);border-color:var(--mid)}
.gates li label{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 12px;background:var(--panel);border:1px solid var(--line);border-radius:10px;cursor:pointer}
.gates li label:has(input:checked){border-color:var(--accent);background:var(--accentbg)}
.who{font-size:11px;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;padding-top:3px}
textarea{width:100%;min-height:150px;margin-top:10px;font:13px/1.45 ui-monospace,Menlo,monospace;padding:10px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--ink)}
footer{margin-top:28px;color:var(--dim);font-size:12.5px}
@media (max-width:560px){.cards li label{grid-template-columns:22px minmax(0,1fr) auto}.cid{grid-column:2;grid-row:1}.ct{grid-column:2;grid-row:2}.pr{grid-column:3;grid-row:1}}
</style>
<main>
<h1>4.2 Planning</h1>
<p class="sub">A suggested direction for 4.2, built from the open 4.2 and 4.3 cards. Tick what belongs in 4.2, answer the three questions, then copy your plan back to me.</p>
<div class="bar"><span class="count"><b id="n">0</b> of @N@ cards in 4.2</span><button id="copy">Copy my plan</button><button id="reset" class="ghost">Back to suggested</button></div>

<h2>Suggested direction</h2>
<div class="waves">@WAVES@</div>

<h2>Three questions</h2>
@QS@

<h2>Cards by theme</h2>
<p class="sub">Ticked cards are my suggested scope. Priorities are the ones on the cards; you set high on PD-202 and PD-201.</p>
@THEMES@

<h2>4.2 release checklist</h2>
<ul class="gates">@GATES@</ul>

<h2>Your plan</h2>
<textarea id="out" readonly aria-label="Your plan" placeholder="Your plan appears here as you change things."></textarea>
<footer>Built @STAMP@ from the backlog cards (live at build time) and the lists in scripts/plan-4.2.py.</footer>
</main>
<script>
(function(){
  var cards=[].slice.call(document.querySelectorAll('input[data-card]'));
  var defaults=cards.map(function(c){return c.checked;});
  var radios=[].slice.call(document.querySelectorAll('fieldset input[type=radio]'));
  var rdef=radios.map(function(r){return r.checked;});
  var gates=[].slice.call(document.querySelectorAll('.gates input'));
  var out=document.getElementById('out'), n=document.getElementById('n');
  function sync(){
    var on=cards.filter(function(c){return c.checked;});
    n.textContent=on.length;
    var lines=['4.2 plan:'];
    [].slice.call(document.querySelectorAll('fieldset[data-q]')).forEach(function(f){
      var sel=f.querySelector('input:checked'); if(sel) lines.push(f.getAttribute('data-short')+': '+sel.parentNode.querySelector('span').textContent);
    });
    lines.push('In 4.2 ('+on.length+'): '+on.map(function(c){return c.getAttribute('data-card');}).join(', '));
    out.value=lines.join('\n');
    try{localStorage.setItem('pd42plan',JSON.stringify({c:cards.map(function(c){return c.checked;}),r:radios.map(function(r){return r.checked;}),g:gates.map(function(g){return g.checked;})}));}catch(e){}
  }
  try{var s=JSON.parse(localStorage.getItem('pd42plan')||'null'); if(s&&s.c&&s.c.length===cards.length){cards.forEach(function(c,i){c.checked=!!s.c[i];}); if(s.r&&s.r.length===radios.length) radios.forEach(function(r,i){r.checked=!!s.r[i];}); if(s.g&&s.g.length===gates.length) gates.forEach(function(g,i){g.checked=!!s.g[i];});}}catch(e){}
  cards.concat(radios,gates).forEach(function(x){x.addEventListener('change',sync);});
  document.getElementById('reset').onclick=function(){cards.forEach(function(c,i){c.checked=defaults[i];}); radios.forEach(function(r,i){r.checked=rdef[i];}); gates.forEach(function(g){g.checked=false;}); sync();};
  document.getElementById('copy').onclick=function(){
    var t=out.value; var b=document.getElementById('copy');
    var done=function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy my plan';},1500);};
    try{navigator.clipboard.writeText(t).then(done,function(){out.select();});}catch(e){out.select();}
  };
  sync();
})();
</script>
'''

if __name__ == '__main__':
    main()
