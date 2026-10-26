// Todos los controles del núcleo, la galaxia y la interacción viven aquí.
export const PARTICLE_CONFIG={
 count:60000,mobileCount:19000,maxDpr:2,
 size:1.65,brightness:.85,particleColor:'#ffffff',particleIntensity:1.04,ringPointScale:.90,
 beamCoreColor:'#efffe6',beamColor:'#39ff14',beamGlowColor:'#7cff3a',beamDustColor:'#97d878',beamCoreStart:.94,
 beamStrength:1.7,beamSeconds:1.7,assemblyDelay:.65,assemblySeconds:2.8,textDelay:3.55,textSeconds:1.05,
 ringFlowSpeed:.21,
 bandRadius:.30,bandThickness:.084,bandHeight:.0728,bandShear:1.5,
 ringGapDegrees:25,ringTipFade:.008,ringClearance:.40,gapDensity:.025,gapOpacity:.12,
 cameraFov:48,cameraDistance:1.12,beamLength:1.24,beamWorldRadius:.0055,beamSegments:48,bloomStrength:.14,bloomRadius:.12,bloomThreshold:1.1,bloomResolution:.5,bloomMobileResolution:.35,
 ringLagA:.65,ringLagB:1.05,ringWobble:1.4,ringBreath:.003,ringOrientation:58,
 beamDustCount:2200,mobileBeamDustCount:750,beamDustLength:.84,beamDustWaist:.006,beamDustEndRadius:.045,beamDustSpin:.8,beamDustFlow:.045,beamDustOpacity:.20,
 beamCycleSeconds:50,beamMaxAngle:45,beamDepthAmplitude:.30,beamPulseSpeed:.215,turbulenceSpeed:.115,
 turbulence:.022,
 spring:52,damping:12,repulsionRadius:100,repulsionForce:4.0,trailSeconds:1.15,trailCapacity:8,
 smallCount:2200,mediumCount:420,mobileSmallCount:700,mobileMediumCount:120,frontCount:24,mobileFrontCount:8,
 smallSizeMin:.7,smallSizeMax:1.7,mediumSizeMin:2,mediumSizeMax:3.5,frontSizeMin:6,frontSizeMax:11,
 smallOpacity:.76,mediumOpacity:.82,frontOpacity:.22,galaxyBrightness:1.15,
 travelSpeed:.014,depthTravelRatio:.35,planetHalo:.26,planetTrail:.07,mediumSpeed:1.35,frontSpeed:2.1,mediumParallax:1.4,frontParallax:2.2,
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
 const mobile=width<=700||coarse;
 return Math.max(1,Math.round(front?(mobile?config.mobileFrontCount:config.frontCount):galaxySmallBudget(width,{coarse},config)+(mobile?config.mobileMediumCount:config.mediumCount)));
}
export function galaxySmallBudget(width,{coarse=false}={},config=PARTICLE_CONFIG){return Math.max(0,Math.round(width<=700||coarse?config.mobileSmallCount:config.smallCount));}
export function nucleusGroups(count,width,{coarse=false}={},config=PARTICLE_CONFIG,gap=config.ringGapDegrees*Math.PI/180){
 const dust=Math.round(Math.min(count*.24,Math.max(0,width<=700||coarse?config.mobileBeamDustCount:config.beamDustCount)));
 const ratio=Math.min(.12,Math.max(0,config.gapDensity))*gap/(2*Math.PI-gap);
 const ring=Math.max(1,Math.round((count-dust)/(1+ratio)));
 return {ring,gap:count-dust-ring,dust};
}
const smooth=(start,end,value)=>{const t=Math.max(0,Math.min(1,(value-start)/(end-start)));return t*t*(3-2*t);};
export function introState(time,config=PARTICLE_CONFIG){
 return {beam:smooth(0,config.beamSeconds,time),assembly:smooth(config.assemblyDelay,config.assemblyDelay+config.assemblySeconds,time),text:smooth(config.textDelay,config.textDelay+config.textSeconds,time)};
}
