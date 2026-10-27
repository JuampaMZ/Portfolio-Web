import {createAuroraRenderer} from './aurora-renderer.js';
import {PARTICLE_CONFIG as config,layerBudget,galaxySmallBudget} from './particle-config.js';
import {createParticleInput} from './particle-input.js';
import {gpuMath,emptyFragment,rgb,createGpuResources,createGpuState} from './particle-gpu.js';

export const galaxySource=`
uniform vec2 uResolution;uniform float uTime,uLayer,uCount,uSmallCount,uSpeed,uDepthRatio,uScroll,uParallax,uMediumSpeed,uFrontSpeed,uMediumParallax,uFrontParallax;uniform vec2 uPointerPan;
float sizeClass(float id){return uLayer>.5?2.:(id<uSmallCount?0.:1.);}
float parallaxFactor(float kind){return kind>1.5?uFrontParallax:(kind>.5?uMediumParallax:1.);}
float travelClock(float id,float time){
 float kind=sizeClass(id),speed=uSpeed*(kind>1.5?uFrontSpeed:(kind>.5?uMediumSpeed:1.))*(.75+random(id+29.)*.5);
 return time*speed/(1.+uResolution.x/uResolution.y*.5)+random(id+7.);
}
struct Journey{vec3 position;vec2 direction;float visibility;};
Journey journey(float id,float time){
 float aspect=uResolution.x/uResolution.y,clock=travelClock(id,time),cycle=floor(clock),phase=fract(clock),key=id+cycle*8191.;
 float angle=random(key+101.)*6.2831853;vec2 direction=vec2(cos(angle),sin(angle));
 direction=normalize(direction+vec2(.00013,.00017));
 vec2 anchor=(vec2(random(key+137.),random(key+179.))-.5)*vec2(aspect*.64,.64),bounds=vec2(aspect*.5+.07,.57);
 vec2 a=(-bounds-anchor)/direction,b=(bounds-anchor)/direction,near=min(a,b),far=max(a,b);
 float entry=max(near.x,near.y),exit=min(far.x,far.y);vec2 position=anchor+direction*mix(entry,exit,phase);
 float depth=random(id+19.);
 if(random(id+227.)<uDepthRatio){float toward=random(key+251.)>.5?phase:1.-phase;depth=.5-.5*cos(toward*3.14159265);}
 Journey result;result.position=vec3(position,depth);result.direction=direction;
 result.visibility=smoothstep(0.,.025,phase)*(1.-smoothstep(.975,1.,phase));return result;
}
vec3 galacticRoute(float id){
 Journey trip=journey(id,uTime);float kind=sizeClass(id),depth=trip.position.z;
 float parallax=uScroll*uParallax*(.12+depth*.5)*.5*parallaxFactor(kind);
 return trip.position+vec3(uPointerPan*(kind>.5&&kind<1.5?1.3:1.)+vec2(0.,parallax),0.);
}
`;
const galaxySimulation=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uDt,uSpring,uDamping,uReset,uFrameDt;
out vec3 nextPosition,nextVelocity;
`+gpuMath+galaxySource+`
void main(){
 vec3 base=galacticRoute(float(gl_VertexID));
 vec3 force=-aPosition*uSpring-aVelocity*uDamping+pointerForce(vec3(base.xy+aPosition.xy,0.));
 nextVelocity=aVelocity+force*uDt;
 nextPosition=aPosition+nextVelocity*uDt;
 if(uReset>.5||floor(travelClock(float(gl_VertexID),uTime))!=floor(travelClock(float(gl_VertexID),uTime-uFrameDt))){nextPosition=vec3(0.);nextVelocity=vec3(0.);}
 gl_Position=vec4(0.);
}`;
const galaxyVertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aVelocity;
uniform float uDpr,uSmallOpacity,uMediumOpacity,uFrontOpacity,uTwinkle,uTwinkleSpeed;
uniform vec2 uSmallSize,uMediumSize,uFrontSize;
uniform vec4 uMasks[12];uniform int uMaskCount;
out float vOpacity,vDepth,vNear;out vec2 vDirection;
`+gpuMath+galaxySource+`
void main(){
 float id=float(gl_VertexID),seed=random(id+7.);Journey trip=journey(id,uTime);vec3 route=galacticRoute(id);vDirection=trip.direction;vec2 p=route.xy+aPosition.xy;
 gl_Position=vec4(p.x*2.*uResolution.y/uResolution.x,p.y*2.,0.,1.);
 float edge=(1.-smoothstep(.46,.52,abs(p.y)))*(1.-smoothstep(.46,.52,abs(p.x*uResolution.y/uResolution.x)));
 float kind=sizeClass(id),opacity=kind>1.5?uFrontOpacity:(kind>.5?uMediumOpacity:uSmallOpacity);
 float twinkle=1.-uTwinkle+uTwinkle*(.5+.5*sin(uTime*uTwinkleSpeed*(.3+seed*.7)+seed*41.));
 vOpacity=opacity*twinkle*edge*(.28+route.z*.72)*trip.visibility;vDepth=route.z;vNear=uLayer;
 if(uLayer>.5){
  // One candidate per text block may cross it, dimmed; the others fade out.
  float columns=ceil(sqrt(uCount*uResolution.x/uResolution.y)),rows=ceil(uCount/columns);
  for(int i=0;i<12;i++){
   if(i>=uMaskCount)break;vec4 r=uMasks[i];
   vec2 d=max(max(r.xy-p,p-r.zw),vec2(0.));
   vec2 center=(r.xy+r.zw)*.5-uPointerPan;
   float parallax=uScroll*uParallax*.37*.5*uFrontParallax;
   vec2 cell=clamp(floor(vec2(center.x*uResolution.y/uResolution.x+.5,center.y+.5-parallax)*vec2(columns,rows)),vec2(0.),vec2(columns-1.,rows-1.));
   float owner=cell.y*columns+cell.x,allowed=abs(id-owner)<.5?.22:0.;
   vOpacity*=mix(allowed,1.,smoothstep(0.,.035,length(d)));
  }
 }
 vec2 range=kind>1.5?uFrontSize:(kind>.5?uMediumSize:uSmallSize);
 gl_PointSize=max(1.,uDpr*mix(range.x,range.y,random(id+53.))*(.65+route.z*.75)*(kind>1.5?2.4:1.65));
}`;
const galaxyFragment=`#version 300 es
precision mediump float;
in float vOpacity,vDepth,vNear;in vec2 vDirection;uniform vec3 uColor;uniform float uBrightness,uHalo,uStreak;out vec4 color;
void main(){
 vec2 p=(gl_PointCoord*2.-1.)*vec2(1.,-1.);float r=dot(p,p);if(r>1.)discard;
 float bodyRadius=length(p)*(vNear>.5?2.6:1.9),body=1.-smoothstep(.55,1.,bodyRadius);
 float sphere=.55+.45*sqrt(max(0.,1.-bodyRadius*bodyRadius));
 float halo=exp(-r*3.5)*(1.-smoothstep(.65,1.,r))*uHalo*(vNear>.5?.65:.3);
 float behind=-dot(p,vDirection),lateral=dot(p,vec2(-vDirection.y,vDirection.x));
 float streak=exp(-pow(lateral/.14,2.))*smoothstep(.05,.25,behind)*(1.-smoothstep(.3,1.,behind))*uStreak*vNear;
 vec3 tint=mix(uColor,vec3(.82,.93,1.),vDepth*.28)*uBrightness;
 color=vec4(tint*(.8+sphere*.2),(body*sphere+halo+streak)*vOpacity);
}`;

export function createGalaxyRenderer(canvas,front=false){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)return null;
 const resources=createGpuResources(gl);let state=null,width=0,height=0,count=0,dpr=1,lastTime=null,accumulator=0,reset=true,disposed=false;
 const names=['uResolution','uTime','uLayer','uCount','uSpeed','uDepthRatio','uFrameDt','uHalo','uStreak','uSmallCount','uMediumSpeed','uFrontSpeed','uMediumParallax','uFrontParallax','uScroll','uParallax','uDt','uSpring','uDamping','uReset','uTrail[0]','uRadius','uRepulsion','uDpr','uSmallSize','uMediumSize','uFrontSize','uSmallOpacity','uMediumOpacity','uFrontOpacity','uBrightness','uTwinkle','uTwinkleSpeed','uPointerPan','uColor','uMasks[0]','uMaskCount'];
 function dispose(){if(disposed)return;disposed=true;state?.dispose();resources.dispose();}
 try{
  const simulation=resources.program(galaxySimulation,emptyFragment,names,true),points=resources.program(galaxyVertex,galaxyFragment,names);
  const api={
   resize(force=false){
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),budget=layerBudget(w,front,{coarse:matchMedia('(pointer:coarse)').matches}),ratio=Math.min(devicePixelRatio||1,config.maxDpr,w<=700?.85:1.25);
    if(!force&&width===w&&height===h&&budget===count&&ratio===dpr)return;
    width=w;height=h;count=budget;dpr=ratio;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    state?.dispose();state=createGpuState(gl,count);reset=true;lastTime=null;accumulator=0;canvas.dataset.ambientCount=String(count);
   },
   draw(time,trail,masks=new Float32Array(48),maskCount=0,clear=true){
    if(disposed||gl.isContextLost()||!state)return;
    const elapsed=lastTime===null?0:Math.max(0,time-lastTime),dt=Math.min(1/30,elapsed);lastTime=time;accumulator+=dt;
    function common(target){
     gl.useProgram(target.program);const u=target.u;
     gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uLayer,front?1:0);gl.uniform1f(u.uCount,count);
     gl.uniform1f(u.uSpeed,config.travelSpeed);gl.uniform1f(u.uDepthRatio,config.depthTravelRatio);gl.uniform1f(u.uSmallCount,galaxySmallBudget(width,{coarse:matchMedia('(pointer:coarse)').matches}));
     gl.uniform1f(u.uMediumSpeed,config.mediumSpeed);gl.uniform1f(u.uFrontSpeed,config.frontSpeed);gl.uniform1f(u.uMediumParallax,config.mediumParallax);gl.uniform1f(u.uFrontParallax,config.frontParallax);gl.uniform1f(u.uScroll,scrollY/height);gl.uniform1f(u.uParallax,config.parallax);gl.uniform2f(u.uPointerPan,trail[2]>0?trail[0]*(front?.018:.008):0,trail[2]>0?trail[1]*(front?.018:.008):0);
     gl.uniform4fv(u['uTrail[0]'],trail);gl.uniform1f(u.uRadius,config.repulsionRadius/height);gl.uniform1f(u.uRepulsion,config.galaxyRepulsion);
    }
    common(simulation);gl.uniform1f(simulation.u.uDt,1/60);gl.uniform1f(simulation.u.uFrameDt,Math.min(.2,elapsed));gl.uniform1f(simulation.u.uSpring,config.galaxySpring);gl.uniform1f(simulation.u.uDamping,config.galaxyDamping);
    let steps=Math.min(2,Math.floor((accumulator+1e-8)*60));if(reset)steps=Math.max(steps,1);
    for(let i=0;i<steps;i++){gl.uniform1f(simulation.u.uReset,reset?1:0);state.step();reset=false;}accumulator=Math.max(0,accumulator-steps/60);
    if(clear){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}common(points);const u=points.u;
    gl.uniform1f(u.uDpr,dpr);gl.uniform1f(u.uBrightness,config.galaxyBrightness);gl.uniform1f(u.uHalo,config.planetHalo);gl.uniform1f(u.uStreak,config.planetTrail);
    for(const [prefix,name]of[['small','Small'],['medium','Medium'],['front','Front']]){gl.uniform2f(u['u'+name+'Size'],config[prefix+'SizeMin'],config[prefix+'SizeMax']);gl.uniform1f(u['u'+name+'Opacity'],config[prefix+'Opacity']);}gl.uniform1f(u.uTwinkle,config.twinkle);gl.uniform1f(u.uTwinkleSpeed,config.twinkleSpeed);
    gl.uniform3fv(u.uColor,rgb(front?config.frontColor:config.backColor));gl.uniform4fv(u['uMasks[0]'],masks);gl.uniform1i(u.uMaskCount,front?maskCount:0);
    state.bind();gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,count);gl.disable(gl.BLEND);gl.bindVertexArray(null);
    canvas.dataset.animationTime=time.toFixed(2);
   },dispose
  };return api;
 }catch(error){dispose();console.warn('La galaxia conserva su fondo atmosférico.',error.message);return null;}
}

export function initAtmosphere(sharedInput=null){
 const controller=new AbortController(),input=sharedInput||createParticleInput();
 const on=(target,event,callback,options={})=>target?.addEventListener(event,callback,{passive:true,...options,signal:controller.signal});
 const back=document.createElement('canvas'),front=document.createElement('canvas');
 back.className='ambient-layer ambient-layer--back';front.className='ambient-layer ambient-layer--front';
 for(const element of [back,front]){element.setAttribute('aria-hidden','true');element.style.opacity='0';}document.body.prepend(back);document.body.append(front);
 let layers=[createGalaxyRenderer(back),createGalaxyRenderer(front,true)],raf=0,previous=0,time=0,disposed=false,lastMasks=-1000,lastBackgroundFrame=-Infinity,scrollFlow=scrollY/innerHeight,aurora=createAuroraRenderer(back,{shared:true});
 const masks=new Float32Array(48);let maskCount=0;
 let surfaceWidth=Math.max(1,back.clientWidth),surfaceHeight=Math.max(1,back.clientHeight);
 const visibleText=new Set(),textObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visibleText.add(entry.target);else visibleText.delete(entry.target);}lastMasks=-1000;});
 document.querySelectorAll('h1,h2,.cinema-description,.about-copy>p,.contact-lead').forEach(element=>textObserver.observe(element));
 function updateMasks(now){
  if(now-lastMasks<180)return;lastMasks=now;maskCount=0;masks.fill(0);
  for(const element of visibleText){
   if(maskCount>=12)break;if(element.closest('[aria-hidden="true"]'))continue;
   const r=element.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.width===0||r.height===0)continue;
   masks.set([(r.left-12-surfaceWidth*.5)/surfaceHeight,(surfaceHeight*.5-r.bottom-12)/surfaceHeight,(r.right+12-surfaceWidth*.5)/surfaceHeight,(surfaceHeight*.5-r.top+12)/surfaceHeight],maskCount++*4);
  }
 }
 function request(){if(!disposed&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(disposed||document.hidden)return;const dt=previous?Math.min((now-previous)/1000,.05):0;time+=dt;previous=now;
  updateMasks(now);const trail=input.sample(surfaceWidth,surfaceHeight);
  scrollFlow+=(scrollY/surfaceHeight-scrollFlow)*(1-Math.exp(-dt*2.4));
  const backgroundInterval=innerWidth>700&&!matchMedia('(pointer:coarse)').matches?1000/config.desktopBackgroundFps:0;
  if(now-lastBackgroundFrame>=backgroundInterval-.5){aurora?.draw(time,scrollFlow,trail,masks,maskCount);layers[0]?.draw(time,trail,masks,0,!aurora);layers[1]?.draw(time,trail,masks,maskCount);lastBackgroundFrame=now;}
    request();
 }
 function resize(force=false){surfaceWidth=Math.max(1,back.clientWidth);surfaceHeight=Math.max(1,back.clientHeight);layers.forEach(layer=>layer?.resize(force));aurora?.resize(force);lastMasks=-1000;request();}
 function dispose(){
  if(disposed)return;disposed=true;controller.abort();textObserver.disconnect();visibleText.clear();if(raf)cancelAnimationFrame(raf);layers.forEach(layer=>layer?.dispose());layers=[];aurora?.dispose();back.remove();front.remove();if(!sharedInput)input.dispose();
 }
 on(document,'visibilitychange',()=>{previous=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else request();});
 for(const [index,canvas]of[back,front].entries()){
  on(canvas,'webglcontextlost',event=>{event.preventDefault();layers[index]?.dispose();layers[index]=null;if(index===0){aurora?.dispose();aurora=null;}},{passive:false});
  on(canvas,'webglcontextrestored',()=>{layers[index]=createGalaxyRenderer(canvas,index===1);if(index===0)aurora=createAuroraRenderer(back,{shared:true});resize();});
 }
 resize();return {dispose,resize,setReveal(value){for(const element of [back,front])element.style.opacity=String(value);}};
}
