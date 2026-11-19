// Shared word pools for glyph packs whose glyphs have only a name (Game-icons, Font Awesome, hieroglyphs). Each glyph gets its noun from its name and a seeded pick from its category's pools, frozen into the pack file at build time.
// a = adjectives, d = adverbs, t = transitive past-tense verbs, i = intransitive past-tense verbs.
export const CAT = {
  animal:  { a:'little,sly,sleepy,wild,quick,gentle,hungry,clever', d:'quietly,swiftly,hungrily,cleverly,boldly,gently', t:'chased,followed,startled,watched,outran,guarded', i:'ran,hid,slept,wandered,growled' },
  creature:{ a:'strange,ancient,fierce,lonely,glowing,mighty,sneaky,odd', d:'mysteriously,fiercely,slowly,eerily,suddenly,grandly', t:'haunted,tricked,scared,guarded,befriended,chased', i:'appeared,vanished,roared,lurked,howled' },
  object:  { a:'old,shiny,tiny,heavy,curious,secret,lucky,broken', d:'carefully,quietly,suddenly,brightly,slowly,neatly', t:'opened,hid,showed,tempted,held,carried', i:'gleamed,rattled,waited,fell,glowed' },
  tool:    { a:'sturdy,rusty,heavy,sharp,trusty,clumsy,old', d:'steadily,loudly,carefully,swiftly,firmly', t:'mended,broke,cut,smashed,fixed,carried', i:'clanged,gleamed,rattled,swung' },
  weapon:  { a:'sharp,rusty,gleaming,ancient,heavy,fearsome,notched', d:'swiftly,boldly,silently,fiercely,bravely', t:'threatened,struck,defended,challenged,guarded,carried', i:'gleamed,clanged,flashed,rested' },
  nature:  { a:'wild,quiet,ancient,bright,cold,gentle,tall,fresh', d:'slowly,gently,silently,suddenly,brightly,softly', t:'covered,sheltered,warmed,hid,lit,watched', i:'swayed,glowed,drifted,rose,sparkled' },
  food:    { a:'sweet,warm,juicy,fresh,tasty,crumbly,round', d:'hungrily,happily,sweetly,greedily,gladly', t:'fed,tempted,delighted,surprised,shared,tricked', i:'rolled,cooled,wobbled,steamed' },
  building:{ a:'old,grand,cozy,crooked,tall,lonely,sturdy,gloomy', d:'proudly,silently,high up,grimly,snugly', t:'sheltered,welcomed,guarded,hid,sheltered,shaded', i:'stood,loomed,creaked,crumbled' },
  vehicle: { a:'fast,noisy,rusty,little,grand,shaky,shiny', d:'swiftly,noisily,boldly,bumpily,smoothly', t:'carried,chased,crossed,followed,rescued,raced', i:'rumbled,zoomed,drifted,rattled' },
  person:  { a:'brave,wise,grumpy,kind,clever,tired,proud,sly', d:'bravely,wisely,politely,grandly,quietly,warily', t:'helped,guided,tricked,warned,befriended,saved', i:'laughed,smiled,wandered,waited,sighed' },
  body:    { a:'big,small,wide,gentle,sharp,pale,strong', d:'closely,softly,carefully,firmly,suddenly', t:'held,touched,caught,warmed,watched,startled', i:'twitched,trembled,glowed,waited' },
  space:   { a:'distant,glowing,silent,cold,enormous,bright,strange', d:'silently,slowly,brilliantly,far away,endlessly', t:'circled,lit,watched,crossed,followed,swallowed', i:'spun,blazed,drifted,glittered' },
  magic:   { a:'magical,glowing,ancient,bubbling,secret,sparkling,odd', d:'mysteriously,suddenly,brightly,slyly,oddly', t:'enchanted,changed,summoned,granted,healed,tricked', i:'fizzed,glowed,shimmered,hummed' },
  symbol:  { a:'ancient,mysterious,bold,plain,golden,curious', d:'mysteriously,boldly,quietly,proudly,calmly', t:'marked,guided,warned,honored,showed,sealed', i:'gleamed,shone,waited,turned' } };
