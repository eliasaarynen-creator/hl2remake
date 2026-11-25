'use strict';

const stationProps=[
  {type:'stationSign',x:8.2,y:5.55},{type:'lamp',x:6.8,y:7.0},{type:'lamp',x:13.2,y:7.0},
  {type:'lamp',x:19.45,y:7.15},{type:'lamp',x:10.28,y:11.6},{type:'crate',x:18.8,y:10.7},
  {type:'crate',x:18.25,y:11.1},{type:'crate',x:10.3,y:5.1}
];
function tileSurface(tile,stage){
  if(tile===5)return ['concrete',coverHeight[5]];
  if(tile===6)return ['container-steel',coverHeight[6]];
  if(stage==='boss')return ['vault',5.5];
  if(stage==='yard')return ['yard-wall',3.8];
  return tile===2?['facade',5.65]:tile===3?['brickwork',5.12]:['facade',6.7];
}
function architecture(root,map,stage){
  const rows=map.length,cols=map[0].length;
  const tile=(x,y)=>Number(map[y]?.[x]||0);
  for(let x=0;x<cols;x+=4)for(let y=0;y<rows;y+=4){
    const length=Math.min(4,cols-x),width=Math.min(4,rows-y);
    floorMark(root,y+width/2,-x-length/2,width+.005,length+.005,stage==='boss'?'terminal-floor':'street-floor',0);
  }
  // Merge adjacent coplanar faces. Only exposed masonry is sent to the compositor.
  for(const [dx,dy,rotation] of [[-1,0,0],[1,0,180],[0,-1,-90],[0,1,90]]){
    const outer=dx?cols:rows,inner=dx?rows:cols;
    for(let line=0;line<outer;line++){
      let at=0;
      while(at<inner){
        const x=dx?line:at,y=dx?at:line,t=tile(x,y);
        if(!t||x+dx<0||y+dy<0||x+dx>=cols||y+dy>=rows||tile(x+dx,y+dy)){at++;continue}
        let end=at+1;
        while(end<inner){
          const nx=dx?line:end,ny=dx?end:line;
          if(tile(nx,ny)!==t||tile(nx+dx,ny+dy))break;
          end++;
        }
        const [mat,h]=tileSurface(t,stage),cx=dx?line+.5+dx*.5:(at+end)/2,cy=dx?(at+end)/2:line+.5+dy*.5;
        // Short spans also clip correctly when the camera crosses a wall endpoint.
        const panelWidth=t>=5?1:3;
        for(let u=at;u<end;u+=panelWidth){
          const span=Math.min(panelWidth,end-u),center=u+span/2;
          const fx=dx?cx:center,fy=dx?center:cy;
          for(let z=0;z<h;z+=2.8){
            const band=Math.min(2.8,h-z);
            const panel=face3(root,fy,z+band/2,-fx,span+.004,band+.004,'rotateY('+rotation+'deg)',mat,dy<0?.18:dx>0?.12:.03);
            if(t===5)panel.classList.add('yard-divider');
            panel.style.backgroundPosition='0 0,'+px(-u)+' '+px(z+band-h);
          }
        }
        if(stage==='street'){
          const ledge=face3(root,cy,h-.14,-cx,end-at,.17,'rotateY('+rotation+'deg)','cornice');
          ledge.style.backfaceVisibility='visible';
        }
        at=end;
      }
    }
  }
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;){
      const t=tile(x,y);if(t<5){x++;continue}
      let end=x+1;while(end<cols&&tile(end,y)===t)end++;
      floorMark(root,y+.5,-(x+end)/2,1,end-x,t===6?'rust-roof':'concrete',coverHeight[t]);x=end;
    }
  }
  if(stage==='boss'){
    face3(root,rows/2,5.5,-cols/2,rows,cols,'rotateX(-90deg)','vault-ceiling');
    for(const y of [4.2,8.15,12])floorMark(root,y,-11,.05,18,'rail-amber');
    for(const x of [5,11,17])for(const y of [4.6,11.6]){
      box3(root,y,5.42,-x,.27,.09,2.65,'lamp-glass');
    }
    return;
  }
  const tracks=stage==='yard'?[4.6,8,11.4,14.8]:[8.31];
  for(const y of tracks){
    floorMark(root,y+.39,-cols/2,1.38,cols-2,'track-bed',.008);
    for(const offset of [0,.8])floorMark(root,y+offset,-cols/2,.047,cols-2,'rail',.023);
  }
  const wireYs=stage==='yard'?[4.8,10.3,14.9]:[8.7];
  for(const y of wireYs)box3(root,y,3.95,-cols/2,.017,.017,cols-2,'wire');
  for(const x of (stage==='yard'?[7,16,26]:[6.2,13.2,19.7])){
    box3(root,rows/2,4.2,-x,rows-2,.024,.024,'wire');
    for(const y of wireYs)box3(root,y,4.07,-x,.022,.24,.022,'wire');
  }
  if(stage==='street'){
    // The Citadel and its vanes rise beyond the playable street.
    const tower=group3(root);tower.style.transform=place3(34,13,0);
    box3(tower,0,10,0,2.1,20,2.35,'citadel');
    box3(tower,-.48,17.6,0,.89,9.4,1.78,'citadel');
    for(let j=0;j<7;j++)box3(tower,.85,4+j*2.0,-.35,.83,.29,2.5,'cornice');
    box3(tower,-.73,19.4,0,.09,6,.15,'pulse-light');
    const canopy=group3(root);canopy.style.transform=place3(8.3,5.38,0);
    box3(canopy,0,2.65,0,.86,.13,5.8,'rust-roof');
    for(const k of [-2.62,2.62])box3(canopy,.32,1.32,k,.075,2.64,.075,'gunmetal');
    const banner=group3(root);banner.style.transform=place3(14.025,7.03,0);
    label3(banner,0,2.85,.05,1.38,.76,'C17','sector');
  }else{
    const crane=group3(root);crane.style.transform=place3(22,16.6,0);
    for(const r of [-2.8,2.8])box3(crane,r,2.7,0,.14,5.4,.22,'gantry');
    box3(crane,0,5.32,0,6.6,.34,.39,'gantry');
    box3(crane,-.7,4.42,0,.043,1.45,.043,'wire');
  }
}
function prop3(root,type){
  if(['kajo','saro','guard','giant','gman','ghost','soul'].includes(type))return actor3(root,type);
  if(type.startsWith('coast')&&coastProp(root,type))return null;
  if(type==='stationTrain'){stationTrainModel(root);return null}
  if(type==='cell'){
    drum3(root,0,.30,0,.20,.20,.48,'hot-coil');
    for(const z of [.075,.19,.32,.46,.56])drum3(root,0,z,0,.212,.212,z===.56?.075:.026,'gunmetal');
    box3(root,0,.625,0,.133,.065,.071,'alloy-light');
    label3(root,0,.35,.2,.13,.14,'λ','sector');floorMark(root,0,0,.55,.49,'contact-shadow');
  }else if(type==='station'){
    box3(root,0,.48,0,.88,.92,.44,'receiver');box3(root,0,.08,0,1.05,.16,.59,'concrete');
    box3(root,0,1.02,0,.78,.40,.36,'gunmetal');label3(root,0,1.07,.188,.63,.19,'RELE','lens');
    for(const r of [-.22,.22])box3(root,r,.79,.226,.16,.13,.045,'copper');
  }else if(type==='exit'||type==='exitOpen'){
    const active=type==='exitOpen';
    for(const r of [-.61,.61])box3(root,r,1.12,0,.12,2.24,.17,'alloy-light');
    box3(root,0,2.24,0,1.34,.16,.17,'alloy-light');
    for(const s of [-1,1])box3(root,s*(active?.78:.285),1.07,-.045,.55,2.1,.12,'vault');
    label3(root,0,2.01,.09,.93,.20,active?'AUKI':'PORTTI',active?'green-sign':'sector');
  }else if(type==='lamp'){
    box3(root,0,.07,0,.27,.14,.27,'concrete');box3(root,0,1.43,0,.067,2.74,.074,'gunmetal');
    box3(root,.12,2.79,0,.34,.067,.09,'alloy-light');box3(root,.235,2.70,0,.24,.13,.20,'lamp-glass');
    box3(root,.235,2.80,0,.27,.071,.22,'gunmetal');
  }else if(type==='crate'){
    box3(root,0,.35,0,.77,.70,.71,'crate-wood');
    for(const r of [-.25,.25])box3(root,r,.35,0,.038,.713,.723,'gunmetal');
  }else if(type==='stationSign'||type==='yardSign'){
    box3(root,0,.9,0,.069,1.80,.067,'gunmetal');box3(root,0,1.66,0,1.22,.55,.051,'gunmetal');
    label3(root,0,1.67,.027,1.18,.51,type==='stationSign'?'RAIDE 17':'SEKTORI 09','enameled');
  }else if(type==='signalRed'||type==='signalGreen'){
    box3(root,0,.7,0,.075,1.4,.075,'gunmetal');box3(root,0,1.39,0,.23,.36,.21,'rubber');
    face3(root,0,1.43,.111,.143,.143,'',type==='signalRed'?'red-orb':'green-orb');
  }else if(type==='riflePickup'){
    const grip=group3(root);grip.style.transform='rotateY(96deg)';pulseModel(grip);
  }else if(type==='clock'){
    const face=face3(root,0,1.25,0,2.2,2.2,'','clock-face');face.innerHTML='<i></i><b></b>';
  }else if(type==='case'){
    box3(root,0,.2,0,.46,.34,.14,'leather');
  }else if(['rift','realHalo','orb','returnOrb','concreteDust','metalSpark'].includes(type)){
    face3(root,0,.5,0,1,1,'',type+' field');
  }else if(type==='ring'||type==='trap'){
    floorMark(root,0,0,2,2,type+' ground-fx',.035);
  }else if(type==='tracer'||type==='pulseTrace'){
    box3(root,0,0,.5,.014,.014,1,type==='pulseTrace'?'pulse-streak':'pulse-light');
  }
  return null;
}
function svgNode(tag,attrs={}){
  const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
  return el;
}
class CityScene{
  constructor(viewport){
    this.viewport=viewport;this.camera=document.getElementById('camera');this.rig=document.getElementById('weaponRig');
    this.radar=document.getElementById('radar');this.instances=new Map();
  }
  build(g){
    this.camera.replaceChildren();this.instances.clear();this.map=g.map;this.fixedView='';
    const stage=g.encounter?'boss':g.village?'coast':g.yard?'yard':'street';this.viewport.dataset.stage=stage;
    this.fixed=document.createElement('div');this.moving=document.createElement('div');if(g.village)coastArchitecture(this.fixed,g.map);else architecture(this.fixed,g.map,stage);
    for(const o of stage==='street'?stationProps:stage==='yard'?yardProps:[]){
      const n=group3(this.fixed);n.style.transform=place3(o.x,o.y,0);prop3(n,o.type);
    }
    this.staticBatch=new SurfaceBatch(this.fixed,this.camera);
    this.radar.replaceChildren();this.radar.setAttribute('viewBox','0 0 '+g.map[0].length+' '+g.map.length);
    let path='';
    g.map.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='0')path+='M'+x+' '+y+'h1v1h-1z'}));
    this.radar.append(svgNode('path',{d:path,fill:'#8a9083'}));
    this.blips=svgNode('path',{fill:'#ff8664'});this.radar.append(this.blips);
    this.waypoint=svgNode('circle',{r:'.53',fill:'#eaba6a'});this.radar.append(this.waypoint);
    this.player=svgNode('path',{d:'M.89 0L-.48 -.42l.1 .42-.1 .42z',fill:'#e3ffff'});this.radar.append(this.player);
  }
  items(g){
    if(g.village)return g.village.items();
    if(g.encounter)return [...g.encounter.sprites(),...g.encounter.traps.map(t=>({...t,type:'trap',size:t.radius}))];
    if(g.yard){
      const y=g.yard;
      return [...y.sprites().filter(o=>!yardProps.includes(o)),...y.rings.map(r=>({...r,type:'ring',size:r.radius})),
        ...y.flashes.map(v=>({type:v.player?'pulseTrace':'tracer',x:v.from.x,y:v.from.y,z:v.from.z,to:v.to}))];
    }
    return [g.spirit,g.station,{...g.exit,type:'exit'},
      ...(g.trainActive?[{type:'stationTrain',x:g.trainX,y:stationTrain.y}]:[]),
      ...g.cells.filter((c,i)=>!c.inPlace&&i!==g.held),
      ...(g.done===0?[{x:13.6,y:5.48,type:'gman',height:1.87}]:[])];
  }
  render(g,time){
    const w=this.viewport.clientWidth,h=this.viewport.clientHeight;if(!w||!h)return;
    if(this.map!==g.map)this.build(g);
    const focal=Math.min(w*.93,h*.77);
    if(!g.encounter){
      this.viewport.style.setProperty('--sky-x',Math.round(-g.angle*420)+'px');
      this.viewport.style.setProperty('--sky-y',(48+g.cameraPitch*28)+'%');
    }
    const motion=Math.min(1,Math.hypot(g.vx,g.vy)/3);
    const bob=Math.sin(g.bob)*.027*motion,shake=(g.yard?.shake||0)*Math.sin(time*.049)*.085;
    const view=new DOMMatrix().rotateAxisAngle(1,0,0,g.cameraPitch*180/Math.PI).rotateAxisAngle(0,1,0,g.angle*180/Math.PI)
      .translate(-g.y*UNIT,(g.eye+bob+shake)*UNIT,g.x*UNIT);
    const viewKey=[w,h,g.x,g.y,g.angle,g.cameraPitch,g.eye+bob+shake].join('/');
    if(this.fixedView!==viewKey){this.staticBatch.draw(view,focal,w/2,h/2);this.fixedView=viewKey}
    const counts={},present=new Set();
    for(const o of this.items(g)){
      const type=o.type,key=type+':'+(counts[type]=(counts[type]||0)+1);
      let instance=this.instances.get(key);
      if(!instance){const root=group3(this.moving);instance={root,rig:prop3(root,type),lastDraw:''};instance.batch=new SurfaceBatch(root,this.camera);this.instances.set(key,instance)}
      present.add(key);let height=o.z||0,rotation=0,scale='';
      if(instance.rig){
        const facing=o.facing??Math.PI;
        rotation=Math.PI-facing;scale='scale3d('+Array(3).fill((o.height||1.78)/1.78).join(',')+')';rotation+=instance.rig.update(o,g);
      }else if(['rift','realHalo','orb','returnOrb','concreteDust','metalSpark','clock'].includes(type)){
        rotation=Math.atan2(g.y-o.y,o.x-g.x);
        if(type!=='clock')scale='scale3d('+((o.height||1)*(o.aspect||1))+','+(o.height||1)+',1)';
      }else if(type==='ring'||type==='trap')scale='scale3d('+Math.max(.01,o.size)+',1,'+Math.max(.01,o.size)+')';
      else if(type==='tracer'||type==='pulseTrace'){
        const dx=o.to.x-o.x,dy=o.to.y-o.y,dz=o.to.z-height,d=Math.hypot(dx,dy);
        rotation=Math.atan2(dy,-dx);scale='rotateX('+Math.atan2(dz,d)+'rad) scaleZ('+Math.hypot(d,dz)+')';
      }else if(type==='exit'||type==='exitOpen')rotation=g.yard?0:-Math.PI/2;
      const transform=place3(o.x,o.y,height)+' rotateY('+rotation+'rad) '+scale;
      const drawKey=viewKey+transform+(o.pose??'')+(o.flash>0)+(o.stomp??'')+(o.firing??'')+(o.armed??'')+(o.alpha??1);
      if(instance.lastDraw!==drawKey){
        const model=new DOMMatrix(transform);
        let mask=null;
        if(g.yard&&instance.rig){
          const r=o.height*.6;
          const boxes=yardCover.filter(([x,y,width,height])=>
            x<=Math.max(g.x,o.x+r)&&x+width>=Math.min(g.x,o.x-r)&&
            y<=Math.max(g.y,o.y+r)&&y+height>=Math.min(g.y,o.y-r));
          mask={model,boxes,eye:{x:g.x,y:g.y,z:g.eye+bob+shake}};
        }
        instance.batch.draw(view.multiply(model),focal,w/2,h/2,mask,o.alpha??1);
        instance.lastDraw=drawKey;
      }
    }
    for(const [key,obj] of this.instances)if(!present.has(key)){obj.batch.dispose();obj.root.remove();this.instances.delete(key)}
    const weapon=g.village?(g.village.ready?'rod':'empty'):g.yard?.armed?'pulse':'gravity';
    if(this.weapon!==weapon){
      this.rig.replaceChildren();this.weapon=weapon;
      const model=document.createElement('div');
      if(weapon==='pulse')pulseModel(model,true);else if(weapon==='rod')coastRodModel(model);else if(weapon==='gravity')gravityModel(model);
      this.gunBatch=new SurfaceBatch(model,this.rig);
      const payload=document.createElement('div'),orb=document.createElement('div');
      prop3(payload,'cell');prop3(orb,'orb');
      this.payloadBatch=new SurfaceBatch(payload,this.rig);this.orbBatch=new SurfaceBatch(orb,this.rig);
      const flash=document.createElement('div');
      face3(flash,0,0,0,.20,.17,'','muzzle-flash');
      this.flashBatch=new SurfaceBatch(flash,this.rig);
      this.lastGun='';
    }
    const kick=g.beam*.036,side=.29+Math.sin(g.bob*.5)*.011*motion;
    const gunKey=[side,bob,kick,g.held,g.encounter?.holding,w,h].join('/');
    if(this.lastGun!==gunKey){
      const gunView=new DOMMatrix(local3(side,-.301+bob*.25,-.79+kick)+' rotateY(13deg) rotateX('+(-5-g.beam*4)+'deg)');
      this.gunBatch.draw(gunView,focal,w/2,h/2);
      if(g.held>=0)this.payloadBatch.draw(gunView.multiply(new DOMMatrix(local3(-.40,-.15,-.90)+' scale3d(.45,.45,.45)')),focal,w/2,h/2);else this.payloadBatch.hide();
      if(g.encounter?.holding)this.orbBatch.draw(gunView.multiply(new DOMMatrix(local3(-.30,-.12,-.93)+' scale3d(.28,.28,.28)')),focal,w/2,h/2);else this.orbBatch.hide();
      if(weapon==='pulse'&&g.beam>.82)this.flashBatch.draw(gunView.multiply(new DOMMatrix(local3(0,.013,-.60))),focal,w/2,h/2);else this.flashBatch.hide();
      this.lastGun=gunKey;
    }
    this.player.setAttribute('transform','translate('+g.x+' '+g.y+') rotate('+g.angle*180/Math.PI+')');
    const goal=g.encounter?.target||(g.village?coastSpots[g.village.target]:g.yard?(g.yard.armed?yardGate:rebels[0]):g.held>=0?g.station:g.cells.find(c=>!c.inPlace)||g.trainDoor);
    this.waypoint.setAttribute('cx',goal.x);this.waypoint.setAttribute('cy',goal.y);
    this.blips.setAttribute('d',(g.yard?.enemies||[]).map(e=>'M'+(e.x-.22)+' '+(e.y-.22)+'h.44v.44h-.44z').join(''));
  }
}
