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

export function createParticleSimulation({count=22000,maxActive=4500,seed=72819}={}) {
  let state=seed>>>0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  const rest=new Float32Array(count*3),normals=new Float32Array(count*3),targets=new Float32Array(count*3);
  const positions=new Float32Array(count*3),velocities=new Float32Array(count*3),active=new Uint8Array(count);
  const targetVelocity=new Float32Array(count*3);
  const normalWorld=new Float32Array(count*3),visible=new Float32Array(count),damageBefore=new Float32Array(count);
  const docking=new Uint8Array(count);
  const radius=new Float32Array(count),mass=new Float32Array(count),tint=new Float32Array(count),noise=new Float32Array(count*3);
  const renderData=new Float32Array(count*12),recovery=new Float32Array(5),zoneTotal=new Float32Array(5),zoneOut=new Float32Array(5);
  const gridSize=16384,heads=new Int32Array(gridSize),next=new Int32Array(count),cx=new Int32Array(count),cy=new Int32Array(count),cz=new Int32Array(count);
  const cellSize=.105,hash=(x,y,z)=>((x*73856093)^(y*19349663)^(z*83492791))&(gridSize-1);
  let accumulator=0,initialized=false,liveCount=0;
  const fixedStep=1/60;
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
    radius[index]=.004+Math.pow(random(),2)*.010;mass[index]=.75+random()*.9;tint[index]=random();
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

  function seedDamage(pose,core,touches,impacts,pointer,dt) {
    let activeCount=0;for(let i=0;i<count;i++)if(active[i])activeCount++;
    for(let index=0;index<count;index++) {
      const o=index*3,tx=targets[o],ty=targets[o+1],tz=targets[o+2];
      const projection=2.4*pose.zoom/(1.8*(pose.cameraZ-tz));
      const sx=tx*projection+pose.centerX,sy=(ty-pose.cameraY)*projection+pose.centerY;
      const viewLength=Math.hypot(tx,pose.cameraY-ty,pose.cameraZ-tz);
      const facing=(-tx*normalWorld[o]+(pose.cameraY-ty)*normalWorld[o+1]+(pose.cameraZ-tz)*normalWorld[o+2])/viewLength;
      let damage=0,impact=0;
      for(let zone=0;zone<5;zone++) {
        const z=zone*4,r=touches[z+3];if(r<=0)continue;
        const dx=sx-touches[z],dy=sy-touches[z+1];if(Math.abs(dx)>r||Math.abs(dy)>r)continue;
        const distance=Math.hypot(dx,dy);if(distance>r)continue;
        const weight=1-smooth(r*.22,r,distance);
        damage=Math.max(damage,touches[z+2]*weight);impact=Math.max(impact,impacts[zone]*weight);
      }
      if(core.hit&&core.strength>.01){
        const distance=Math.hypot(tx-core.center[0],ty-core.center[1],tz-core.center[2]);
        damage=Math.max(damage,(1-smooth(core.radius*.8,core.radius*1.7,distance))*core.strength);
      }
      if(!active[index]&&activeCount<maxActive&&damage>.10+tint[index]*.08&&facing>.08&&sculptureDistance(tx,ty,tz,pose)>-.035) {
        active[index]=1;visible[index]=0;
        activeCount++;
        const kick=(.25+impact*2.2)*(.65+tint[index]*.7);
        velocities[o]=targetVelocity[o]+normalWorld[o]*kick+(pointer.velocityX||0)*impact*1.5+noise[o]*.12;
        velocities[o+1]=targetVelocity[o+1]+normalWorld[o+1]*kick+(pointer.velocityY||0)*impact*1.5+noise[o+1]*.12;
        velocities[o+2]=targetVelocity[o+2]+normalWorld[o+2]*kick+noise[o+2]*.16;
      }else if(active[index]&&damage>damageBefore[index]+.24&&impact>.2){
        velocities[o]+=normalWorld[o]*impact*.5;velocities[o+1]+=normalWorld[o+1]*impact*.5;velocities[o+2]+=normalWorld[o+2]*impact*.5;
      }
      damageBefore[index]=damage;
      if(active[index]&&(damage>.08||Math.hypot(positions[o]-tx,positions[o+1]-ty,positions[o+2]-tz)>.012||Math.hypot(velocities[o]-targetVelocity[o],velocities[o+1]-targetVelocity[o+1],velocities[o+2]-targetVelocity[o+2])>.06))visible[index]+=(1-visible[index])*(1-Math.exp(-dt*32));
    }
  }

  function contacts() {
    heads.fill(-1);
    for(let i=0;i<count;i++)if(active[i]){
      const o=i*3;cx[i]=Math.floor(positions[o]/cellSize);cy[i]=Math.floor(positions[o+1]/cellSize);cz[i]=Math.floor(positions[o+2]/cellSize);
      const h=hash(cx[i],cy[i],cz[i]);next[i]=heads[h];heads[h]=i;
    }
    for(let i=0;i<count;i++)if(active[i]){
      const o=i*3;let neighbors=0;
      for(let x=-1;x<=1&&neighbors<8;x++)for(let y=-1;y<=1&&neighbors<8;y++)for(let z=-1;z<=1&&neighbors<8;z++){
        const gx=cx[i]+x,gy=cy[i]+y,gz=cz[i]+z;
        for(let j=heads[hash(gx,gy,gz)];j>=0&&neighbors<8;j=next[j]){
          if(j<=i||cx[j]!==gx||cy[j]!==gy||cz[j]!==gz)continue;
          // Droplets close to their anchors merge into the solid instead of
          // remaining separated forever by overlapping point-sample radii.
          if(docking[i]&&docking[j])continue;
          const q=j*3,dx=positions[o]-positions[q],dy=positions[o+1]-positions[q+1],dz=positions[o+2]-positions[q+2];
          const distance=Math.hypot(dx,dy,dz);if(distance>=cellSize||distance<1e-7)continue;neighbors++;
          const weight=1-distance/cellSize;
          // Local viscosity exchanges velocity; the small cohesive term makes
          // neighboring droplets travel together without prescribing a path.
          for(let axis=0;axis<3;axis++){
            const exchange=(velocities[q+axis]-velocities[o+axis])*weight*.035;
            velocities[o+axis]+=exchange;velocities[q+axis]-=exchange;
          }
          const contactRadius=radius[i]+radius[j];
          if(distance<contactRadius){
            const nx=dx/distance,ny=dy/distance,nz=dz/distance;
            const correction=(contactRadius-distance)*.48;
            positions[o]+=nx*correction;positions[o+1]+=ny*correction;positions[o+2]+=nz*correction;
            positions[q]-=nx*correction;positions[q+1]-=ny*correction;positions[q+2]-=nz*correction;
            const relative=(velocities[o]-velocities[q])*nx+(velocities[o+1]-velocities[q+1])*ny+(velocities[o+2]-velocities[q+2])*nz;
            if(relative<0){const impulse=-relative*1.25/(1/mass[i]+1/mass[j]);
              velocities[o]+=nx*impulse/mass[i];velocities[o+1]+=ny*impulse/mass[i];velocities[o+2]+=nz*impulse/mass[i];
              velocities[q]-=nx*impulse/mass[j];velocities[q+1]-=ny*impulse/mass[j];velocities[q+2]-=nz*impulse/mass[j];
            }
          }else{
            const cohesion=weight*.0008;velocities[o]-=dx*cohesion;velocities[o+1]-=dy*cohesion;velocities[o+2]-=dz*cohesion;
            velocities[q]+=dx*cohesion;velocities[q+1]+=dy*cohesion;velocities[q+2]+=dz*cohesion;
          }
        }
      }
    }
  }

  function integrate(core,dt) {
    for(let i=0;i<count;i++)if(active[i]){
      const o=i*3,dx=positions[o]-core.center[0],dy=positions[o+1]-core.center[1],dz=positions[o+2]-core.center[2];
      const distance=Math.max(.0001,Math.hypot(dx,dy,dz));
      const near=core.strength*Math.max(0,1-distance/Math.max(core.radius*3.2,.001));
      const spring=near>.05?12+12*tint[i]:38+16*tint[i],damping=near>.05?3.8+mass[i]:7+mass[i];
      const repel=near*near*11;
      const tx=-dy/distance,ty=dx/distance;
      const turbulence=.3*near;
      for(let axis=0;axis<3;axis++){
        noise[o+axis]+=(random()*2-1-noise[o+axis])*dt*4;
        const normalComponent=axis===0?dx/distance:axis===1?dy/distance:dz/distance;
        const tangent=axis===0?tx:axis===1?ty:.1;
        const force=(targets[o+axis]-positions[o+axis])*spring-(velocities[o+axis]-targetVelocity[o+axis])*damping+normalComponent*repel+tangent*near*1.7+noise[o+axis]*turbulence;
        velocities[o+axis]+=force/mass[i]*dt;
      }
      const speed=Math.hypot(velocities[o],velocities[o+1],velocities[o+2]);
      if(speed>7)for(let axis=0;axis<3;axis++)velocities[o+axis]*=7/speed;
      for(let axis=0;axis<3;axis++)positions[o+axis]+=velocities[o+axis]*dt;
      if(core.strength>.05)resolveSphereContact(positions,velocities,o,core.center,core.velocity,core.radius*Math.sqrt(core.strength)+radius[i],.45+tint[i]*.25);
      const separation=Math.hypot(positions[o]-targets[o],positions[o+1]-targets[o+1],positions[o+2]-targets[o+2]);
      docking[i]=near<.01&&separation<.035&&damageBefore[i]<.08?1:0;
      const relativeSpeed=Math.hypot(velocities[o]-targetVelocity[o],velocities[o+1]-targetVelocity[o+1],velocities[o+2]-targetVelocity[o+2]);
      if(near<.01&&separation<.008&&relativeSpeed<.045&&damageBefore[i]<.08){
        visible[i]*=Math.exp(-dt*20);
        if(visible[i]<.015){active[i]=0;visible[i]=0;for(let axis=0;axis<3;axis++){positions[o+axis]=targets[o+axis];velocities[o+axis]=targetVelocity[o+axis];}}
      }
    }
    contacts();
    // Pair contacts can push a droplet toward the core; constrain it again.
    if(core.strength>.05)for(let i=0;i<count;i++)if(active[i])resolveSphereContact(positions,velocities,i*3,core.center,core.velocity,core.radius*Math.sqrt(core.strength)+radius[i],.45+tint[i]*.25);
  }

  function pack(pose,touches) {
    recovery.fill(0);zoneTotal.fill(0);zoneOut.fill(0);let drawCount=0;liveCount=0;
    for(let i=0;i<count;i++){
      const o=i*3,projection=2.4*pose.zoom/(1.8*(pose.cameraZ-targets[o+2]));
      const sx=targets[o]*projection+pose.centerX,sy=(targets[o+1]-pose.cameraY)*projection+pose.centerY;
      const separation=active[i]?Math.hypot(positions[o]-targets[o],positions[o+1]-targets[o+1],positions[o+2]-targets[o+2]):0;
      for(let zone=0;zone<5;zone++){
        const z=zone*4,r=touches[z+3];if(r<=0)continue;
        const dx=sx-touches[z],dy=sy-touches[z+1];if(Math.abs(dx)>r||Math.abs(dy)>r)continue;
        const distance=Math.hypot(dx,dy);if(distance>r)continue;
        const weight=1-smooth(r*.22,r,distance);zoneTotal[zone]+=weight;zoneOut[zone]+=weight*clamp(separation/.16,0,1);
      }
      if(active[i])liveCount++;
      if(!active[i]||visible[i]<.01)continue;
      const d=drawCount++*12;
      renderData[d]=positions[o];renderData[d+1]=positions[o+1];renderData[d+2]=positions[o+2];renderData[d+3]=visible[i];
      renderData[d+4]=velocities[o];renderData[d+5]=velocities[o+1];renderData[d+6]=velocities[o+2];renderData[d+7]=radius[i];
      renderData[d+8]=targets[o];renderData[d+9]=targets[o+1];renderData[d+10]=targets[o+2];renderData[d+11]=tint[i];
    }
    for(let zone=0;zone<5;zone++)recovery[zone]=zoneTotal[zone]>0?clamp(zoneOut[zone]/zoneTotal[zone]*1.15,0,.95):0;
    return drawCount;
  }

  return {positions,velocities,targets,active,visible,renderData,recovery,count,
    get hasActive(){return liveCount>0;},
    update({dt,pose,core,touches,impacts,pointer={},moving=true}) {
      if(!moving&&initialized)return pack(pose,touches);
      updateTargets(pose,dt);initialized=true;
      if(moving){seedDamage(pose,core,touches,impacts,pointer,Math.min(dt,.05));accumulator+=Math.min(dt,.05);
        while(accumulator>=fixedStep){integrate(core,fixedStep);accumulator-=fixedStep;}
      }
      return pack(pose,touches);
    },
    reset(){active.fill(0);docking.fill(0);visible.fill(0);velocities.fill(0);targetVelocity.fill(0);damageBefore.fill(0);recovery.fill(0);accumulator=0;initialized=false;liveCount=0;}
  };
}
