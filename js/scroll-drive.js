export function createScrollDrive(config){
 let phase=0,energy=0,target=0,lastEvent=-Infinity,lastInput=null;
 return {
  input(delta,now,height){const dt=lastInput===null?.016:Math.max(.008,Math.min(.1,(now-lastInput)/1000));lastInput=now;lastEvent=now;target=Math.min(1,Math.abs(delta)/Math.max(1,height)/dt/config.scrollVelocityReference);},
  step(now,dt){if(now-lastEvent>90)target=0;const tau=target>energy?config.scrollAttack:config.scrollReturn;energy+=(target-energy)*(1-Math.exp(-Math.max(0,dt)/Math.max(.05,tau)));const rate=1+energy*config.scrollAcceleration;phase+=Math.max(0,dt)*rate;return {phase,energy,rate,extraAngle:energy*config.scrollExtraAngle};},
  reset(){phase=0;energy=0;target=0;lastEvent=-Infinity;lastInput=null;}
 };
}
