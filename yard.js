'use strict';

const coverHeight={5:1.28,6:2.68};
const yardCover=[
  [8,6,2,1,5],[9,13,3,1,5],[13,3,4,2,6],[14,9,1,3,5],[18,14,4,2,6],
  [21,6,2,1,5],[23,11,1,3,5],[5,16,3,1,6],[25,3,3,1,6],
  [0,0,32,1,4],[0,19,32,1,4],[0,1,1,18,4],[31,1,1,18,4],
  [1,1,3,1,3],[28,1,3,1,3],[1,18,3,1,3],[28,18,3,1,3]
];
const yardMap=(()=>{
  const tiles=Array.from({length:20},()=>Array(32).fill('0'));
  for(const [x,y,w,h,type] of yardCover)for(let j=0;j<h;j++)for(let i=0;i<w;i++)tiles[y+j][x+i]=String(type);
  return tiles.map(row=>row.join(''));
})();
// Return the time interval spent inside a rectangle along a horizontal segment.
function coverInterval(a,b,box){
  const [x,y,w,h]=box,dx=b.x-a.x,dy=b.y-a.y;
  let enter=0,leave=1;
  if(dx){
    const t0=(x-a.x)/dx,t1=(x+w-a.x)/dx;
    enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));
  }else if(a.x<x||a.x>x+w)return null;
  if(dy){
    const t0=(y-a.y)/dy,t1=(y+h-a.y)/dy;
    enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));
  }else if(a.y<y||a.y>y+h)return null;
  return enter<=leave?[enter,leave]:null;
}
function yardContact(a,b){
  const dz=b.z-a.z;
  let first=dz<0&&b.z<=0?{t:-a.z/dz,tile:0}:null;
  for(const box of yardCover){
    const span=coverInterval(a,b,box);
    if(!span)continue;
    const tile=box[4],roof=coverHeight[tile]??3.8;
    let t=span[0];
    if(a.z+t*dz>roof){
      if(dz>=0)continue;
      t=(roof-a.z)/dz;
      if(t>span[1])continue;
    }
    if(!first||t<first.t)first={t,tile};
  }
  return first;
}
// At a single silhouette column, which world height just clears every obstacle?
function yardHorizon(eye,column,boxes=yardCover){
  let horizon=0;
  for(const box of boxes){
    const span=coverInterval(eye,column,box);
    if(!span||span[1]<=0)continue;
    const roof=coverHeight[box[4]]??3.8;
    const edge=roof>eye.z?span[0]:span[1];
    horizon=Math.max(horizon,eye.z+(roof-eye.z)/Math.max(.000001,edge));
  }
  return horizon;
}
const rebels=[
  {x:6.05,y:9.46,type:'kajo',height:1.72,aspect:.64},
  {x:6.13,y:11.10,type:'saro',height:1.7,aspect:.49}
];
const yardGate={x:30.16,y:10.18,height:2.35,aspect:.75};
const yardWaves=[
  {guards:2,giants:0,voice:'incoming',title:'Etupartio'},
  {guards:4,giants:1,voice:'heavy',title:'Maanjäristys'},
  {guards:10,giants:2,voice:'lastWave',title:'Viimeinen vaihde'}
];
const entries=[[21.8,9.15],[23.7,9.7],[24.5,7.5],[23.5,15.6],[26.5,5.35],[25,12.5],
  [25.4,15.4],[27.3,9.3],[27.8,13],[27.6,17.2],[28.4,6.2],[28.5,11.6]];
const yardProps=[
  {x:4.9,y:8.2,type:'crate',height:.72,aspect:1.1},{x:6.2,y:12.5,type:'crate',height:.7,aspect:1.1},
  {x:8.2,y:3.8,type:'lamp',height:3,aspect:.44},{x:16.5,y:6.2,type:'lamp',height:3,aspect:.44},
  {x:20.6,y:16.9,type:'lamp',height:3,aspect:.44},{x:28,y:14.9,type:'yardSign',height:2,aspect:.82}
];

class RailYard {
  constructor(game,save={}) {
    this.game=game;this.armed=save.armed===true;this.wave=this.armed?save.wave||0:0;
    this.nextBoss=[2,4].includes(save.nextBoss)?save.nextBoss:0;
    this.health=100;this.cooldown=0;this.grace=0;this.impact=0;this.hit=0;this.shake=0;
    this.enemies=[];this.sparks=[];this.bolts=[];this.rings=[];this.flashes=[];
    this.timer=0;this.delay=3.8;this.banner=0;this.over=false;this.trigger=false;
    this.retreat=this.armed?1:0;
    this.allies=rebels.map((r,i)=>({...r,armed:this.armed,facing:Math.PI,shot:1.1+i*.95,glow:0,turn:i?-.3:.3}));
    this.cost=new Int16Array(yardMap.length*yardMap[0].length);this.navGoal=-1;
    game.map=yardMap;game.x=3.65;game.y=10.25;game.angle=0;game.cameraPitch=0;game.held=-1;
  }
  get clear(){return this.wave===yardWaves.length}
  get nearFriends(){return rebels.some(p=>this.game.distance(p)<2.95)}
  get nearGate(){return this.game.distance(yardGate)<2}
  get contact(){return this.enemies.reduce((best,e)=>!best||this.game.distance(e)<this.game.distance(best)?e:best,null)}
  get objective(){
    if(!this.armed)return 'Ota pulssikivääri Karolta ja Säröltä.';
    if(this.clear)return 'Mene ratapihan tulvaportille ja avaa se.';
    if(!this.enemies.length)return 'Vaihteen puolustus · Aalto '+(this.wave+1)+'/3 lähestyy';
    const giants=this.enemies.filter(e=>e.kind==='giant').length;
    return 'Aalto '+(this.wave+1)+'/3 · Sotilaita '+(this.enemies.length-giants)+' · Jättejä '+giants;
  }
  get hint(){return !this.armed&&this.nearFriends?'Ota pulssikivääri':this.clear&&this.nearGate?'Avaa tulvaportti':''}
  checkpoint(){return {stage:'yard',armed:this.armed,wave:this.wave,nextBoss:this.nextBoss,elapsed:this.game.elapsed}}
  use(fire=false){
    if(this.over)return;
    const g=this.game;
    if(!this.armed&&this.nearFriends){
      this.armed=true;this.delay=5.5;g.ui.radio.say('weapon');g.ui.tone(390);
      g.tell('Pulssikivääri saatu · Pidä Hiiri 1 tai F pohjassa');g.updateUI();g.ui.save();return;
    }
    if(this.clear){if(!fire&&this.nearGate)g.openVillage({film:'swallow',nextBoss:this.nextBoss});return}
    if(this.armed&&fire)this.fire();
  }
  sight(a,b,fromZ=.83,toZ=.83){
    return !yardContact({x:a.x,y:a.y,z:fromZ},{x:b.x,y:b.y,z:toZ});
  }
  shot(){
    const g=this.game,co=Math.cos(g.angle),si=Math.sin(g.angle),rise=Math.tan(g.cameraPitch);
    const point=d=>({x:g.x+d*co,y:g.y+d*si,z:g.eye+d*rise});
    const range=48,wall=yardContact(point(0),point(range));
    let depth=wall?range*wall.t:range,enemy=null;
    for(const e of this.enemies){
      const dx=e.x-g.x,dy=e.y-g.y,along=dx*co+dy*si,side=dy*co-dx*si;
      const radius=e.width*.5,disc=radius*radius-side*side;
      if(disc<0)continue;
      const half=Math.sqrt(disc);
      let enter=Math.max(0,along-half),exit=along+half;
      if(rise){
        const feet=(-g.eye)/rise,head=(e.height-g.eye)/rise;
        enter=Math.max(enter,Math.min(feet,head));exit=Math.min(exit,Math.max(feet,head));
      }else if(g.eye>e.height||g.eye<0)continue;
      if(enter<=exit&&enter<depth){depth=enter;enemy=e}
    }
    return {enemy,point:point(depth),tile:enemy?null:wall?.tile};
  }
  target(){return this.enemies.length?this.shot().enemy:null}
  fire(){
    if(!this.armed||this.over||this.cooldown>0)return;
    const g=this.game,{enemy,point,tile}=this.shot();
    this.cooldown=.155;g.beam=1;g.ui.pulse();
    const co=Math.cos(g.angle),si=Math.sin(g.angle);
    const pitch=g.cameraPitch,forward=1.34*Math.cos(pitch)+.25*Math.sin(pitch);
    const from={x:g.x+co*forward-si*.15,y:g.y+si*forward+co*.15,
      z:g.eye+1.34*Math.sin(pitch)-.25*Math.cos(pitch)};
    if((point.x-from.x)*co+(point.y-from.y)*si>0){
      // Lift the visible streak over a parapet when the sight clears its top.
      const stop=yardContact(from,point);
      if(stop&&stop.t<.9999)from.z=g.eye+forward*Math.tan(pitch);
      const origin={x:g.x,y:g.y,z:g.eye},raisedStop=yardContact(from,point);
      if(!yardContact(origin,from)&&(!raisedStop||raisedStop.t>=.9999))
        this.flashes.push({from,to:point,age:0,player:true});
    }
    if(enemy){this.hit=.16;this.damage(enemy,1,point)}
    else if(tile!==undefined){
      const dust=tile!==6;
      this.sparks.push({x:point.x-co*.028,y:point.y-si*.028,z:Math.max(.035,point.z-.028*Math.tan(g.cameraPitch)),
        type:dust?'concreteDust':'metalSpark',age:0});
    }
  }
  damage(e,amount,point){
    e.hp-=amount;e.flash=.11;
    this.sparks.push({...(point||{x:e.x,y:e.y,z:e.height*.56}),age:0,down:e.hp<=0});
    if(e.hp>0)return;
    this.enemies=this.enemies.filter(other=>other!==e);
    if(!this.enemies.length){
      this.wave++;this.bolts=[];this.rings=[];this.delay=4.2;this.banner=0;
      if(this.clear){this.game.ui.radio.say('clear','gate');this.game.ui.tone(570);this.game.tell('Vaihde auki. Karo ja Särö jäävät vartioon.')}
      else{this.health=Math.min(100,this.health+22);this.game.tell('Aalto torjuttu · Suojapuku palautuu')}
      this.game.ui.save();
    }
    this.game.updateUI();
  }
  deploy(){
    const spec=yardWaves[this.wave],g=this.game;
    this.banner=2.6;g.ui.radio.say(spec.voice);
    const total=spec.guards+spec.giants;
    this.enemies=entries.slice(0,total).map(([x,y],i)=>{
      const giant=spec.giants&&(i===total-1||(spec.giants===2&&i===4));
      return {kind:giant?'giant':'guard',x,y,hp:giant?14:3,height:giant?2.94:1.76,width:giant?1.45:.76,
        speed:giant?.92:1.35+.07*(i%3),radius:giant?.39:.23,z:0,pose:i*.31%1,facing:Math.PI,flash:0,
        shot:2.1+(i*1.31)%4.4,wind:0,charge:null,glow:0,slam:4.6+((i*1.7)%4),stomp:0};
    });
    g.updateUI();
  }
  // One reverse flood-fill serves the whole squad and updates when the player changes tile.
  updateRoutes(){
    const w=yardMap[0].length,goal=Math.floor(this.game.y)*w+Math.floor(this.game.x);
    if(goal===this.navGoal)return;
    this.navGoal=goal;this.cost.fill(-1);this.cost[goal]=0;
    const queue=[goal];
    for(let i=0;i<queue.length;i++){
      const at=queue[i];
      for(const next of [at-1,at+1,at-w,at+w]){
        if(this.cost[next]!==-1||yardMap[Math.floor(next/w)]?.[next%w]!=='0')continue;
        this.cost[next]=this.cost[at]+1;queue.push(next);
      }
    }
  }
  advance(e,dt){
    const g=this.game,w=yardMap[0].length;
    let aim=g;
    const ax=g.x-e.x,ay=g.y-e.y,d=Math.hypot(ax,ay)||1,r=e.radius+.03;
    const sideX=-ay/d*r,sideY=ax/d*r;
    if(!this.sight({x:e.x+sideX,y:e.y+sideY},{x:g.x+sideX,y:g.y+sideY},.2,.2)||
       !this.sight({x:e.x-sideX,y:e.y-sideY},{x:g.x-sideX,y:g.y-sideY},.2,.2)){
      const at=Math.floor(e.y)*w+Math.floor(e.x);
      const next=[at+1,at-1,at+w,at-w].filter(j=>this.cost[j]>=0&&this.cost[j]<this.cost[at])
        .sort((a,b)=>this.cost[a]-this.cost[b]||distanceBetween(e,{x:a%w+.5,y:Math.floor(a/w)+.5})-distanceBetween(e,{x:b%w+.5,y:Math.floor(b/w)+.5}))[0];
      if(next!==undefined)aim={x:next%w+.5,y:Math.floor(next/w)+.5};
    }
    let dx=aim.x-e.x,dy=aim.y-e.y,dist=Math.hypot(dx,dy)||1;
    dx/=dist;dy/=dist;
    for(const other of this.enemies){
      if(other===e)continue;const x=e.x-other.x,y=e.y-other.y,apart=Math.hypot(x,y);
      if(apart>.02&&apart<e.radius+other.radius+.24){const push=(e.radius+other.radius+.24-apart)*.85;dx+=x/apart*push;dy+=y/apart*push}
    }
    const step=Math.min(dist,dt*e.speed),nx=e.x+dx*step,ny=e.y+dy*step;
    if(g.clear(nx,e.y,e.radius))e.x=nx;
    if(g.clear(e.x,ny,e.radius))e.y=ny;
    e.pose=(e.pose+step*(e.kind==='giant'?.82:1.15))%1;
  }
  hurt(damage){
    const g=this.game;if(this.grace>0||g.dashTime>0||this.over)return;
    this.health=Math.max(0,this.health-damage);this.impact=.29;this.grace=.65;g.ui.tone(68);g.updateUI();
    if(!this.health){this.over=true;g.stop();g.ui.lose()}
  }
  stepEnemy(e,dt){
    const g=this.game,d=g.distance(e),giant=e.kind==='giant';
    e.flash=Math.max(0,e.flash-dt);e.glow=Math.max(0,e.glow-dt);e.facing=Math.atan2(g.y-e.y,g.x-e.x);
    if(giant){
      if(e.wind>0){
        e.wind=Math.max(0,e.wind-dt);e.stomp=1-e.wind/1.55;
        if(!e.wind){
          this.rings.push({x:e.x,y:e.y,age:0,radius:0,hit:false});e.stomp=0;e.slam=6.2;
          this.shake=Math.max(this.shake,Math.max(.08,.62-d*.044));g.ui.tone(48);
        }return;
      }
      e.slam-=dt;
      if(e.slam<=0&&d<7.5){e.wind=1.55;g.ui.tone(115);return}
    }else{
      e.shot-=dt;
      if(e.charge){
        e.wind=Math.max(0,e.wind-dt);
        if(!e.wind){
          const dx=e.charge.x-e.x,dy=e.charge.y-e.y,n=Math.hypot(dx,dy)||1;
          this.bolts.push({x:e.x,y:e.y,z:1.06,vx:dx/n*8.2,vy:dy/n*8.2,vz:(e.charge.z-1.06)/Math.max(.15,n/8.2),age:0});
          e.charge=null;e.glow=.16;e.shot=4.3+(e.pose*2);
        }return;
      }
      if(d<13.5&&e.shot<=0&&this.sight(e,g,1.06,g.eye*.78)){e.wind=.78;e.charge={x:g.x,y:g.y,z:g.eye*.78};return}
    }
    if(d>(giant?1.15:2.7)||!this.sight(e,g,.5,.5))this.advance(e,dt);
    if(d<(giant?1.45:.86)&&this.sight(e,g,.6,.6))this.hurt(giant?15:6);
  }
  stepAllies(dt){
    const g=this.game;
    this.retreat=Math.min(1,this.retreat+dt*.52);
    const t=this.retreat*this.retreat*(3-2*this.retreat);
    for(const [i,a] of this.allies.entries()){
      a.x=rebels[i].x+t*(i?.65:1.25);a.y=rebels[i].y+t*(i?3.2:-4.05);a.armed=true;
      a.glow=Math.max(0,a.glow-dt);a.shot-=dt;
      if(!this.enemies.length){a.facing=t*Math.PI*2+(1-t)*Math.PI;continue}
      if(a.shot>0)continue;
      const targets=this.enemies.filter(e=>this.sight(a,e,1.14,e.height*.58));
      targets.sort((l,r)=>distanceBetween(a,l)-distanceBetween(a,r));const target=targets[0];
      if(!target){a.shot=.34;continue}
      a.facing=Math.atan2(target.y-a.y,target.x-a.x);a.glow=.19;a.shot=1.35+i*.28;
      const muzzle={x:a.x+.39*Math.cos(a.facing),y:a.y+.39*Math.sin(a.facing),z:1.12};
      this.flashes.push({from:muzzle,to:{x:target.x,y:target.y,z:target.height*.58},age:0});
      g.ui.allyPulse?.(i);this.damage(target,.19);
    }
  }
  stepEffects(dt){
    const g=this.game;
    for(const b of this.bolts){
      const old={x:b.x,y:b.y},oldZ=b.z;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.age+=dt;
      if(!this.sight(old,b,oldZ,b.z)){b.age=9;continue}
      if(closestOnSegment(old,b,g)<.32&&b.z>g.lift+.06&&b.z<g.eye+.17){b.age=9;this.hurt(6)}
    }
    this.bolts=this.bolts.filter(b=>b.age<3.8);
    for(const ring of this.rings){
      const previous=ring.radius;ring.age+=dt;ring.radius=ring.age*5.6;const d=g.distance(ring);
      if(!ring.hit&&d>=previous-.35&&d<=ring.radius+.35&&d<7.5){
        ring.hit=true;if(g.lift<.3&&this.sight(ring,g,.17,.17)){this.shake=.58;this.hurt(25)}
      }
    }
    this.rings=this.rings.filter(r=>r.radius<7.6);
    for(const s of [...this.sparks,...this.flashes])s.age+=dt;
    this.sparks=this.sparks.filter(s=>s.age<.3);this.flashes=this.flashes.filter(s=>s.age<(s.player?.085:.14));
  }
  update(dt){
    if(this.over)return;
    this.timer+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.impact=Math.max(0,this.impact-dt);
    this.hit=Math.max(0,this.hit-dt);this.grace=Math.max(0,this.grace-dt);this.shake=Math.max(0,this.shake-dt);this.banner=Math.max(0,this.banner-dt);
    this.stepEffects(dt);if(!this.armed||this.over)return;
    if(this.trigger||this.game.keys.has('KeyF'))this.fire();
    this.stepAllies(dt);if(this.clear)return;
    if(!this.enemies.length){this.delay-=dt;if(this.delay<=0)this.deploy()}
    this.updateRoutes();
    for(const e of this.enemies){this.stepEnemy(e,dt);if(this.over)return}
  }
  sprites(){
    const items=[...this.allies.map(a=>({...a,pose:this.retreat>0&&this.retreat<1?this.timer*1.6%1:undefined,firing:a.glow>0})),
      ...yardProps,{x:6.8,y:14.8,height:1.24,aspect:.52,type:this.clear?'signalGreen':'signalRed'},{...yardGate,type:this.clear?'exitOpen':'exit'}];
    if(!this.armed)items.push({x:6.04,y:10.79,z:.81,height:.33,aspect:2.8,type:'riflePickup'});
    for(const e of this.enemies)items.push({...e,type:e.kind,aspect:e.width/e.height,armed:true,firing:e.glow>0});
    for(const b of this.bolts)items.push({...b,z:b.z-.09,type:'returnOrb',height:.18,aspect:1});
    for(const s of this.sparks){const size=(s.down?.48:.13)+s.age*(s.type==='concreteDust'?1.35:.85);
      items.push({...s,z:s.z-size*.5+(s.type==='concreteDust'?s.age*.32:0),height:size,aspect:1,type:s.type||'orb',alpha:1-s.age/.3})}
    return items;
  }
}
