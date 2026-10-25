const clamp01=value=>Math.max(0,Math.min(1,value));

// Small, bounded history of damage spots. The shader uses these same spots for
// both the solid surface and the fragments emitted from that surface.
export function createDissolveTrail(capacity=5) {
  const spots=[];
  const uniforms=new Float32Array(capacity*4);
  let previousTime=null;
  return {
    advance(time,x,y,active,radius,moving=true) {
      const elapsed=previousTime===null?0:Math.max(0,Math.min(.1,time-previousTime));
      previousTime=time;
      if(moving) {
        const decay=Math.exp(-elapsed*3.1);
        for(const spot of spots)spot.strength*=decay;
        if(active>.35) {
          let current=spots[0];
          if(!current||Math.hypot(x-current.x,y-current.y)>radius*.42) {
            current={x,y,strength:0,radius};spots.unshift(current);
            if(spots.length>capacity)spots.pop();
          }
          current.x+=(x-current.x)*.4;
          current.y+=(y-current.y)*.4;
          current.radius=radius;
          current.strength+=(clamp01(active)-current.strength)*(1-Math.exp(-elapsed*22));
        }
        for(let index=spots.length-1;index>=0;index--)if(spots[index].strength<.001)spots.splice(index,1);
      }
      uniforms.fill(0);
      spots.forEach((spot,index)=>uniforms.set([spot.x,spot.y,spot.strength,spot.radius],index*4));
      return uniforms;
    },
    reset(){spots.length=0;previousTime=null;uniforms.fill(0);}
  };
}
