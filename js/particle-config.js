// Todos los controles del núcleo, la galaxia y la interacción viven aquí.
export const PARTICLE_CONFIG={
 count:6500,mobileCount:3200,maxDpr:2,renderPixelBudget:650000,
 particleColor:'#ffffff',
 beamColor:'#3ddc97',beamColorTo:'#3b9eff',beamColorSeconds:11,beamCoreWhite:.93,beamGlowLift:.10,beamDustColor:'#c5ddd4',beamCoreStart:.94,
 beamStrength:1.12,beamSeconds:2.4,assemblyDelay:.20,assemblySeconds:3.7,textDelay:.55,textSeconds:3.35,introLineStagger:.18,
 ringFlowSpeed:.1365,ringMotionSpeed:.65,ringOpacity:.90,
 bandRadius:.30,bandThickness:.084,bandHeight:.0728,bandShear:1.5,
 ringGapDegrees:25,ringTipFade:.008,ringClearance:.40,gapDensity:.025,gapOpacity:.12,
 cameraFov:48,cameraDistance:1.12,beamLength:1.24,beamWorldRadius:.0082,beamSegments:64,beamLengthSegments:96,bloomStrength:.075,bloomRadius:.08,bloomThreshold:.20,bloomChromaMin:.24,bloomResolution:.5,bloomMobileResolution:.35,
 beamFresnel:.85,beamNoiseSpeed:.38,beamNoiseScale:7,beamThicknessWave:.065,beamPulseIntensity:.045,beamEnvelopeRadius:1.65,beamEnvelopeOpacity:.12,beamCoreRadius:.24,
 ringLagA:.65,ringLagB:1.05,ringWobble:1.4,ringBreath:.003,ringOrientation:58,
 beamDustCount:800,mobileBeamDustCount:250,beamDustLength:.84,beamDustWaist:.006,beamDustEndRadius:.045,beamDustSpin:.52,beamDustFlow:.02925,beamDustOpacity:.17,
 sphereRadius:.0038,sphereMobileRadius:.0028,sphereDiffuse:.30,sphereAmbient:.68,sphereSpecular:.72,sphereShininess:80,sphereRim:.48,sphereRimPower:10,
 sphereFocusRange:.18,sphereDof:.18,sphereMobileDof:.12,sphereLodPixels:4.5,sphereMobileLodPixels:6,
 ringPointerRadius:110,ringPointerForce:3.4,ringPointerDepth:.85,ringPointerSwirl:.65,ringReturnSpread:.5,ringActivityBrightness:.25,
 beamCycleSeconds:50,beamMaxAngle:45,beamPulseSpeed:.215,turbulenceSpeed:.115,
 scrollAcceleration:2.6,scrollExtraAngle:12,scrollReturn:1.25,scrollAttack:.12,scrollVelocityReference:2.4,
 turbulence:.022,
 spring:38,damping:11,repulsionRadius:100,repulsionForce:4.0,trailSeconds:1.15,trailCapacity:8,
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
 return Math.round(Math.min(60000,Math.max(mobile?1800:5000,memory<=2?Math.min(requested,5000):requested)));
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
