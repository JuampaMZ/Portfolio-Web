// Todos los controles del núcleo, la galaxia y la interacción viven aquí.
export const PARTICLE_CONFIG={
 count:32000,mobileCount:10000,maxDpr:2,
 size:1.65,brightness:.85,colorA:'#355462',colorB:'#627183',activeColor:'#64dfff',
 beamColor:'#80d1ff',beamStrength:1.7,beamSeconds:1.7,assemblyDelay:.65,assemblySeconds:2.8,textDelay:3.55,textSeconds:1.05,
 orbitSpeed:.21,cloudSpeed:.10,precession:.0125,
 bandRadius:.30,bandThickness:.09,bandHeight:.085,bandDensity:.86,bandShear:1.5,
 beamCycleSeconds:50,beamMaxAngle:28,beamDepthAmplitude:.30,bandLag:.85,beamPulseSpeed:.215,turbulenceSpeed:.115,
 turbulence:.022,cycleSeconds:48,infallAmount:.92,ejectionAmount:.44,
 spring:52,damping:12,repulsionRadius:100,repulsionForce:4.0,trailSeconds:1.15,trailCapacity:8,
 backCount:2200,mobileBackCount:700,frontCount:24,mobileFrontCount:8,
 galaxySpeed:.325,backSize:1.9,frontSize:5.8,backOpacity:.70,frontOpacity:.18,
 backColor:'#6f94ac',frontColor:'#a4cfdf',twinkle:.20,twinkleSpeed:.5,parallax:.05,
 gyroEnabled:true,gyroRange:20,gyroMaxDisplacement:22,gyroSmoothing:.35,gyroMaxTilt:3,
 gyroBackPixels:7,gyroFrontPixels:18,gyroCorePixels:12,gyroAuroraPixels:3,
 auroraColorA:'#3ecb8d',auroraColorB:'#2d9cae',auroraColorC:'#6653bb',auroraColorD:'#285d98',
 auroraIntensity:.16,auroraSpeed:.035,auroraNoiseScale:2.2,auroraCurtains:3,auroraScroll:.45,auroraPointer:.8,auroraResolution:.25,auroraMobileResolution:.22,
 galaxySpring:22,galaxyDamping:9,galaxyRepulsion:1.7
};
export function particleBudget(width,{coarse=false,memory=8}={},config=PARTICLE_CONFIG){
 const mobile=width<=700||coarse,requested=mobile?config.mobileCount:config.count;
 return Math.round(Math.min(60000,Math.max(mobile?6000:20000,memory<=2?Math.min(requested,10000):requested)));
}
export function layerBudget(width,front=false,{coarse=false}={},config=PARTICLE_CONFIG){
 return Math.max(1,Math.round((width<=700||coarse)?(front?config.mobileFrontCount:config.mobileBackCount):(front?config.frontCount:config.backCount)));
}
const smooth=(start,end,value)=>{const t=Math.max(0,Math.min(1,(value-start)/(end-start)));return t*t*(3-2*t);};
export function introState(time,config=PARTICLE_CONFIG){
 return {beam:smooth(0,config.beamSeconds,time),assembly:smooth(config.assemblyDelay,config.assemblyDelay+config.assemblySeconds,time),text:smooth(config.textDelay,config.textDelay+config.textSeconds,time)};
}
