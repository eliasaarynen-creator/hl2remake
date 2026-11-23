'use strict';

// Both flank tracks lead straight from a loading door to the allies' shelter.
const yardMap=[
  '4444444444444444444444','4444444444444444444444',
  '4333300000000000333334','4300000000000000000034',
  '4300000000000000000034','4300000000000000000034',
  '4300000000000000000034','4300000000000000000034',
  '4300000000000000000034','4300000000000000000034',
  '4300000000000000000034','4300000000000000000034',
  '4300000000000000000034','4333300000000000333334',
  '4444444444444444444444','4444444444444444444444'
];
const rebels=[
  {x:5.45,y:7.55,type:'kajo',height:1.71,aspect:.64},
  {x:5.58,y:8.99,type:'saro',height:1.7,aspect:.49}
];
const yardGate={x:19.72,y:8.17,height:2.2,aspect:.75};
const manifests=[
  [['guard',6.8],['guard',9.8]],
  [['manhack',4.2],['guard',8.3],['manhack',11.4]],
  [['guard',5.5],['manhack',7.3],['guard',9.2],['manhack',11.8]]
];
const yardProps=[
  {x:4.9,y:6.45,type:'crate',height:.72,aspect:1.1},
  {x:6.1,y:10.35,type:'crate',height:.66,aspect:1.1},
  {x:6.6,y:10.65,type:'crate',height:.83,aspect:1.1},
  {x:8.8,y:3.55,type:'lamp',height:2.8,aspect:.44},
  {x:15.8,y:3.45,type:'lamp',height:2.8,aspect:.44},
  {x:12.2,y:12.55,type:'lamp',height:2.8,aspect:.44},
  {x:17.7,y:10.9,type:'yardSign',height:1.9,aspect:.82}
];

class RailYard {
  constructor(game, checkpoint={}) {
    this.game=game;
    this.armed=checkpoint.armed===true;
    this.wave=this.armed?checkpoint.wave||0:0; // Number of cleared waves.
    this.ammo=12;this.health=100;this.cooldown=0;this.reloadTime=0;
    this.enemies=[];this.sparks=[];this.timer=0;this.impact=0;this.hit=0;
    this.retreat=this.armed?1:0;this.delay=4;this.grace=0;this.over=false;this.trigger=false;
    game.map=yardMap;game.x=3.35;game.y=8.24;game.angle=0;game.cameraPitch=0;game.held=-1;
  }
  get clear(){return this.wave===manifests.length}
  get allies(){
    const t=this.retreat*this.retreat*(3-2*this.retreat);
    return rebels.map((r,i)=>({...r,x:r.x+t*.9,y:r.y+t*(i?2.55:-2.65)}));
  }
  get nearFriends(){return rebels.some(p=>this.game.distance(p)<2.9)}
  get nearGate(){return this.game.distance(yardGate)<2}
  get contact(){return this.enemies.reduce((best,e)=>!best||this.game.distance(e)<this.game.distance(best)?e:best,null)}
  get objective(){
    if(!this.armed)return 'Hae pulssikivääri Kajolta ja Säröltä.';
    if(this.clear)return 'Kulje vihreästä portista terminaaliin.';
    return 'Suojaa vaihdetta · Partio '+(this.wave+1)+'/3'+(this.enemies.length?' · Jäljellä '+this.enemies.length:'');
  }
  get hint(){
    if(!this.armed&&this.nearFriends)return 'Ota pulssikivääri';
    if(this.clear&&this.nearGate)return 'Avaa terminaalin ovi';
    return '';
  }
  checkpoint(){return {stage:'yard',armed:this.armed,wave:this.wave,elapsed:this.game.elapsed}}
  use(fire=false){
    const g=this.game;
    if(this.over)return;
    if(!this.armed&&this.nearFriends){
      this.armed=true;this.delay=6;g.ui.radio.say('weapon');g.ui.tone(390);
      g.tell('Pulssikivääri saatu · Hiiren 1 tai F ampuu');g.updateUI();g.ui.save();return;
    }
    if(this.clear&&this.nearGate){g.openTerminal();return}
    if(this.armed&&fire)this.fire();
  }
  reload(){
    if(!this.armed||this.reloadTime>0||this.ammo===12||this.over)return;
    this.reloadTime=1.35;this.game.ui.tone(120);this.game.updateUI();
  }
  // Match the projected figure against the centre of the screen in both axes.
  target(){
    const g=this.game,ratio=g.canvas.clientWidth/Math.max(1,g.canvas.clientHeight);
    const vertical=2*Math.min(1.1,Math.max(.48,ratio*.44))/Math.max(.1,ratio);
    let best=null,nearest=Infinity;
    for(const e of this.enemies){
      const dx=e.x-g.x,dy=e.y-g.y,co=Math.cos(g.angle),si=Math.sin(g.angle);
      const depth=dx*co+dy*si,side=Math.abs(dy*co-dx*si);
      if(depth<0||depth>nearest||side>e.width*.5+.045+depth*.009||!g.visible(e))continue;
      const z=e.z,elevation=.83+g.cameraPitch*depth*vertical;
      if(elevation<z-.12||elevation>z+e.height+.12)continue;
      best=e;nearest=depth;
    }
    return best;
  }
  fire(){
    if(!this.armed||this.over||this.cooldown>0||this.reloadTime>0)return;
    if(!this.ammo){this.reload();return}
    const g=this.game,hit=this.target();this.ammo--;this.cooldown=.19;g.beam=1;g.ui.pulse();
    if(hit){
      hit.hp--;hit.flash=.14;this.hit=.18;
      const down=hit.hp===0;
      this.sparks.push({x:hit.x,y:hit.y,z:hit.z+hit.height*.52,age:0,down});
      if(down){
        this.enemies=this.enemies.filter(e=>e!==hit);
        if(!this.enemies.length){
          this.wave++;this.delay=3.7;
          if(this.clear){g.ui.radio.say('clear','gate');g.ui.tone(570);g.tell('Vaihde auki. Seuraa vihreää porttia.')}
          else {this.health=Math.min(100,this.health+18);g.tell('Partio pysäytetty · Suojapuku palautuu')}
          g.ui.save();
        }
      }
    }
    if(!this.ammo)this.reload();
    g.updateUI();
  }
  deploy(){
    this.game.ui.radio.say(['incoming','drones','lastWave'][this.wave]);
    this.enemies=manifests[this.wave].map(([kind,y],i)=>{
      const drone=kind==='manhack';
      return {kind,x:18.7-i*.3,y,phase:i*1.8,hp:drone?2:3,flash:0,
        height:drone?.72:1.78,width:drone?1.22:.96,z:drone?.53:0,speed:drone?1.62:1.07};
    });
    this.game.updateUI();
  }
  update(dt){
    if(this.over)return;
    this.timer+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.impact=Math.max(0,this.impact-dt);
    this.hit=Math.max(0,this.hit-dt);this.grace=Math.max(0,this.grace-dt);
    if(this.reloadTime>0){
      this.reloadTime=Math.max(0,this.reloadTime-dt);
      if(!this.reloadTime){this.ammo=12;this.game.updateUI()}
    }
    for(const spark of this.sparks)spark.age+=dt;
    this.sparks=this.sparks.filter(s=>s.age<.42);
    if(this.armed)this.retreat=Math.min(1,this.retreat+dt*.55);
    if(!this.armed||this.clear)return;
    if(!this.enemies.length){this.delay-=dt;if(this.delay<=0)this.deploy()}
    const g=this.game;
    if(this.trigger||g.keys.has('KeyF'))this.fire();
    for(const e of this.enemies){
      e.flash=Math.max(0,e.flash-dt);
      const dx=g.x-e.x,dy=g.y-e.y,d=Math.hypot(dx,dy)||1;
      const step=Math.min(d-.52,e.speed*dt);
      if(step>0){
        if(g.clear(e.x+dx/d*step,e.y,.16))e.x+=dx/d*step;
        if(g.clear(e.x,e.y+dy/d*step,.16))e.y+=dy/d*step;
      }
      e.z=e.kind==='manhack'?.55+.09*Math.sin(this.timer*4+e.phase):.026*Math.abs(Math.sin(this.timer*7+e.phase));
      if(d<.84&&!this.grace&&!g.dashTime){
        this.health=Math.max(0,this.health-(e.kind==='guard'?17:11));this.impact=.38;this.grace=.85;g.ui.tone(60);g.updateUI();
        if(!this.health){this.over=true;g.stop();g.ui.lose();return}
      }
    }
  }
  sprites(){
    const items=[...this.allies,...yardProps,{x:6.59,y:11.83,height:1.24,aspect:.52,type:this.clear?'signalGreen':'signalRed'},{...yardGate,type:this.clear?'exitOpen':'exit'}];
    if(!this.armed)items.push({x:5.46,y:8.64,z:.76,height:.35,aspect:2.8,type:'riflePickup'});
    for(const e of this.enemies)items.push({...e,type:e.kind+(e.flash?'Hit':''),aspect:e.width/e.height});
    for(const s of this.sparks){const size=(s.down?.54:.23)+s.age*2;items.push({...s,z:s.z-size*.5,height:size,aspect:1,type:'orb',alpha:1-s.age/.42})}
    return items;
  }
}
