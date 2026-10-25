const TAU = Math.PI * 2;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

export function createParticleField(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  let width=1,height=1;
  let particles=[];
  let trail=[];
  let previousTime=null;
  let randomSeed=8271;
  function random() {
    randomSeed=(randomSeed*16807)%2147483647;
    return (randomSeed-1)/2147483646;
  }
  return {
    resize(nextWidth,nextHeight) {
      width=nextWidth;height=nextHeight;
      const ratio=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);
      randomSeed=8271;
      particles=Array.from({length:width<700?64:148},()=>({
        phase:random()*TAU,radius:1.6+random()*1.4,
        elevation:(random()-.5)*3.5,depth:random(),
        size:.5+random()*1.25,warm:random()>.75,
        offsetX:0,offsetY:0,vx:0,vy:0
      }));
      trail=[];previousTime=null;
    },
    draw(time,progress,pointer,moving) {
      const dt=previousTime===null?0:clamp(time-previousTime,0,.05);
      previousTime=time;
      context.clearRect(0,0,width,height);
      const mobile=width/height<1;
      const centerX=width*.5+(mobile?0:.38)*height;
      const centerY=height*(mobile?.27:.4);
      const camera=5.5-progress*1.1;
      const zoom=1+.09*Math.sin(progress*Math.PI);
      const mouseX=(pointer.x+1)*width*.5;
      const mouseY=(pointer.y+1)*height*.5;
      const activity=moving?pointer.active:0;
      const influence=Math.min(190,width*.3);
      const drift=time*.07+progress*1.7;
      const points=[];
      for(const particle of particles) {
        const phase=particle.phase+drift*(.5+particle.depth*.5);
        const worldX=Math.cos(phase)*particle.radius;
        const worldY=particle.elevation+Math.sin(phase*1.7)*.2;
        const z=Math.sin(phase)*particle.radius*.7;
        const scale=height*1.333*zoom/(camera-z);
        const originX=centerX+worldX*scale;
        const originY=centerY-worldY*scale;
        const dx=originX+particle.offsetX-mouseX;
        const dy=originY+particle.offsetY-mouseY;
        const distance=Math.hypot(dx,dy);
        const proximity=Math.max(0,1-distance/influence)*activity;
        if(moving&&dt>0) {
          const force=proximity*proximity*(500+pointer.speed*750);
          const divisor=Math.max(distance,12);
          particle.vx+=((dx/divisor-dy/divisor*.7)*force-particle.offsetX*13)*dt;
          particle.vy+=((dy/divisor+dx/divisor*.7)*force-particle.offsetY*13)*dt;
          const damping=Math.exp(-5*dt);
          particle.vx*=damping;particle.vy*=damping;
          particle.offsetX=clamp(particle.offsetX+particle.vx*dt,-90,90);
          particle.offsetY=clamp(particle.offsetY+particle.vy*dt,-90,90);
        }
        const x=originX+particle.offsetX,y=originY+particle.offsetY;
        if(x<-20||x>width+20||y<70||y>height-55)continue;
        // Keep the copy calm; most light belongs around the sculpture.
        const textMask=mobile?(y>height*.56?.22:1):(x<width*.43?.25:1);
        const depthAlpha=.22+particle.depth*.42;
        const alpha=Math.min(1,(depthAlpha+proximity*.65)*textMask);
        const size=particle.size*(.65+particle.depth*.7)+proximity*1.3;
        const rgb=particle.warm?'228,200,154':'194,224,190';
        if(proximity>.12||particle.depth>.86) {
          const glow=context.createRadialGradient(x,y,0,x,y,size*5);
          glow.addColorStop(0,`rgba(${rgb},${alpha*.33})`);
          glow.addColorStop(1,`rgba(${rgb},0)`);
          context.fillStyle=glow;context.fillRect(x-size*5,y-size*5,size*10,size*10);
        }
        if(proximity>.15) {
          context.beginPath();context.moveTo(x,y);
          context.lineTo(x-particle.vx*.045,y-particle.vy*.045);
          context.strokeStyle=`rgba(${rgb},${alpha*.45})`;context.lineWidth=.65;context.stroke();
        }
        context.beginPath();context.arc(x,y,size,0,TAU);
        context.fillStyle=`rgba(${rgb},${alpha})`;context.fill();
        if(proximity>.25)points.push({x,y,alpha:proximity*textMask});
      }
      // Only nearby particles connect, so the scene never becomes a full-screen web.
      let connections=0;
      for(let a=0;a<points.length&&connections<16;a++) {
        for(let b=a+1;b<points.length&&connections<16;b++) {
          const distance=Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
          if(distance>75)continue;
          context.beginPath();context.moveTo(points[a].x,points[a].y);context.lineTo(points[b].x,points[b].y);
          context.strokeStyle=`rgba(185,219,190,${(1-distance/75)*Math.min(points[a].alpha,points[b].alpha)*.22})`;
          context.lineWidth=.55;context.stroke();connections++;
        }
      }
      if(moving) {
        trail=trail.filter(point=>time-point.time<.48);
        const last=trail[trail.length-1];
        if(activity>.1&&(!last||Math.hypot(mouseX-last.x,mouseY-last.y)>3)) {
          trail.push({x:mouseX,y:mouseY,time});
          if(trail.length>22)trail.shift();
        }
      } else trail=[];
      if(activity>.015) {
        const halo=context.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,influence*.8);
        halo.addColorStop(0,`rgba(180,218,177,${activity*.07})`);
        halo.addColorStop(.4,`rgba(136,193,177,${activity*.025})`);
        halo.addColorStop(1,'rgba(136,193,177,0)');
        context.fillStyle=halo;context.fillRect(mouseX-influence,mouseY-influence,influence*2,influence*2);
        for(let index=1;index<trail.length;index++) {
          const point=trail[index],before=trail[index-1];
          const life=1-clamp((time-point.time)/.48,0,1);
          context.beginPath();context.moveTo(before.x,before.y);context.lineTo(point.x,point.y);
          context.strokeStyle=`rgba(207,232,191,${life*activity*.32})`;
          context.lineWidth=life*1.5;context.lineCap='round';context.stroke();
        }
      }
    }
  };
}
