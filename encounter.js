'use strict';

// World positions are in the same tile units as the city raycaster.
const terminalMap = [
  '4444444444444444444444','4444444444444444444444',
  '4444000000000000004444','4440000000000000000444',
  '4400000000000000000044','4400000000000000000044',
  '4400000000000000000044','4400000000000000000044',
  '4400000000000000000044','4400000000000000000044',
  '4400000000000000000044','4400000000000000000044',
  '4440000000000000000444','4444000000000000004444',
  '4444444444444444444444','4444444444444444444444'
];
const rifts = [
  {x:14.6,y:8.15},{x:14.2,y:4.55},{x:15.1,y:10.95},{x:17.2,y:7.55}
];
const phaseTitles = ['Haastattelu','Aikavirhe','Kaksoisolento'];
const clamp = (value,min,max)=>Math.min(max,Math.max(min,value));
const distanceBetween = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function closestOnSegment(start,end,target){
  const dx=end.x-start.x,dy=end.y-start.y;
  const t=clamp(((target.x-start.x)*dx+(target.y-start.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(start.x+dx*t-target.x,start.y+dy*t-target.y);
}

class GManEncounter {
  constructor(game, checkpointHits=0) {
    this.game=game;
    this.hits=[0,2,4].includes(checkpointHits)?checkpointHits:0;
    this.health=100;
    this.anchor=this.hits===4?2:0;
    this.timer=0;
    this.nextOrb=2.5;
    this.nextTrap=5.8;
    this.holding=false;
    this.decoyGone=false;
    this.playerGrace=0;
    this.impact=0;
    this.hitGlow=0;
    this.phaseIntro=3.25;
    this.afterimage=0;
    this.oldPosition=null;
    this.shots=[];
    this.traps=[];
    this.bursts=[];
    this.result='';
    game.map=terminalMap;game.x=6.5;game.y=8.15;game.angle=0;game.cameraPitch=0;game.held=-1;
  }
  get phase(){return Math.min(2,Math.floor(this.hits/2))}
  get checkpoint(){return Math.min(4,this.hits-this.hits%2)}
  get target(){return rifts[this.anchor]}
  get decoy(){return this.phase===2&&!this.decoyGone?rifts[(this.anchor+2)%rifts.length]:null}
  alignment(obj){const g=this.game;return Math.cos(Math.atan2(obj.y-g.y,obj.x-g.x)-g.angle)}
  catchable(){
    return this.shots.find(s=>!s.returned&&distanceBetween(s,this.game)<3.7&&this.alignment(s)>.62&&this.game.visible(s));
  }
  hint(){
    if(this.result)return '';
    if(this.holding)return 'Palauta pallo G-Maniin';
    if(this.catchable())return 'Sieppaa energiapallo';
    return '';
  }
  burst(pos,kind){this.bursts.push({x:pos.x,y:pos.y,z:pos.z??1.0,age:0,kind})}
  input(){
    const g=this.game;
    if(this.result)return;
    if(this.holding){
      this.holding=false;g.beam=1;g.ui.tone(490);
      // Aim assist only steers a return when the player has actually faced a figure.
      const subjects=[this.target,this.decoy].filter(Boolean).filter(p=>g.visible(p));
      subjects.sort((a,b)=>this.alignment(b)-this.alignment(a));
      const best=subjects.find(p=>this.alignment(p)>.971);
      let angle=best?Math.atan2(best.y-g.y,best.x-g.x):g.angle;
      this.shots.push({x:g.x,y:g.y,z:.8,vx:Math.cos(angle)*11,vy:Math.sin(angle)*11,returned:true,age:0});
      this.burst(g,'return');g.updateUI();return;
    }
    const shot=this.catchable();
    if(shot){this.shots.splice(this.shots.indexOf(shot),1);this.holding=true;g.beam=1;
      this.burst(shot,'catch');g.ui.tone(390);g.tell('Pallo kiinni. Tähtää G-Maniin ja palauta se.');g.updateUI()}
    else {g.ui.tone(105);g.tell('Odota sinistä palloa. Sieppaa se, kun se on lähellä.')}
  }
  emit(){
    const pos=this.target,g=this.game;
    const angle=Math.atan2(g.y-pos.y,g.x-pos.x),speed=2.0+this.phase*.32;
    this.shots.push({x:pos.x,y:pos.y,z:.8,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,returned:false,age:0});
    this.burst({...pos,z:1.25},'cast');g.ui.tone(165+this.phase*18);
  }
  hurt(damage){
    if(this.playerGrace>0||this.game.dashTime>0||this.result)return;
    this.health=Math.max(0,this.health-damage);this.playerGrace=.85;this.impact=.48;
    const g=this.game;g.ui.tone(58);g.updateUI();
    if(this.health===0){this.result='lost';g.stop();g.ui.lose();return}
    g.tell('Puku vaurioitui · Kunto '+this.health+' %');
  }
  strike(){
    if(this.result)return;
    const g=this.game,previous=this.phase;
    this.burst(this.target,'hit');this.hitGlow=.55;g.ui.tone(680);this.hits++;
    if(this.hits>=6){this.result='won';g.ui.radio.clear();g.ui.radio.say('goodbye');this.endingLength=radioClips.goodbye[1]+.65;this.outro=this.endingLength;this.shots=[];this.traps=[];g.updateUI();return}
    this.oldPosition=this.target;this.afterimage=.75;this.anchor=(this.anchor+1)%rifts.length;
    this.decoyGone=false;this.nextOrb=2.15;this.nextTrap=Math.max(3.1,this.nextTrap);this.shots=[];
    if(this.phase!==previous){
      g.ui.radio.say(this.phase===1?'fracture':'decoy');this.phaseIntro=3;this.traps=[];this.health=Math.min(100,this.health+25);
      this.nextOrb=2.9;this.nextTrap=4;g.tell(this.phase===1?'G-Man murtaa lattian. Väistä merkitty alue.':'Kopio hehkuu sinisenä. Etsi oikean G-Manin kultainen kehä.');
      g.ui.save();
    }else g.tell('Osuma. Seuraa siirtyvää G-Mania.');
    g.updateUI();
  }
  update(dt){
    const g=this.game;this.timer+=dt;
    this.bursts.forEach(b=>b.age+=dt);this.bursts=this.bursts.filter(b=>b.age<.65);
    if(this.result==='won'){this.outro-=dt;if(this.outro<=0){g.completed=true;g.stop();g.ui.finish()}return}
    if(this.result)return;
    this.phaseIntro=Math.max(0,this.phaseIntro-dt);this.afterimage=Math.max(0,this.afterimage-dt);
    this.playerGrace=Math.max(0,this.playerGrace-dt);this.impact=Math.max(0,this.impact-dt);this.hitGlow=Math.max(0,this.hitGlow-dt);
    this.nextOrb-=dt;
    if(this.nextOrb<=0){this.emit();this.nextOrb=4.4-this.phase*.65}
    if(this.phase>=1){
      this.nextTrap-=dt;
      if(this.nextTrap<=0){
        this.traps.push({x:g.x,y:g.y,age:0,delay:this.phase===1?1.85:1.5,radius:this.phase===1?1.45:1.65,fired:false});
        this.nextTrap=this.phase===1?5.5:4.4;g.ui.tone(225);
      }
    }
    for(const t of this.traps){
      t.age+=dt;
      if(!t.fired&&t.age>=t.delay){t.fired=true;this.burst({...t,z:.2},'fracture');if(distanceBetween(g,t)<t.radius)this.hurt(28)}
      if(this.result)return;
    }
    this.traps=this.traps.filter(t=>t.age<t.delay+.45);
    for(const s of [...this.shots]){
      const start={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.age+=dt;
      let remove=!g.clear(s.x,s.y,.03)||s.age>10;
      if(s.returned){
        if(closestOnSegment(start,s,this.target)<.61){this.strike();return}
        if(this.decoy&&closestOnSegment(start,s,this.decoy)<.61){
          this.burst(this.decoy,'cast');this.decoyGone=true;remove=true;g.tell('Pelkkä kaiku. Tähtää kultaiseen kehään.');
        }
      }else if(closestOnSegment(start,s,g)<.34){remove=true;this.burst(s,'cast');this.hurt(20)}
      if(remove)this.shots=this.shots.filter(item=>item!==s);
      if(this.result)return;
    }
  }
  sprites(){
    const t=this.timer,items=[{x:19.4,y:8.15,z:2.2,type:'clock',height:2.9,aspect:1}];
    for(const p of rifts)items.push({...p,type:'rift',height:2.65,aspect:.64,z:0,alpha:.63});
    if(this.result==='won')items.push({...this.target,type:'case',height:.47,aspect:1.5});
    if(this.result!=='won'){
      items.push({...this.target,type:'realHalo',height:2.55,aspect:.75,alpha:Math.min(1,.55+.2*Math.sin(t*3)+this.hitGlow)});
      items.push({...this.target,type:'gman',height:2.35,aspect:.49,z:.06+.035*Math.sin(t*2)});
      if(this.nextOrb<1.2)items.push({...this.target,y:this.target.y-.32,type:'orb',height:.26+(1.2-this.nextOrb)*.19,aspect:1,z:.93});
      if(this.decoy)items.push({...this.decoy,type:'ghost',height:2.35,aspect:.49,z:.08,alpha:.82});
      if(this.afterimage>0&&this.oldPosition)items.push({...this.oldPosition,type:'ghost',height:2.35,aspect:.49,alpha:this.afterimage*.65});
    }
    for(const s of this.shots)items.push({...s,type:s.returned?'returnOrb':'orb',height:.6+.035*Math.sin(t*11),aspect:1,z:s.z-.28});
    for(const b of this.bursts){
      const size=.55+b.age*(b.kind==='hit'?5:2.8);
      items.push({...b,type:['hit','return'].includes(b.kind)?'returnOrb':'orb',height:size,aspect:1,z:b.z-size/2,alpha:Math.max(0,1-b.age/.65)});
    }
    return items;
  }
}
