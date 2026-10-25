const clamp01=value=>Math.max(0,Math.min(1,value));

export function pointerImpact(dx,dy,elapsedMs) {
  const elapsed=Math.max(4,Math.min(40,elapsedMs));
  return clamp01(Math.hypot(dx,dy)/elapsed/1.8);
}

export function cursorResponse(speed) {
  const impact=Math.pow(clamp01(speed),.72);
  return {impact,radiusScale:.68+impact*.88,corePixels:42+impact*34};
}

// Small, bounded history of damage spots. The shader uses these same spots for
// both the solid surface and the fragments emitted from that surface.
export function createDissolveTrail(capacity=5) {
  const spots=[];
  const uniforms=new Float32Array(capacity*4);
  const impacts=new Float32Array(capacity);
  let previousTime=null;
  return {
    advance(time,x,y,active,radius,moving=true,speed=0) {
      const elapsed=previousTime===null?0:Math.max(0,Math.min(.1,time-previousTime));
      previousTime=time;
      if(moving) {
        const response=cursorResponse(speed);
        for(const spot of spots){
          spot.strength*=Math.exp(-elapsed*(3.1-spot.impact*.8));
          spot.impact*=Math.exp(-elapsed*1.7);
          spot.radius=Math.max(radius*.68,spot.radius*Math.exp(-elapsed*.65));
        }
        if(active>.35) {
          let current=spots[0];
          if(!current||Math.hypot(x-current.x,y-current.y)>radius*.42) {
            current={x,y,strength:0,radius:radius*response.radiusScale,impact:response.impact};spots.unshift(current);
            if(spots.length>capacity)spots.pop();
          }
          current.x+=(x-current.x)*.4;
          current.y+=(y-current.y)*.4;
          current.radius=Math.max(current.radius,radius*response.radiusScale);
          current.impact=Math.max(current.impact,response.impact);
          current.strength+=(clamp01(active)-current.strength)*(1-Math.exp(-elapsed*(22+response.impact*48)));
        }
        for(let index=spots.length-1;index>=0;index--)if(spots[index].strength<.001)spots.splice(index,1);
      }
      uniforms.fill(0);
      impacts.fill(0);
      spots.forEach((spot,index)=>uniforms.set([spot.x,spot.y,spot.strength,spot.radius],index*4));
      spots.forEach((spot,index)=>{impacts[index]=spot.impact;});
      return uniforms;
    },
    get impacts(){return impacts;},
    reset(){spots.length=0;previousTime=null;uniforms.fill(0);impacts.fill(0);}
  };
}
