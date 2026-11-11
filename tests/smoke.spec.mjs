// Smoke / UI tier: the app boots, renders and responds to its controls like a user would drive them.
import { readFile } from 'node:fs/promises';
import { test, expect } from './helpers/app.mjs';

const pngSize = buf => ({ sig: buf.subarray(1, 4).toString(), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

test.describe('desktop', () => {
  test.beforeEach(async ({ app }) => { await app.open(); });

  test('boots clean and renders a die in the middle of the stage', async ({ app }) => {
    const s = await app.canvasStats();
    expect(s.width).toBeGreaterThan(300);
    expect(s.std, 'canvas is not a flat colour').toBeGreaterThan(4);
    expect(s.coverage, 'something is drawn').toBeGreaterThan(0.01);
    expect(s.coverage, 'not a full-frame wash').toBeLessThan(0.9);
    expect(s.centroid[0]).toBeGreaterThan(0.25); expect(s.centroid[0]).toBeLessThan(0.75);
    expect(s.centroid[1]).toBeGreaterThan(0.25); expect(s.centroid[1]).toBeLessThan(0.75);
  });

  test('Randomize button and Space key change the look', async ({ app, page }) => {
    const seed = () => app.run(pd => pd.state.seed);
    const s0 = await seed();
    await page.click('#rand'); const s1 = await seed();
    await page.locator('#stage').click({ position: { x: 5, y: 5 } }).catch(() => {});   // focus away from inputs
    await page.keyboard.press('Space'); const s2 = await seed();
    expect(s1).not.toBe(s0); expect(s2).not.toBe(s1);
  });

  test('Ctrl+Z / Ctrl+Y undo and redo a randomize', async ({ app, page }) => {
    const seed = () => app.run(pd => pd.state.seed);
    const s0 = await seed(); await page.click('#rand'); const s1 = await seed();
    await page.keyboard.press('Control+z'); await expect.poll(seed).toBe(s0);
    await page.keyboard.press('Control+y'); await expect.poll(seed).toBe(s1);
  });

  test('Roll shows a result, Showcase goes back', async ({ app, page }) => {
    await page.click('#roll');
    expect(await app.run(pd => pd.rolling)).toBe(true);
    await expect(page.locator('#result')).toHaveClass(/\bon\b/, { timeout: 60_000 });
    const r = await app.run(pd => ({ text: document.getElementById('result').textContent, labels: pd.dice.length }));
    expect(r.text).toMatch(/\d/);
    await page.click('#mode');
    expect(await app.run(pd => pd.rolling)).toBe(false);
  });

  test('shape buttons, also while rolling; Standard 7 builds seven dice', async ({ app, page }) => {
    await page.click('#mode');
    await page.click('#shapes [data-id=d8]');
    await expect.poll(() => app.run(pd => [pd.state.shape, pd.dice.length, pd.bodies.length, pd.rolling])).toEqual(['d8', 1, 1, true]);
    await page.click('#mode');
    await page.click('#shapes [data-id=set7]');
    await expect.poll(() => app.run(pd => [pd.state.shape, pd.dice.length])).toEqual(['set7', 7]);
  });

  test('Randomize mid-roll replaces geometry and keeps bodies in step', async ({ app, page }) => {
    const g0 = await app.run(pd => { pd.state.randshape = true; pd.simRoll(); window.__g0 = pd.dice[0].geo; return pd.settled; });
    expect(g0).toBe(true);
    await page.click('#rand');
    await expect.poll(() => app.run(pd => pd.dice[0].geo !== window.__g0)).toBe(true);
    expect(await app.run(pd => [pd.rolling, pd.bodies.length === pd.dice.length])).toEqual([true, true]);
  });

  test('settings persist across a reload', async ({ app, page }) => {
    await page.click('#shapes [data-id=d12]');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('prettydice.v1') || '{}').shape)).toBe('d12');
    const seed = await app.run(pd => pd.state.seed);
    await page.reload(); await app.ready();
    expect(await app.run(pd => [pd.state.shape, pd.state.seed])).toEqual(['d12', seed]);
  });

  for (const [type, btn] of [['png', '#exppng'], ['jpg', '#expjpg']]) {
    test(`export ${type} at 1024 px`, async ({ page }) => {
      await page.selectOption('#expsize', '1024');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click(btn)]);
      expect(dl.suggestedFilename()).toMatch(new RegExp(`^pretty-.*\\.${type}$`));
      const buf = await readFile(await dl.path());
      if (type === 'png') expect(pngSize(buf)).toEqual({ sig: 'PNG', w: 1024, h: 1024 });
      else expect(buf.subarray(0, 3).toString('hex')).toBe('ffd8ff');
    });
  }

  test('Save design downloads JSON; Load design reads an octet-stream file back', async ({ app, page }) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#savejson')]);
    const saved = JSON.parse(await readFile(await dl.path(), 'utf8'));
    expect(saved.format).toBe('pretty-dice');
    saved.shape = saved.shape === 'd12' ? 'd8' : 'd12';
    await page.setInputFiles('#jsonfile', { name: 'design.json', mimeType: 'application/octet-stream', buffer: Buffer.from('﻿' + JSON.stringify(saved)) });   // BOM + octet-stream, as phones hand it over
    await expect.poll(() => app.run(pd => pd.state.shape)).toBe(saved.shape);
  });

  test('custom inclusion loads from OBJ and STL files', async ({ app, page }) => {
    await app.run(pd => { pd.state.substrate = 'epoxy'; pd.setSubstrate('epoxy'); pd.applyLook(); });
    const files = {
      't.obj': 'v 0 0 0\nv 1 0 0\nv 0 1 0\nv 0 0 1\nf 1 3 2\nf 1 2 4\nf 1 4 3\nf 2 3 4\n',
      't.stl': 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t\n',
    };
    for (const [name, text] of Object.entries(files)) {
      await app.run(pd => { pd.state.inclusion = 'none'; });
      await page.setInputFiles('#modelfile', { name, mimeType: 'application/octet-stream', buffer: Buffer.from(text) });
      await expect.poll(() => app.run(pd => [pd.state.inclusion, pd.dice.filter(d => d.inc).length]), { message: name, timeout: 45_000 }).toEqual(['custom', 1]);   // epoxy shader compile + rebuild is slow under software WebGL
    }
  });

  test('layout toggle: full view enlarges the stage, split view restores it', async ({ app, page }) => {
    const m = () => app.run(() => ({ w: document.getElementById('stage').clientWidth, h: document.getElementById('stage').clientHeight, scroll: document.getElementById('app').scrollTop }));
    const split = await m();
    await page.click('#layout'); await expect.poll(async () => (await m()).w).toBeGreaterThan(split.w);
    await page.click('#layout'); await expect.poll(m).toEqual(split);
    await page.click('#layout'); await page.click('#layout'); await expect.poll(m).toEqual(split);
  });

  test('roll and showcase cameras keep their own angle and zoom', async ({ app }) => {
    const r = await app.run(async pd => {
      const z0 = [pd.state.zoom, pd.state.rollZoom]; pd.startRoll(); await new Promise(r => setTimeout(r, 300));
      pd.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, cancelable: true })); pd.orbit.az = 1.1; pd.orbit.el = .3;
      const roll = { zoom: pd.state.zoom, rollZoom: pd.state.rollZoom, rollAz: pd.views.roll.az, showAz: pd.views.show.az };
      pd.exitRoll(); await new Promise(r => setTimeout(r, 300));
      pd.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, cancelable: true }));
      return { z0, roll, show: { zoom: pd.state.zoom, rollZoom: pd.state.rollZoom, rollAz: pd.views.roll.az, showAz: pd.views.show.az } };
    });
    expect(r.roll.zoom).toBe(r.z0[0]);                 // zooming the roll view leaves the showcase zoom alone
    expect(r.roll.rollZoom).toBeLessThan(r.z0[1]);
    expect(r.roll.showAz).toBe(0); expect(r.roll.rollAz).toBe(1.1);
    expect(r.show.rollZoom).toBe(r.roll.rollZoom);     // and the other way round
    expect(r.show.zoom).toBeGreaterThan(r.z0[0]);
    expect(r.show.rollAz).toBe(1.1);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.beforeEach(async ({ app }) => { await app.open(); });

  const touch = (pd, steps) => {   // replays [type, pointerId, x, y] on the canvas as touch pointer events
    pd.canvas.setPointerCapture = () => {};
    for (const [t, id, x, y] of steps) pd.canvas.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, button: 0, bubbles: true, pointerType: 'touch' }));
  };

  test('renders on a phone-sized stage', async ({ app }) => {
    const s = await app.canvasStats();
    expect(s.std).toBeGreaterThan(4);
    expect(s.coverage).toBeGreaterThan(0.01);
  });

  test('pinch zooms without orbiting; one finger drags', async ({ app }) => {
    const r = await app.run((pd, src) => {
      const touch = (0, eval)(`(${src})`), z0 = pd.state.zoom, a0 = pd.orbit.az;
      touch(pd, [['pointerdown', 1, 100, 200], ['pointerdown', 2, 200, 200], ['pointermove', 2, 300, 200], ['pointermove', 1, 0, 200], ['pointerup', 1, 0, 200], ['pointerup', 2, 300, 200]]);
      const pinch = { z0, z1: pd.state.zoom, a0, a1: pd.orbit.az, dragging: pd.dragging };
      touch(pd, [['pointerdown', 3, 50, 50], ['pointermove', 3, 90, 50]]);
      return { ...pinch, oneFinger: pd.dragging };
    }, touch.toString());
    expect(r.z1).not.toBe(r.z0);
    expect(r.a1).toBe(r.a0);
    expect(r.dragging).toBe(false);
    expect(r.oneFinger).toBe(true);
  });

  test('flick re-rolls, a tap does not', async ({ app }) => {
    const r = await app.run((pd, src) => {
      const touch = (0, eval)(`(${src})`); pd.simRoll();
      touch(pd, [['pointerdown', 1, 100, 300], ['pointerup', 1, 100, 300]]); const afterTap = pd.settled;
      touch(pd, [['pointerdown', 2, 100, 300], ['pointermove', 2, 100, 150], ['pointerup', 2, 100, 150]]);
      return { afterTap, afterFlick: pd.settled, rolling: pd.rolling };
    }, touch.toString());
    expect(r).toEqual({ afterTap: true, afterFlick: false, rolling: true });
  });

  test('shake: a soft shake does nothing, a hard one rolls', async ({ app, context }) => {
    await context.grantPermissions(['accelerometer', 'gyroscope']);   // Chrome now gates DeviceMotionEvent.requestPermission on these
    const r = await app.run(async pd => {
      await pd.setShake(true); if (!pd.state.shake) return { enabled: false };
      while (performance.now() < 1600) await new Promise(r => setTimeout(r, 100));   // shakes are debounced 1.5 s from page start
      const fire = g => dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: g, y: 0, z: 0 } }));
      fire(12); const soft = pd.rolling; fire(35); return { soft, hard: pd.rolling };
    });
    expect(r).toEqual({ soft: false, hard: true });   // { enabled: false } means the permission prompt path refused
  });
});

// PD-58: one throwing frame used to end the render loop for good (three.js stops scheduling frames after a callback throws).
test('the render loop survives a frame that throws', async ({ app }) => {
  await app.open();
  await app.run(pd => { let thrown = false;   // the idle-spin code reads state.spin every showcase frame: make it throw once
    Object.defineProperty(pd.state, 'spin', { configurable: true, get() { if (!thrown) { thrown = true; throw new Error('boom'); } return 0.3; }, set() {} }); });
  await expect.poll(() => app.errors.some(e => e.includes('frame error')), { message: 'the error is logged, not swallowed', timeout: 20_000 }).toBe(true);
  app.errors.length = 0;   // expected; the fixture would otherwise fail the test on it
  const q = () => app.run(pd => pd.rig.quaternion.toArray());
  const a = await q();
  await expect.poll(async () => JSON.stringify(await q()) !== JSON.stringify(a), { message: 'the scene keeps animating after the error', timeout: 20_000 }).toBe(true);
});

// PD-95: iOS Safari zooms the page in when a text field or select under 16px gets focus, and stays zoomed.
test.describe('touch devices', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  test('text fields and selects are at least 16px so iOS does not zoom on focus', async ({ app }) => {
    await app.open();
    const small = await app.page.evaluate(() => [...document.querySelectorAll('input[type=text],input:not([type]),input[type=number],select,textarea')]
      .map(e => ({ id: e.id || e.tagName, px: parseFloat(getComputedStyle(e).fontSize) })).filter(x => x.px < 16));
    expect(small, 'fields under 16px (these make iOS zoom)').toEqual([]);
  });
});
