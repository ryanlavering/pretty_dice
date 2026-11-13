// Shader tier: guards against GPU-specific sampling bugs that headless SwiftShader cannot show.
import { test, expect } from './helpers/app.mjs';

test.beforeEach(async ({ shared }) => { await shared.reset(1); });

// PD-134: ghost rectangles around the numbers (atlas cell border). texture2D() inside a branch has undefined
// derivatives on GPUs that shade 2x2 quads (iPhone): pixels straddling the cell edge get garbage mip/anisotropy
// footprints. Atlas samples must happen in uniform control flow, then be selected.
test('@quick atlas texture samples are not inside a conditional (no ghost rectangle at the cell border)', async ({ shared: app }) => {
  const fs = await app.run(pd => {
    const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: ['common', 'bumpmap_pars_fragment', 'color_fragment', 'roughnessmap_fragment', 'metalnessmap_fragment', 'normal_fragment_begin', 'emissivemap_fragment', 'lights_physical_fragment'].map(n => `#include <${n}>`).join('\n') };
    pd.dice[0].mat.onBeforeCompile(sh);
    return sh.fragmentShader;
  });
  const bad = fs.split('\n').filter(l => /\?[^:;]*texture2D\(/.test(l) || /:\s*texture2D\(/.test(l) || /return\s+inCell\([^)]*\)\s*\?\s*texture2D/.test(l));
  expect(bad, 'texture2D inside a ternary').toEqual([]);
});
