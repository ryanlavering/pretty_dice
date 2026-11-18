// Die material: MeshPhysicalMaterial with the synthetic 3D substrate texture (swirl, stone, epoxy) injected into its shaders; U = the live design's uniforms (4.1 factoring step S5).
import * as THREE from 'three';

/* ---------- material: synthetic 3D texture injected into MeshPhysicalMaterial ---------- */
export const makeUniforms=()=>({ uC1:{value:new THREE.Color()}, uC2:{value:new THREE.Color()}, uC3:{value:new THREE.Color()}, uPaint:{value:new THREE.Color()},
  uMode:{value:1}, uStone:{value:0}, uAccent:{value:.5}, uGlitter:{value:.5}, uBubbles:{value:.3}, uTint:{value:.6}, uScale:{value:1.6}, uOff:{value:new THREE.Vector3()}, uFlake:{value:0}, uBrush:{value:0}, uEnamel:{value:new THREE.Color()}, uFill:{value:1}, uPatina:{value:0}, uNumPaint:{value:1} });
export const U=makeUniforms();   // the live (active) design's look; every other design in a mixed set gets its own set (see lookFor)

export const GLSL_NOISE = `
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
vec3 h33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}
vec3 stonePattern(vec3 p, vec3 q){
  float a=uAccent; vec3 c;
  if(uStone==0){                                   // marble: veins
    float v=1.-abs(sin(q.x*4.+q.z*2.+fbm(q*2.)*7.));
    vec3 base=mix(uC1,uC2,smoothstep(.2,.7,fbm(q*.9)));
    return mix(base,uC3,smoothstep(1.-(.03+.17*a),1.,v)*.85);
  }
  if(uStone==1){                                   // granite: speckle
    vec3 base=mix(uC1,uC2,smoothstep(.35,.65,fbm(p*3.)));
    float dark=smoothstep(1.-(.05+.17*a),1.-(.05+.17*a)+.04,vn(p*58.)), pale=smoothstep(.84,.88,vn(p*46.+11.));
    c=mix(base,uC3,dark*.95); return mix(c,mix(uC1,vec3(1.),.55),pale*.45);
  }
  if(uStone==2){                                   // malachite: concentric bands
    vec3 q2=p+.55*vec3(fbm(p),fbm(p+vec3(5.2,1.3,2.8)),fbm(p+vec3(9.1,4.7,7.3)));
    float w=fbm(q2*1.1), b1=.5+.5*sin(w*70.), b2=.5+.5*sin(w*28.);
    c=mix(uC1,uC2,smoothstep(.3,.7,b1)); return mix(c,uC3,smoothstep(.72,.95,b2)*(.35+.65*a));
  }
  if(uStone==3){                                   // lapis lazuli: deep blue, calcite streaks, pyrite flecks
    c=mix(uC1,uC2,smoothstep(.3,.75,fbm(q*1.1)));
    c=mix(c,vec3(.86,.89,.96),smoothstep(.62,.8,fbm(q*2.3+4.))*.5*(.2+a));
    vec3 g=p*95.; float fd=length(fract(g)-.5); return mix(c,uC3,step(1.-(.02+.08*a),h13(floor(g)))*smoothstep(.42,.18,fd));
  }
  if(uStone==4){                                   // agate / onyx: banded layers
    float t=q.y*7.+fbm(q*1.5)*5., s=.5+.5*sin(t*6.2832);
    c=mix(uC1,uC2,s); c=mix(c,uC3,smoothstep(.8,.97,.5+.5*sin(t*3.1416+1.))*(.3+.7*a));
    return mix(c,vec3(1.),smoothstep(.96,1.,s)*.3);
  }
  if(uStone==5){                                   // jasper: blotches with dark hairlines
    c=mix(uC1,uC2,smoothstep(.35,.6,fbm(q*1.3))); c=mix(c,uC3,smoothstep(.55,.7,fbm(q*2.1+9.))*(.35+.65*a));
    float w=1.-abs(sin(q.z*12.+fbm(q*4.)*8.)); return c*(1.-.35*smoothstep(.93,1.,w));
  }
  if(uStone==6){                                   // obsidian: glassy, faint flow bands
    c=uC1*(.6+.4*fbm(q*.8)); float flow=smoothstep(.9,1.,.5+.5*sin(q.x*9.+fbm(q*2.)*6.));
    return mix(c,uC3,flow*.4*(.3+a));
  }
  if(uStone==8){                                   // amethyst: deep violet zoning crossed by crisp pale quartz veins, with brighter 'lit from within' pockets
    c=mix(uC1,uC2,smoothstep(.25,.75,fbm(q*1.3)));
    float z=.5+.5*sin(q.y*8.+fbm(q*2.2)*7.);
    c=mix(c,uC2*1.25,smoothstep(.6,.95,z)*.45);
    float v1=1.-abs(sin(q.x*5.+q.z*3.+fbm(q*2.6)*8.)), v2=1.-abs(sin(q.y*7.-q.x*2.+fbm(q*3.2+5.)*9.));
    float veins=max(smoothstep(.9,.985,v1),smoothstep(.93,.99,v2)*.7)*(.45+.55*a);
    return mix(c,uC3,veins);
  }
  if(uStone==9){                                   // tiger's eye: stripes running across the stone (with the brushed grain), irregular but not swirled
    float fib=fbm(vec3(p.x*2.2,p.y*46.,p.z*2.2)), band=.5+.5*sin(p.y*11.+fbm(p*1.3)*2.8+fbm(p*3.4+7.)*.9);
    c=mix(uC1,uC2,smoothstep(.42,.7,band*.8+fib*.35));                                       // mostly dark brown with gold stripes
    c=mix(c,uC3,smoothstep(.72,.97,band)*smoothstep(.35,.7,fib)*(.25+.7*a));                 // bright gold on the stripe crests
    float low=smoothstep(.12,.5,fbm(vec3(p.x*1.4,p.y*7.,p.z*1.4)))*.7+.3;                    // dark lowlights between the stripes
    return c*mix(.4,1.,low)*(1.-.5*smoothstep(.2,.0,band));
  }
  if(uStone==10){                                  // opal: milky body with drifting patches of play-of-colour
    vec3 rb=.5+.5*cos(6.2832*(fbm(p*3.5)*1.6+vec3(0.,.33,.67)));
    c=mix(uC1,uC2,smoothstep(.3,.7,fbm(q*.9)));
    float pl=smoothstep(.4,.62,fbm(q*2.4+3.)), fleck=smoothstep(.45,.8,vn(p*16.));
    return mix(c,mix(uC3,rb,.8),pl*(.45+.55*a)*(.5+.5*fleck));
  }
  float w=1.-abs(fbm(q*3.)*2.-1.);                 // turquoise: matrix webbing
  return mix(mix(uC1,uC2,fbm(q*.9)),uC3,smoothstep(.88,.99,w)*(.4+.6*a));
}
vec3 pattern(vec3 p){
  if(uMode==0) return uC1;
  vec3 q=p+1.7*vec3(fbm(p),fbm(p+vec3(5.2,1.3,2.8)),fbm(p+vec3(9.1,4.7,7.3)));
  if(uMode==1){
    float w=.5+.5*sin(q.x*3.+q.y*2.+fbm(q*1.3)*9.);
    vec3 c=mix(uC1,uC2,smoothstep(.2,.8,w));
    return mix(c,uC3,smoothstep(.55,.85,fbm(q*1.6+3.))*.9);
  }
  return stonePattern(p,q);
}`;

export const GLSL_VOLUME = `
// fake the inside of a cast-resin die: march a few layers along the refracted ray through dye clouds, glitter and bubbles
vec3 volume(vec3 p, vec3 v, vec3 n, out vec3 glow){
  vec3 d=refract(normalize(v),normalize(n),1./1.5); vec3 acc=vec3(0.); float ws=0.; glow=vec3(0.);
  for(int i=0;i<6;i++){
    float t=(float(i)+.5)/6.*1.5, w=exp(-t*.9);
    vec3 q=(p+d*t)*uScale+uOff;
    float c=fbm(q*.9);
    vec3 col=mix(uC1,uC2,smoothstep(.3,.7,c)); col=mix(col,uC3,smoothstep(.6,.85,fbm(q*1.7+3.))*.8);
    acc+=col*w; ws+=w;
    vec3 g=(p+d*t)*8.; vec3 cell=floor(g); float h=h13(cell);                       // glitter
    if(h>1.-uGlitter*.09){ vec3 o=h33(cell)-.5; float dd=length(fract(g)-.5-o*.5); float tw=.5+.5*sin(dot(v,h33(cell+1.)*30.)+h*40.);
      glow+=vec3(1.,.96,.88)*smoothstep(.2,.0,dd)*tw*2.2*w; }
    vec3 b=(p+d*t)*3.5+vec3(7.,3.,1.); vec3 bc=floor(b); float bh=h13(bc);          // bubbles
    if(bh>1.-uBubbles*.1){ vec3 o=h33(bc)-.5; float r=length(fract(b)-.5-o*.4); float rim=smoothstep(.2,.17,r)-smoothstep(.17,.13,r);
      glow+=vec3(.8,.9,1.)*rim*.9*w; acc*=1.-.12*smoothstep(.17,.0,r); }
  }
  return acc/ws;
}`;
export function makeMaterial(atlas,uni=U){
  const m=new THREE.MeshPhysicalMaterial({color:0xffffff, bumpMap:atlas.bump, bumpScale:2.2});
  m.userData.fx={uGlow:{value:0},uGray:{value:0},uGlowCol:{value:new THREE.Color(0xffcf4a)}};   // nat 20 glow / nat 1 desaturation
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni, m.userData.fx, {uMask:{value:atlas.mask}});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>',`#include <common>
        attribute vec4 cellB; attribute float rec; varying float vRec; varying vec4 vCell; varying vec3 vOP; varying vec2 vPUv; varying vec3 vView; varying vec3 vONrm;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vOP=position; vPUv=uv; vCell=cellB; vRec=rec; vView=position-(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz; vONrm=normal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform vec3 uC1,uC2,uC3,uPaint,uOff,uGlowCol; uniform float uGlow,uGray; uniform int uMode, uStone; uniform float uScale,uFlake,uBrush,uAccent; uniform sampler2D uMask;
        varying vec4 vCell; varying vec3 vOP; varying vec2 vPUv; varying vec3 vView; varying vec3 vONrm;
        uniform float uGlitter,uBubbles,uTint; varying float vRec; uniform vec3 uEnamel; uniform float uFill,uPatina,uNumPaint;
        bool inCell(vec2 u){return u.x>=vCell.x&&u.y>=vCell.y&&u.x<=vCell.z&&u.y<=vCell.w;}
        vec4 cellTex(sampler2D t, vec2 u, vec4 off){vec4 s=texture2D(t,clamp(u,vCell.xy,vCell.zw)); return inCell(u)?s:off;}   // sample in uniform control flow (derivatives are undefined inside a branch: dotted ghost rectangle at the cell edge on 2x2-quad GPUs), then select
        vec4 bumpSample(sampler2D t, vec2 u){return cellTex(t,u,vec4(1.));}
        ${GLSL_NOISE}
        ${GLSL_VOLUME}`)
      .replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment.split('texture2D( bumpMap, ').join('bumpSample( bumpMap, '))
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 mk = cellTex(uMask,vPUv,vec4(0.)).rgb;
        float pm = smoothstep(.35,.65,mk.r)*uNumPaint;
        float pfo = smoothstep(.35,.65,mk.g)*(1.-smoothstep(.35,.65,mk.r))*uFill;
        vec3 volGlow=vec3(0.); vec3 baseCol = uMode==3 ? (gl_FrontFacing ? volume(vOP,vView,vONrm,volGlow) : uC1) : pattern(vOP*uScale+uOff);
        // epoxy: the colour only tints what is seen through the die (transmission multiplies by diffuse), so keep it light
        diffuseColor.rgb = mix(uMode==3 ? mix(vec3(1.),baseCol,uTint) : baseCol, uPaint, pm);
        diffuseColor.rgb = mix(diffuseColor.rgb, uEnamel, pfo); pm = max(pm,pfo);
        float pmFx = max(pm, smoothstep(.35,.65,mk.g)*.75);   // PD-142.38.16: etched (unfilled) filigree also goes duller and less metal, like text on metal, so the lines do not glint and shimmer
        float pat = clamp(uPatina*smoothstep(.05,.9,vRec)*(.6+.8*vn(vOP*26.))*(1.-pm),0.,1.);   // recessed panels go dark and dull
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.5,.58,.46), pat);
        float lumD=dot(diffuseColor.rgb,vec3(.3,.59,.11)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lumD*.6),uGray)*(1.-.4*uGray);
        volGlow = (volGlow + (uMode==3 ? baseCol*.06 : vec3(0.))) * (1.-pm);
        volGlow = mix(volGlow, vec3(0.), uGray) + uGlowCol*uGlow;`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance += volGlow;`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor + uBrush*(vn(vOP*vec3(2.,90.,2.))-.5), .5, pmFx); roughnessFactor = mix(roughnessFactor, .9, pat);`)
      .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
        metalnessFactor *= (1.-pmFx)*(1.-.7*pat);`)
      .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
        if(uFlake>0.){ vec3 fc=floor(vOP*140.); vec3 r=h33(fc)-.5; float on=step(.55,h13(fc+7.));
          normal = normalize(normal + (normalMatrix_dummy(r))*uFlake*on*(1.-pm)); }`)
      .replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
        #ifdef USE_TRANSMISSION
          material.transmission *= (1.-pm);
        #endif`);
    // flakes perturb in view space; tiny helper so the line above stays readable
    sh.fragmentShader = sh.fragmentShader.replace('normalMatrix_dummy(r)','(r*2.)');
  };
  return m;
}

