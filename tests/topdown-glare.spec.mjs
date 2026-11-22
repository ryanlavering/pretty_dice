// PD-149: the top-down check eases the key light and the dice's reflections so faces stay readable; perspective view is untouched.
import { test, expect } from './helpers/app.mjs';

test('top-down glare: values restore exactly at topBlend 0 and are calmer at 1', async ({ shared: app }) => {
  await app.reset(7);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '3d20'; pd.setSubstrate('solid'); await pd.buildDice(); pd.simRoll(); });
  const snap = () => app.run(pd => { const m = pd.dice[0].mat; return { i: pd.key.intensity, y: pd.key.position.y, e: m.envMapIntensity, s: m.specularIntensity, c: m.clearcoat, r: m.roughness, h: m.sheen }; });
  const base = await snap();
  // topBlend 0: the look function is the identity
  const f0 = await app.run(pd => { const f = pd.topGlareLook(0); return [f.key, f.y, f.env(0), f.env(1), f.spec, f.coat, f.rough(0), f.rough(1), f.sheen]; });
  expect(f0).toEqual([1, 1, 1, 1, 1, 1, 0, 0, 1]);
  const f1 = await app.run(pd => { const f = pd.topGlareLook(1); return { key: f.key, y: f.y, env: f.env(0), envM: f.env(1), spec: f.spec, coat: f.coat, rough: f.rough(0), roughM: f.rough(1), sheen: f.sheen }; });
  expect(f1.key).toBeLessThan(0.95); expect(f1.y).toBeLessThan(0.8);
  expect(f1.env).toBe(1); expect(f1.envM).toBeLessThan(0.9); expect(f1.envM).toBeGreaterThan(0.3);   // dielectrics keep the ambient env light (cutting it made faces dark; their mirror is gone via spec/coat), metals get a dimmer one
  expect(f1.spec).toBeLessThan(0.05); expect(f1.coat).toBeLessThan(0.05); expect(f1.sheen).toBeLessThan(0.05);
  expect(f1.rough).toBeGreaterThan(0.05); expect(f1.roughM).toBeGreaterThan(f1.rough);
  // linear: halfway through the blend is halfway
  const fh = await app.run(pd => { const f = pd.topGlareLook(.5); return [f.spec, f.coat, f.key]; });
  expect(fh[0]).toBeCloseTo((1 + f1.spec) / 2, 5); expect(fh[2]).toBeCloseTo((1 + f1.key) / 2, 5);
  // render at topBlend 1 and back: stored values are put back exactly
  const mid = await app.run(pd => { pd.holdTop(true); pd.renderOnce(); return pd.topBlend; });
  expect(mid).toBe(1);
  expect(await snap()).toEqual(base);
  // a frame at topBlend 1 is darker in the highlights than at 0 (glare metric: bright pixels)
  const bright = () => app.run(async pd => { pd.renderOnce(); const img = new Image(); img.src = pd.canvas.toDataURL('image/png'); await img.decode(); const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, img.width, img.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2] > 235) n++; return n; });
  const top = await bright();
  await app.run(pd => { pd.holdTop(false); pd.renderOnce(); });
  expect(await app.run(pd => pd.topBlend)).toBeLessThan(0.01);
  const flat = await bright();
  expect(top).toBeLessThan(flat);
  expect(await snap()).toEqual(base);
});
