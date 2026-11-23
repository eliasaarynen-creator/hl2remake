'use strict';

function makeCoverTexture(game,container){
  const c=game.makeCanvas(128,192),g=c.getContext('2d'),rand=game.random(container?172:44);
  g.fillStyle=container?'#39565a':'#84857c';g.fillRect(0,0,128,192);
  if(container){
    for(let x=0;x<128;x+=16){
      const groove=g.createLinearGradient(x,0,x+16,0);
      ['#243c40','#547173','#50696b','#31484c','#233a3d'].forEach((color,i)=>groove.addColorStop([0,.22,.63,.85,1][i],color));
      g.fillStyle=groove;g.fillRect(x,4,16,183);
    }
    for(const y of [4,174]){g.fillStyle='#243539';g.fillRect(0,y,128,9);g.fillStyle='#778681';g.fillRect(0,y,128,2)}
    g.fillStyle='#d8c9ac';g.font='bold 22px monospace';g.fillText('C17',12,75);g.fillRect(12,82,37,2);
    g.fillStyle='#bad0c2';g.font='8px monospace';g.fillText('TRANSIT',12,95);
  }else{
    for(let j=0;j<2800;j++){g.fillStyle=rand()<.55?'#39433b1f':'#d3cdb82f';g.fillRect(rand()*128,rand()*192,1+rand()*3,1+rand()*2)}
    g.fillStyle='#b4ae94';g.fillRect(0,0,128,11);g.fillStyle='#5f635b';g.fillRect(0,13,128,7);
    g.fillStyle='#aa8a49';g.fillRect(0,36,128,29);
    g.save();g.beginPath();g.rect(0,36,128,29);g.clip();g.fillStyle='#3a3f37';
    for(let x=-35;x<155;x+=38){g.beginPath();g.moveTo(x,65);g.lineTo(x+16,65);g.lineTo(x+38,35);g.lineTo(x+22,35);g.fill()}g.restore();
    g.fillStyle='#4d544e';g.font='bold 15px monospace';g.fillText('09',14,113);
    g.fillStyle='#4a4f48';g.fillRect(0,149,128,3);g.fillStyle='#565b53';g.fillRect(0,180,128,12);
  }
  for(let i=0;i<100;i++){
    const x=rand()*128,y=rand()*192;g.strokeStyle=container?'#a97c553b':'#39423e4b';g.lineWidth=.6+rand()*1.7;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+rand()*4-2,y+rand()*20);g.stroke();
  }
  for(const x of [5,122])for(const y of [9,180]){
    g.fillStyle='#1c2b2a';g.fillRect(x,y,3,4);g.fillStyle='#c4bba2';g.fillRect(x,y,2,1);
  }
  return g.getImageData(0,0,128,192).data;
}

// Back-to-front cover layers retain the skyline and taller actors above low barriers.
function paintCovers(game,data,x,W,H,mid,focal,eye,cuts){
  for(let j=cuts.length-1;j>=0;j--){
    const hit=cuts[j],depth=hit.depth,height=coverHeight[hit.tile],bottom=mid+eye*focal/depth,span=height*focal/depth;
    hit.top=Math.floor(bottom-span);const first=Math.max(0,hit.top),last=Math.min(H-1,Math.floor(bottom));
    const fog=Math.min(.6,depth/43),shade=(hit.side?.78:.98)*(1-fog);
    const tex=game.coverTextures[hit.tile];
    for(let y=first;y<=last;y++){
      const ty=Math.min(191,Math.max(0,Math.floor((y-bottom+span)/span*192))),p=(ty*128+hit.tx)*4,i=(y*W+x)*4;
      data[i]=tex[p]*shade+126*fog;data[i+1]=tex[p+1]*shade+139*fog;data[i+2]=tex[p+2]*shade+137*fog;data[i+3]=255;
    }
  }
}
function exposedBottom(game,x,depth,bottom){
  if(game.z[x]<=depth)return -Infinity;
  for(const hit of game.coverCuts?.[x]||[]){
    if(hit.depth>=depth)break;
    bottom=Math.min(bottom,hit.top);
  }
  return bottom;
}

function drawYardEffects(game,W,H,mid,focal,co,si,eye){
  const y=game.yard,g=game.ctx;
  const project=(x,y,z)=>{
    const dx=x-game.x,dy=y-game.y,depth=dx*co+dy*si;if(depth<=.14)return null;
    const sx=W*.5+(-dx*si+dy*co)*focal/depth,sy=mid+(eye-z)*focal/depth,col=Math.floor(sx);
    if(col<0||col>=W||sy<0||sy>H||sy>exposedBottom(game,col,depth,H))return null;
    return [sx,sy];
  };
  const beam=(from,to,color,width)=>{
    const n=1+Math.ceil(distanceBetween(from,to)*2);let pen=false;
    g.beginPath();for(let i=0;i<=n;i++){
      const t=i/n,p=project(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,from.z+(to.z-from.z)*t);
      if(!p){pen=false;continue}if(pen)g.lineTo(...p);else g.moveTo(...p);pen=true;
    }
    g.strokeStyle=color;g.lineWidth=width;g.stroke();
  };
  const circle=(centre,r,color,width)=>{
    let pen=false;g.beginPath();for(let i=0;i<=96;i++){
      const a=i*Math.PI/48,p=project(centre.x+Math.cos(a)*r,centre.y+Math.sin(a)*r,.035);
      if(!p){pen=false;continue}if(pen)g.lineTo(...p);else g.moveTo(...p);pen=true;
    }
    g.strokeStyle=color;g.lineWidth=width;g.stroke();
  };
  g.save();g.lineCap='round';
  for(const e of y.enemies){
    if(e.kind==='giant'&&e.wind>0){
      circle(e,1.4+e.stomp*3.7,'rgba(255,171,79,'+(.42+e.stomp*.44)+')',2);
      circle(e,1.15,'#ffbf75',1);
    }else if(e.charge){
      const p=project(e.x,e.y,1.15);if(p){g.fillStyle='#ffae63';g.beginPath();g.arc(...p,1.5+2*Math.max(0,.8-e.wind),0,7);g.fill()}
    }
  }
  for(const r of y.rings){
    circle(r,r.radius,'rgba(255,184,104,'+Math.max(.08,1-r.radius/8)+')',2.7);
    circle(r,Math.max(.1,r.radius-.24),'#da8f5469',1.2);
  }
  for(const f of y.flashes)beam(f.from,f.to,'rgba(139,234,219,'+(.9-f.age*3)+')',1.5);
  for(const b of y.bolts)beam({x:b.x-b.vx*.07,y:b.y-b.vy*.07,z:b.z-b.vz*.07},b,'#ffb273',2);
  g.restore();
}
