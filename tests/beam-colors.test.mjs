import test from 'node:test';
import assert from 'node:assert/strict';
import {hexToLinear,linearToOklab,oklabToLinear,beamColors} from '../js/beam-colors.js';
import {PARTICLE_CONFIG as config} from '../js/particle-config.js';
const close=(a,b,tolerance=2e-6)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<tolerance,`${a} ≈ ${b}`));
test('OKLab matches known red and white, with reversible conversion',()=>{
 close(linearToOklab([1,0,0]),[.627955,.224863,.125846]);close(linearToOklab([1,1,1]),[1,0,0]);
 for(const hex of ['#3ddc97','#3b9eff','#ffffff'])close(oklabToLinear(linearToOklab(hexToLinear(hex))),hexToLinear(hex));
});
test('11 second round trip reaches both colors and closes smoothly',()=>{
 const p=config.beamColorSeconds;
 close(beamColors(0,config).body,hexToLinear(config.beamColor));close(beamColors(p/2,config).body,hexToLinear(config.beamColorTo));
 close(beamColors(p,config).body,beamColors(0,config).body);close(beamColors(p-.0001,config).body,beamColors(p+.0001,config).body);
});
test('perceptual midpoint is turquoise and the core remains nearly white',()=>{
 const color=beamColors(config.beamColorSeconds/4,config),a=linearToOklab(hexToLinear(config.beamColor)),b=linearToOklab(hexToLinear(config.beamColorTo));
 assert.ok(Math.abs(linearToOklab(color.body)[0]-(a[0]+b[0])/2)<2e-6);
 assert.ok(color.body[1]>color.body[0]*5&&color.body[2]>color.body[0]*5);assert.ok(Math.min(...color.core)>.85);
});
