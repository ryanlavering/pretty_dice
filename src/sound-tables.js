// Sound tables: material hardness, metal ring partials, glass FM voices (4.1 factoring step S10). Pure data; tools/sound-audition.html mirrors them by hand and tests/sound.spec.mjs checks the two copies match.
// hardness: each material 0 (felt) .. 1 (glass). A pair is combined as 2ab/(a+b), so the softer partner dominates (plastic on felt is soft, stone on glass is hard).
// The impact then asks for a clip of about that "clack" score (see scripts/build-sounds.mjs), a bit harder when the hit is harder, with random wobble. Rough on purpose.
export const MAT_HARD={ felt:.05, carpet:.08, leather:.15, cardboard:.25, plastic:.45, wood:.5, resin:.5, stone:.8, metal:.9, glass:.95 };
// RING[material]=[base Hz, loudness, partial ratios, partial gains, partial decay seconds]. Metal uses free-bar ratios, glass uses wine-glass-like ratios. The pitch is fixed per material (+-3% per hit); upper partials only wake on hard hits.
export const RING={ metal:[1750,.2,[1,2.76,5.4,8.93],[1,.55,.3,.15],[.5,.28,.17,.1],12000,.0015], glass:[2500,.17,[1,2.32,4.25,6.63],[1,.3,.12,.05],[.38,.22,.14,.09],6000,.004] };
export const GLASS_FM=[[2200,1.41,2.5,.08,.5,1],[3500,2.76,1.5,.05,.25,.5]];   // FM glass voices: [carrier Hz, modulator:carrier ratio, peak modulation index, index decay s, amplitude decay s, gain]. A bright inharmonic "tink" (index falls fast) that settles into a pure ring.
