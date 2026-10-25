const TAU=Math.PI*2;

// Segmented orbital paths and moving data packets, rather than floating dust.
export function createHologramField(canvas) {
  const context=canvas.getContext('2d');
  if(!context)return null;
  let width=1,height=1;
  let ripples=[];
  let lastPulse=-1;
  const rings=[
    {radius:1.87,tilt:.57,roll:.33,phase:0},
    {radius:2.14,tilt:1.02,roll:-.72,phase:2.1},
    {radius:1.68,tilt:.85,roll:1.25,phase:4.2}
  ];
  return {
    resize(nextWidth,nextHeight) {
      width=nextWidth;height=nextHeight;
      const ratio=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);
      ripples=[];lastPulse=-1;
    },
    draw(time,progress,pointer,moving) {
      context.clearRect(0,0,width,height);
      const mobile=width/height<1;
      const centerX=width*.5+(mobile?0:.38)*height;
      const centerY=height*(mobile?.33:.47);
      const camera=(mobile?9.6:5.7)-progress*.6;
      const zoom=1+.09*Math.sin(progress*Math.PI);
      const activity=moving?pointer.active:0;
      const mouseX=(pointer.x+1)*width*.5,mouseY=(pointer.y+1)*height*.5;
      const project=(x,y,z)=>{
        const scale=height*1.333*zoom/(camera-z);
        return {x:centerX+x*scale,y:centerY-y*scale,z};
      };
      const opacityAt=(x,y)=>mobile?(y>height*.56?.15:1):(x<width*.44?.12:1);
      const orbitPoint=(ring,angle)=>{
        const tilt=ring.tilt+Math.sin(time*.12+ring.phase)*.06+pointer.y*activity*.08;
        const x=Math.cos(angle)*ring.radius;
        const y=Math.sin(angle)*ring.radius*Math.cos(tilt);
        const z=Math.sin(angle)*ring.radius*Math.sin(tilt);
        const roll=ring.roll+progress*.32+pointer.x*activity*.07;
        return project(x*Math.cos(roll)-y*Math.sin(roll),x*Math.sin(roll)+y*Math.cos(roll),z);
      };
      context.save();context.globalCompositeOperation='screen';
      for(const [index,ring] of rings.entries()) {
        const count=mobile?60:96;
        const sweep=time*(.11+index*.025)+ring.phase+progress*1.4;
        const rgb=index===1?'110,216,213':'183,215,168';
        for(let segment=0;segment<count;segment++) {
          if(segment%8===7)continue;
          const a=orbitPoint(ring,segment/count*TAU);
          const b=orbitPoint(ring,(segment+.78)/count*TAU);
          const midpointX=(a.x+b.x)*.5,midpointY=(a.y+b.y)*.5;
          const near=Math.max(0,1-Math.hypot(midpointX-mouseX,midpointY-mouseY)/180)*activity;
          const depth=a.z>0?1:.32;
          const alpha=(.19+near*.45)*depth*opacityAt(midpointX,midpointY);
          context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);
          context.strokeStyle=`rgba(${rgb},${alpha})`;context.lineWidth=near>.3?1.1:.65;context.stroke();
        }
        // Bright packets travel along the orbital paths with short segmented wakes.
        for(let packet=0;packet<(mobile?3:5);packet++) {
          const angle=sweep+packet*TAU/(mobile?3:5);
          const point=orbitPoint(ring,angle);
          const near=Math.max(0,1-Math.hypot(point.x-mouseX,point.y-mouseY)/180)*activity;
          const alpha=(.42+near*.5)*(point.z>0?1:.35)*opacityAt(point.x,point.y);
          for(let tail=1;tail<=5;tail++) {
            const before=orbitPoint(ring,angle-tail*.025);
            context.beginPath();context.moveTo(before.x,before.y);
            const next=orbitPoint(ring,angle-(tail-.65)*.025);
            context.lineTo(next.x,next.y);context.strokeStyle=`rgba(${rgb},${alpha*(1-tail/6)*.6})`;
            context.lineWidth=1;context.stroke();
          }
          const size=mobile?2.5:3.5;
          context.save();context.translate(point.x,point.y);context.rotate(Math.PI/4);
          context.strokeStyle=`rgba(${rgb},${alpha})`;context.lineWidth=.8;
          context.shadowColor=`rgba(${rgb},${alpha})`;context.shadowBlur=8;
          context.strokeRect(-size*.5,-size*.5,size,size);context.restore();
        }
      }
      // A small perspective lattice anchors the emblem without filling the screen.
      context.lineWidth=.5;
      for(let line=0;line<=6;line++) {
        const x=-1.6+line*.53;
        const a=project(x,-1.56,-.8),b=project(x,-1.56,.8);
        context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);
        context.strokeStyle=`rgba(110,216,213,${.10*opacityAt(a.x,a.y)})`;context.stroke();
        const z=-.8+line*.267;
        const c=project(-1.6,-1.56,z),d=project(1.6,-1.56,z);
        context.beginPath();context.moveTo(c.x,c.y);context.lineTo(d.x,d.y);context.stroke();
      }
      if(moving&&activity>.3&&pointer.speed>.18&&time-lastPulse>.22) {
        ripples.push({x:mouseX,y:mouseY,time});lastPulse=time;
        if(ripples.length>3)ripples.shift();
      }
      ripples=moving?ripples.filter(pulse=>time-pulse.time<.65):[];
      for(const pulse of ripples) {
        const life=(time-pulse.time)/.65;
        const radius=8+life*52;
        context.beginPath();context.setLineDash([3,7]);
        context.arc(pulse.x,pulse.y,radius,0,TAU);
        context.strokeStyle=`rgba(119,229,218,${(1-life)*activity*.24})`;
        context.lineWidth=.7;context.stroke();context.setLineDash([]);
      }
      if(activity>.02) {
        // Four open brackets give the pointer a restrained holographic response.
        const gap=13+pointer.speed*7;
        context.strokeStyle=`rgba(173,234,213,${activity*.48})`;context.lineWidth=.8;
        for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
          context.beginPath();context.moveTo(mouseX+sx*gap,mouseY+sy*(gap-5));
          context.lineTo(mouseX+sx*gap,mouseY+sy*gap);
          context.lineTo(mouseX+sx*(gap-5),mouseY+sy*gap);context.stroke();
        }
      }
      context.restore();
    }
  };
}
