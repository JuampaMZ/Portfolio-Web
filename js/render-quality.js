// Probe actual renderability, not just float-texture sampling support. No extra GL context.
export function gpuCapabilities(gl){
 if(!gl||gl.isContextLost())return {webgl2:false,hdr:false};
 const floatExtension=!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float'));
 function renderable(hdr){
  const previous=gl.getParameter(gl.FRAMEBUFFER_BINDING),texture=gl.createTexture(),frame=gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,hdr?gl.RGBA16F:gl.RGBA8,4,4,0,gl.RGBA,hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
  gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER,previous);gl.bindTexture(gl.TEXTURE_2D,null);gl.deleteFramebuffer(frame);gl.deleteTexture(texture);return ok;
 }
 const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision||0;
 return {webgl2:true,rgba8:renderable(false),hdr:floatExtension&&renderable(true),precision,feedback:gl.getParameter(gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS),maxSize:Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))};
}
export function qualityProfile(cap,width,{coarse=false,memory=8,forceLow=false,forceLdr=false}={},config){
 const mobile=width<=700||coarse,low=forceLow||forceLdr||memory<=2||!cap.hdr,hdr=!!cap.hdr&&!low;
 if(!cap.webgl2||!cap.rgba8||cap.precision<20||cap.feedback<2)return {name:'canvas-safe',mobile,hdr:false,fallback:true};
 const ringScale=mobile?1:config.desktopRingScale;
 const base=mobile?(low?config.mobileLowCount:config.mobileCount):Math.round((config.count-config.beamDustCount)*ringScale+config.beamDustCount);
 return {name:mobile?(low?'mobile-safe':'mobile-hdr'):(hdr?'desktop-hdr':'desktop-ldr'),mobile,hdr,fallback:false,
  coreCount:base,beamCount:mobile?(low?config.mobileLowBeamCount:config.mobileBeamCount):config.beamParticleCount,
  pixelBudget:mobile?(low?config.mobileLowPixelBudget:config.mobilePixelBudget):config.renderPixelBudget,maxDpr:mobile?config.mobileMaxDpr:config.maxDpr,
  bloomScale:mobile?.24:config.bloomResolution,bloomStrength:hdr?(mobile?config.mobileBloomStrength:config.desktopBloomStrength):0,ringScale,
  sceneScale:mobile?null:.82,beamLengthScale:mobile?1:config.desktopRingScale};
}
