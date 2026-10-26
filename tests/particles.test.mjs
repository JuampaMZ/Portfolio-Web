import test from 'node:test';
import assert from 'node:assert/strict';
import {PARTICLE_CONFIG,particleBudget,layerBudget,galaxySmallBudget,nucleusGroups,introState} from '../js/particle-config.js';
import {createParticleInput} from '../js/particle-input.js';

test('the beam starts first, assembly finishes before the text entrance, and all phases finish',()=>{
 const c=PARTICLE_CONFIG;
 assert.deepEqual(introState(0),{beam:0,assembly:0,text:0});
 assert.ok(introState(c.assemblyDelay*.7).beam>0);assert.equal(introState(c.assemblyDelay*.7).assembly,0);
 const assembled=introState(c.assemblyDelay+c.assemblySeconds);assert.equal(assembled.assembly,1);assert.equal(assembled.text,0);
 assert.deepEqual(introState(20),{beam:1,assembly:1,text:1});
 for(let i=1;i<60;i++)for(const key of ['beam','assembly','text'])assert.ok(introState(i/10)[key]>=introState((i-1)/10)[key]);
});
test('desktop budgets stay bounded and every layer reduces its load on mobile',()=>{
 assert.ok(particleBudget(1440)>=5000&&particleBudget(1440)<=60000);assert.ok(particleBudget(390)<particleBudget(1440));
 assert.ok(particleBudget(390,{memory:2})<=10000);assert.ok(particleBudget(1024,{coarse:true})<particleBudget(1440));
 assert.equal(layerBudget(1024,false,{coarse:true}),layerBudget(390));assert.ok(layerBudget(390)<layerBudget(1440));assert.ok(layerBudget(390,true)<layerBudget(1440,true));
 assert.ok(layerBudget(1440)>layerBudget(1440,true)*20);
 assert.equal(layerBudget(1440),PARTICLE_CONFIG.smallCount+PARTICLE_CONFIG.mediumCount);assert.equal(galaxySmallBudget(390),PARTICLE_CONFIG.mobileSmallCount);
 assert.ok(PARTICLE_CONFIG.smallCount>PARTICLE_CONFIG.mediumCount&&PARTICLE_CONFIG.mediumCount>PARTICLE_CONFIG.frontCount);
 assert.ok(PARTICLE_CONFIG.smallSizeMax<PARTICLE_CONFIG.mediumSizeMin&&PARTICLE_CONFIG.mediumSizeMax<PARTICLE_CONFIG.frontSizeMin);
 assert.ok(PARTICLE_CONFIG.frontSpeed>PARTICLE_CONFIG.mediumSpeed&&PARTICLE_CONFIG.frontParallax>PARTICLE_CONFIG.mediumParallax);assert.ok(PARTICLE_CONFIG.maxDpr<=2);assert.ok(PARTICLE_CONFIG.frontOpacity<=.25);
});
test('mouse and touch share passive input, retain a bounded wake and release it smoothly',()=>{
 const original={window:globalThis.window,document:globalThis.document,performance:globalThis.performance};let now=0;
 class Target extends EventTarget{options=[];addEventListener(type,fn,options){this.options.push(options);super.addEventListener(type,fn,options);}}
 const w=new Target(),d=new Target();globalThis.window=w;globalThis.document=d;Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
 const dispatch=(type,props)=>{const event=Object.assign(new Event(type,{cancelable:true}),props);w.dispatchEvent(event);assert.equal(event.defaultPrevented,false);};
 const input=createParticleInput();
 try{
  dispatch('pointermove',{pointerType:'mouse',pointerId:1,clientX:300,clientY:200});assert.equal(input.sample(600,400)[2],1);
  for(let i=0;i<20;i++){now+=50;dispatch('pointermove',{pointerType:'mouse',pointerId:1,clientX:100+i*15,clientY:200});}
  assert.equal(input.sample(600,400).length,32);
  dispatch('pointerdown',{pointerType:'touch',pointerId:7,clientX:300,clientY:200});dispatch('pointercancel',{pointerType:'touch',pointerId:7});
  now+=50;dispatch('touchmove',{touches:[{identifier:7,clientX:320,clientY:230}]});assert.equal(input.sample(600,400)[2],1);
  dispatch('touchend',{});now+=250;const fading=input.sample(600,400)[2];assert.ok(fading>0&&fading<1);
  now+=5000;assert.ok(input.sample(600,400).every(value=>value===0));assert.ok(w.options.every(options=>options.passive===true));
  input.dispose();dispatch('pointermove',{pointerType:'mouse',pointerId:1,clientX:300,clientY:200});assert.ok(input.sample(600,400).every(value=>value===0));
 }finally{
  input.dispose();globalThis.window=original.window;globalThis.document=original.document;Object.defineProperty(globalThis,'performance',{value:original.performance,configurable:true});
 }
});

test('the axial hourglass and fine gap thread stay inside the mobile and desktop particle budgets',()=>{
 for(const width of [390,1440]){const total=particleBudget(width),groups=nucleusGroups(total,width);assert.equal(groups.ring+groups.gap+groups.dust,total);assert.ok(groups.dust>0&&groups.ring>groups.dust*5);assert.ok(groups.gap>0&&groups.gap<groups.ring*.02);}
 assert.ok(nucleusGroups(10000,390).dust<nucleusGroups(32000,1440).dust);
 const without=nucleusGroups(32000,1440,{}, {...PARTICLE_CONFIG,gapDensity:0});assert.equal(without.gap,0);
});

test('detail budgets retain band geometry and reduce angular flow and dust motion by 35%',()=>{
 assert.equal(PARTICLE_CONFIG.bandThickness,.084);assert.equal(PARTICLE_CONFIG.bandHeight,.0728);
 assert.ok(Math.abs(PARTICLE_CONFIG.ringFlowSpeed/.21-.65)<1e-8);assert.ok(Math.abs(PARTICLE_CONFIG.beamDustSpin/.8-.65)<1e-8);assert.ok(Math.abs(PARTICLE_CONFIG.beamDustFlow/.045-.65)<1e-8);
 assert.ok(PARTICLE_CONFIG.ringOpacity<1&&PARTICLE_CONFIG.ringOpacity>.8);assert.ok(particleBudget(390)<5000&&particleBudget(1440)<20000);
});
