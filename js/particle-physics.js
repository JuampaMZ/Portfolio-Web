const TAU=Math.PI*2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};

export function makeScenePose(time,progress,pointer,width,height) {
  const yaw=progress*4.8+time*.075+pointer.x*(pointer.active||0)*.16;
  const roll=-.45+progress*1.2;
  const pitch=.45+Math.sin(time*.09)*.14+pointer.y*(pointer.active||0)*.10;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const matrix=new Float32Array([
    cy*cr,-cy*sr*cp-sy*sp,cy*sr*sp-sy*cp,
    sr,cr*cp,-cr*sp,
    sy*cr,-sy*sr*cp+cy*sp,sy*sr*sp+cy*cp
  ]);
  const mobile=width/height<1;
  return {matrix,progress,width,height,aspect:width/height,centerX:mobile?0:.38,centerY:mobile?.15:.10,
    cameraZ:(mobile?8.8:5.5)-progress*(mobile?.55:1.1),cameraY:.08,zoom:1+.09*Math.sin(progress*Math.PI)};
}

function ribbonDistance(x,y,z,phase) {
  const angle=Math.atan2(z,x),twist=angle*1.5+phase;
  const radial=Math.hypot(x,z)-(1.23+.13*Math.sin(angle*3+phase));
  const vertical=y-.24*Math.sin(angle*2+phase);
  const c=Math.cos(twist),s=Math.sin(twist);
  return (Math.hypot((c*radial+s*vertical)/.22,(-s*radial+c*vertical)/.38)-1)*.20;
}

function localDistance(x,y,z,progress) {
  const first=ribbonDistance(x,y,z,0);
  const angle=1.2+progress*.5,c=Math.cos(angle),s=Math.sin(angle);
  const ry=c*y+s*z,rz=-s*y+c*z;
  const c2=Math.cos(.5),s2=Math.sin(.5);
  const second=ribbonDistance(c2*x+s2*ry,-s2*x+c2*ry,rz,2.1);
  const h=clamp(.5+.5*(second-first)/.12,0,1);
  return second+(first-second)*h-.12*h*(1-h);
}

export function sculptureDistance(x,y,z,pose) {
  const m=pose.matrix;
  return localDistance(m[0]*x+m[3]*y+m[6]*z,m[1]*x+m[4]*y+m[7]*z,m[2]*x+m[5]*y+m[8]*z,pose.progress);
}

export function locateCursorCore(screenX,screenY,screenRadius,strength,pose,previous=null,dt=0) {
  const dx=(screenX-pose.centerX)*1.8/pose.zoom,dy=(screenY-pose.centerY)*1.8/pose.zoom,dz=-2.4;
  const length=Math.hypot(dx,dy,dz),rx=dx/length,ry=dy/length,rz=dz/length;
  let distance=0,hit=false;
  for(let step=0;step<90;step++) {
    const sdf=sculptureDistance(rx*distance,pose.cameraY+ry*distance,pose.cameraZ+rz*distance,pose);
    if(sdf<.004){hit=true;break;}
    distance+=Math.max(sdf*.8,.004);
    if(distance>pose.cameraZ+4)break;
  }
  const z=hit?pose.cameraZ+rz*distance:(previous?.center[2]??.8);
  const plane=(pose.cameraZ-z)*1.8/(2.4*pose.zoom);
  const center=new Float64Array([(screenX-pose.centerX)*plane,pose.cameraY+(screenY-pose.centerY)*plane,z]);
  const velocity=new Float64Array(3);
  if(previous&&dt>0&&strength>.1&&previous.strength>.1) {
    for(let axis=0;axis<3;axis++)velocity[axis]=(center[axis]-previous.center[axis])/dt;
    const speed=Math.hypot(...velocity);
    if(speed>5)for(let axis=0;axis<3;axis++)velocity[axis]*=5/speed;
  }
  return {center,velocity,radius:screenRadius*plane,strength,hit};
}

// Persistent velocity is reflected relative to the moving sphere. Position
// correction removes penetration; subsequent frames integrate the new velocity.
export function resolveSphereContact(positions,velocities,offset,center,coreVelocity,radius,restitution=.6) {
  let nx=positions[offset]-center[0],ny=positions[offset+1]-center[1],nz=positions[offset+2]-center[2];
  const distance=Math.hypot(nx,ny,nz);
  if(distance>=radius)return false;
  if(distance<1e-8){nx=1;ny=0;nz=0;}else{nx/=distance;ny/=distance;nz/=distance;}
  positions[offset]=center[0]+nx*(radius+.0005);
  positions[offset+1]=center[1]+ny*(radius+.0005);
  positions[offset+2]=center[2]+nz*(radius+.0005);
  const vx=velocities[offset]-coreVelocity[0],vy=velocities[offset+1]-coreVelocity[1],vz=velocities[offset+2]-coreVelocity[2];
  const normalSpeed=vx*nx+vy*ny+vz*nz;
  if(normalSpeed<0) {
    const bounce=-normalSpeed*restitution;
    velocities[offset]=(vx-normalSpeed*nx)*.96+nx*bounce+coreVelocity[0];
    velocities[offset+1]=(vy-normalSpeed*ny)*.96+ny*bounce+coreVelocity[1];
    velocities[offset+2]=(vz-normalSpeed*nz)*.96+nz*bounce+coreVelocity[2];
  }
  return true;
}


// Softened inverse-square gravity. Tangential momentum comes from the impact,
// not an imposed orbit or a time-dependent flow field.
export function gravityAcceleration(position,center,mu=.48,softening=.10) {
  const dx=center[0]-position[0],dy=center[1]-position[1],dz=center[2]-position[2];
  const denominator=Math.pow(dx*dx+dy*dy+dz*dz+softening*softening,1.5);
  return [mu*dx/denominator,mu*dy/denominator,mu*dz/denominator];
}

export function createParticleSimulation({count=22000,maxActive=1800,seed=72819}={}) {
  let state=seed>>>0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  const rest=new Float32Array(count*3),normals=new Float32Array(count*3),targets=new Float32Array(count*3);
  const positions=new Float32Array(count*3),velocities=new Float32Array(count*3),active=new Uint8Array(count);
  const targetVelocity=new Float32Array(count*3),normalWorld=new Float32Array(count*3),visible=new Float32Array(count);
  const radius=new Float32Array(count),tint=new Float32Array(count),noise=new Float32Array(count*3);
  const returning=new Uint8Array(count);
  const renderData=new Float32Array(count*12),cuts=new Float32Array(24*4),scars=[];
  let accumulator=0,initialized=false,liveCount=0;
  const fixedStep=1/120;
  for(let index=0;index<count;index++) {
    const a=random()*TAU;let b;
    do{b=random()*TAU;}while(random()>Math.hypot(.22*Math.sin(b),.38*Math.cos(b))/.38);
    const phase=index%2?2.1:0,twist=a*1.5+phase,c=Math.cos(twist),s=Math.sin(twist);
    const ellipseX=.22*Math.cos(b),ellipseY=.38*Math.sin(b);
    const crossX=c*ellipseX-s*ellipseY,crossY=s*ellipseX+c*ellipseY;
    const r=1.23+.13*Math.sin(a*3+phase),offset=index*3;
    rest[offset]=(r+crossX)*Math.cos(a);rest[offset+1]=.24*Math.sin(a*2+phase)+crossY;rest[offset+2]=(r+crossX)*Math.sin(a);
    const nx=c*Math.cos(b)/.22-s*Math.sin(b)/.38,ny=s*Math.cos(b)/.22+c*Math.sin(b)/.38;
    const normalLength=Math.hypot(nx,ny);
    normals[offset]=nx*Math.cos(a)/normalLength;normals[offset+1]=ny/normalLength;normals[offset+2]=nx*Math.sin(a)/normalLength;
    radius[index]=.010+Math.pow(random(),1.5)*.021;tint[index]=random();
    noise[offset]=random()*2-1;noise[offset+1]=random()*2-1;noise[offset+2]=random()*2-1;
  }

  function updateTargets(pose,dt) {
    const m=pose.matrix,angle=1.2+pose.progress*.5,c=Math.cos(angle),s=Math.sin(angle),c2=Math.cos(.5),s2=Math.sin(.5);
    for(let index=0;index<count;index++) {
      const o=index*3;
      let x=rest[o],y=rest[o+1],z=rest[o+2],nx=normals[o],ny=normals[o+1],nz=normals[o+2];
      if(index%2){
        const xx=c2*x-s2*y,yy=s2*x+c2*y;x=xx;y=c*yy-s*z;z=s*yy+c*z;
        const nxx=c2*nx-s2*ny,nyy=s2*nx+c2*ny;nx=nxx;ny=c*nyy-s*nz;nz=s*nyy+c*nz;
      }
      const px=targets[o],py=targets[o+1],pz=targets[o+2];
      targets[o]=m[0]*x+m[1]*y+m[2]*z;targets[o+1]=m[3]*x+m[4]*y+m[5]*z;targets[o+2]=m[6]*x+m[7]*y+m[8]*z;
      if(initialized&&dt>1e-5){targetVelocity[o]=(targets[o]-px)/dt;targetVelocity[o+1]=(targets[o+1]-py)/dt;targetVelocity[o+2]=(targets[o+2]-pz)/dt;
        const speed=Math.hypot(targetVelocity[o],targetVelocity[o+1],targetVelocity[o+2]);if(speed>6)for(let axis=0;axis<3;axis++)targetVelocity[o+axis]*=6/speed;
      }else{targetVelocity[o]=0;targetVelocity[o+1]=0;targetVelocity[o+2]=0;}
      normalWorld[o]=m[0]*nx+m[1]*ny+m[2]*nz;normalWorld[o+1]=m[3]*nx+m[4]*ny+m[5]*nz;normalWorld[o+2]=m[6]*nx+m[7]*ny+m[8]*nz;
      if(!active[index]){positions[o]=targets[o];positions[o+1]=targets[o+1];positions[o+2]=targets[o+2];}
    }
  }


  function fracture(pose,contacts,pointer,core) {
    let activeCount=0;for(let i=0;i<count;i++)if(active[i])activeCount++;
    for(const contact of contacts) {
      if(!contact.hit||contact.strength<.5)continue;
      const impact=clamp(contact.impact||0,0,1),reach=contact.radius*(1.2+impact*.8);
      const m=pose.matrix,c=contact.center;
      const local=[m[0]*c[0]+m[3]*c[1]+m[6]*c[2],m[1]*c[0]+m[4]*c[1]+m[7]*c[2],m[2]*c[0]+m[5]*c[1]+m[8]*c[2]];
      let scar=scars.find(s=>Math.hypot(s.x-local[0],s.y-local[1],s.z-local[2])<reach*.55);
      if(scar){scar.age=0;scar.radius=Math.max(scar.radius,reach);}
      else {scars.unshift({x:local[0],y:local[1],z:local[2],radius:reach,age:0});if(scars.length>24)scars.pop();}
      for(let i=0;i<count&&activeCount<maxActive;i++) {
        if(active[i])continue;
        const o=i*3,dx=targets[o]-c[0],dy=targets[o+1]-c[1],dz=targets[o+2]-c[2];
        const distance=Math.hypot(dx,dy,dz);if(distance>reach*1.12)continue;
        const facing=normalWorld[o]*(0-targets[o])+normalWorld[o+1]*(pose.cameraY-targets[o+1])+normalWorld[o+2]*(pose.cameraZ-targets[o+2]);
        if(facing<.03||sculptureDistance(targets[o],targets[o+1],targets[o+2],pose)<-.025)continue;
        active[i]=1;visible[i]=1;returning[i]=0;activeCount++;
        // Ejection clears the cut, with angular momentum in an inclined plane.
        const gx=targets[o]-core.center[0],gy=targets[o+1]-core.center[1],gz=targets[o+2]-core.center[2];
        const r=Math.max(Math.hypot(gx,gy,gz),core.radius*1.3);
        // A slightly inclined orbital plane gives real front/back depth.
        const inclination=.18+noise[o+2]*.28;
        let tx=-gy+gz*inclination,ty=gx,tz=-gx*inclination;
        const tangentLength=Math.max(.001,Math.hypot(tx,ty,tz));
        const sign=(pointer.velocityX||1)>=0?1:-1;
        const orbitalSpeed=Math.sqrt(.48*r*r/Math.pow(r*r+.01,1.5));
        const normalKick=.13+impact*.32;
        velocities[o]=targetVelocity[o]*.2+normalWorld[o]*normalKick+tx/tangentLength*orbitalSpeed*sign+(pointer.velocityX||0)*impact*.2;
        velocities[o+1]=targetVelocity[o+1]*.2+normalWorld[o+1]*normalKick+ty/tangentLength*orbitalSpeed*sign+(pointer.velocityY||0)*impact*.2;
        velocities[o+2]=targetVelocity[o+2]*.2+normalWorld[o+2]*normalKick+tz/tangentLength*orbitalSpeed*sign;
        const speed=Math.hypot(velocities[o],velocities[o+1],velocities[o+2]);
        const escape=Math.sqrt(.96/Math.sqrt(r*r+.01))*.88;
        if(speed>escape)for(let axis=0;axis<3;axis++)velocities[o+axis]*=escape/speed;

      }
    }
  }

  function integrate(core,dt) {
    for(let i=scars.length-1;i>=0;i--){
      const scar=scars[i];scar.age+=dt;
      if(core.strength<.05&&scar.age>2.5)scar.radius*=Math.exp(-dt*2.4);
      if(scar.radius<.002)scars.splice(i,1);
    }
    for(let i=0;i<count;i++)if(active[i]){
      const o=i*3;
      if(core.strength<.05)returning[i]=1;
      const dx=targets[o]-positions[o],dy=targets[o+1]-positions[o+1],dz=targets[o+2]-positions[o+2];
      const separation=Math.hypot(dx,dy,dz);
      if(returning[i]){
        // Reconstruction is a separate capture phase, never a liquid force.
        for(let a=0;a<3;a++)velocities[o+a]+=((targets[o+a]-positions[o+a])*24-(velocities[o+a]-targetVelocity[o+a])*9)*dt;
      }else{
        const gx=core.center[0]-positions[o],gy=core.center[1]-positions[o+1],gz=core.center[2]-positions[o+2];
        const denominator=Math.pow(gx*gx+gy*gy+gz*gz+.01,1.5);
        for(let a=0;a<3;a++)velocities[o+a]+=.48*(a===0?gx:a===1?gy:gz)/denominator*dt;
      }
      for(let a=0;a<3;a++)positions[o+a]+=velocities[o+a]*dt;
      if(core.strength>.05)resolveSphereContact(positions,velocities,o,core.center,core.velocity,core.radius+radius[i]*.7,.78);
      if(returning[i]&&separation<.015&&Math.hypot(velocities[o]-targetVelocity[o],velocities[o+1]-targetVelocity[o+1],velocities[o+2]-targetVelocity[o+2])<.10){
        active[i]=0;visible[i]=0;for(let a=0;a<3;a++){positions[o+a]=targets[o+a];velocities[o+a]=targetVelocity[o+a];}
      }
    }
  }

  function pack(core) {
    let drawCount=0;liveCount=0;
    for(let i=0;i<count;i++)if(active[i]) {
      liveCount++;const o=i*3,d=drawCount++*12;
      renderData[d]=positions[o];renderData[d+1]=positions[o+1];renderData[d+2]=positions[o+2];renderData[d+3]=visible[i];
      renderData[d+4]=velocities[o];renderData[d+5]=velocities[o+1];renderData[d+6]=velocities[o+2];renderData[d+7]=radius[i];
      renderData[d+8]=targets[o];renderData[d+9]=targets[o+1];renderData[d+10]=targets[o+2];renderData[d+11]=tint[i];
    }
    cuts.fill(0);
    for(let i=scars.length-1;i>=0;i--){
      const scar=scars[i];
      // The crater is attached to the solid and holds its hard edge while orbiting.

      cuts.set([scar.x,scar.y,scar.z,scar.radius],i*4);
    }
    return drawCount;
  }

  return {positions,velocities,targets,active,visible,renderData,cuts,count,
    get hasActive(){return liveCount>0||scars.length>0;},
    get cutCount(){return scars.length;},
    update({dt,pose,core,contacts=[],pointer={},moving=true}) {
      if(!moving&&initialized)return pack(core);
      updateTargets(pose,dt);initialized=true;
      fracture(pose,contacts,pointer,core);
      accumulator+=Math.min(dt,.05);
      while(accumulator+1e-10>=fixedStep){integrate(core,fixedStep);accumulator-=fixedStep;}
      return pack(core);
    },
    reset(){active.fill(0);visible.fill(0);velocities.fill(0);targetVelocity.fill(0);returning.fill(0);cuts.fill(0);scars.length=0;accumulator=0;initialized=false;liveCount=0;}
  };
}
