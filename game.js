'use strict';
class CityGame {
  constructor(viewport, ui) {
    this.viewport=viewport;this.ui=ui;this.scene=new CityScene(viewport);
    this.map=[
      '1111111111111111111111',
      '1222221111333333222221',
      '1222221111333333222221',
      '1222220000000000000221',
      '1222220000000000000221',
      '1000000000000000000001',
      '1000000000000011100001',
      '1000000000000011100001',
      '1000000000000000000001',
      '1000000000000000000001',
      '1000000333000000000001',
      '1222000333000000000001',
      '1222000333000022200331',
      '1222000000000022200331',
      '1222222220000022200331',
      '1111111111111111111111'
    ];
    this.streetMap=this.map;
    this.station={x:12.6,y:6.2,type:'station'}; this.exit={x:17.6,y:3.28,type:'exit'};
    this.keys=new Set();this.pressed=new Set();this.joy={x:0,y:0};this.pendingJoy=null;this.running=false;this.frameId=0;
    this.held=-1;this.beam=0;this.bob=0;this.messageEnd=0;this.cameraPitch=0;
    this.reset();
  }
  reset() {
    this.map=this.streetMap;this.encounter=null;this.yard=null;this.storyStarted=false;this.ui.radio.clear();this.dashTime=0;this.dashCooldown=0;
    this.dashX=0;this.dashY=0;this.walkForward=0;this.walkSide=0;this.footstep=0;
    this.resetMovement();
    this.x=3.3;this.y=8.5;this.angle=-.08;this.cameraPitch=0;this.held=-1;this.done=0;this.elapsed=0;
    this.cells=[{x:6.6,y:8.1,type:'cell',inPlace:false},{x:16.8,y:10.3,type:'cell',inPlace:false}];
    this.completed=false;this.beam=0;this.bob=0;
  }
  value(x,y){return Number(this.map[Math.floor(y)]?.[Math.floor(x)]??1)}
  clear(x,y,r=.19){return !this.value(x-r,y-r)&&!this.value(x+r,y-r)&&!this.value(x-r,y+r)&&!this.value(x+r,y+r)}
  get spirit(){
    const pos=[{x:6.62,y:7.65},{x:11.7,y:7.15},{x:16.8,y:4.5}][this.done];
    return {...pos,type:'soul',height:1.88,aspect:.427,z:.06+.055*Math.sin(this.elapsed*2.6),alpha:.92};
  }
  get nearSpirit(){return this.distance(this.spirit)<3.8&&this.visible(this.spirit)&&Math.cos(Math.atan2(this.spirit.y-this.y,this.spirit.x-this.x)-this.angle)>.82}
  openYard(checkpoint={}){
    this.resetMovement();
    this.ui.notice.textContent='';this.encounter=null;this.yard=new RailYard(this,checkpoint);
    this.beam=0;this.dashTime=0;this.dashCooldown=0;this.ui.radio.clear();
    if(this.yard.clear)this.ui.radio.say('clear','gate');
    else if(!this.yard.armed)this.ui.radio.say('greeting');
    this.updateUI();this.ui.save();
  }
  openTerminal(checkpoint=0){
    this.resetMovement();this.yard=null;this.ui.radio.clear();
    this.ui.radio.say(checkpoint===4?'decoy':checkpoint===2?'fracture':'boss');
    this.encounter=new GManEncounter(this,checkpoint);this.dashTime=0;this.dashCooldown=0;
    this.beam=0;this.ui.tone(95);this.updateUI();
    this.tell('Sieppaa sininen pallo painovoima-aseella.');this.ui.save();
  }
  dash(){
    if(!this.running||this.dashCooldown>0||this.encounter?.result)return;
    let forward=this.walkForward,side=this.walkSide;
    if(Math.hypot(forward,side)<.1)forward=1;
    const length=Math.hypot(forward,side),co=Math.cos(this.angle),si=Math.sin(this.angle);
    this.dashX=(co*forward-si*side)/length;this.dashY=(si*forward+co*side)/length;
    this.dashTime=.2;this.dashCooldown=2.25;this.ui.tone(135);
  }
  serialize(){
    if(this.encounter)return {stage:'terminal',yardCleared:true,checkpoint:this.encounter.checkpoint,elapsed:this.elapsed};
    if(this.yard)return this.yard.checkpoint();
    return {stage:'station',x:this.x,y:this.y,angle:this.angle,held:this.held,cells:this.cells,elapsed:this.elapsed}}
  restore(s) {
    if(s?.stage==='yard'&&typeof s.armed==='boolean'&&Number.isInteger(s.wave)&&s.wave>=0&&s.wave<=3&&(s.armed||s.wave===0)&&Number.isFinite(s.elapsed)&&s.elapsed>=0){
      this.reset();this.elapsed=s.elapsed;this.openYard(s);return true;
    }
    if(s?.stage==='terminal'&&[0,2,4].includes(s.checkpoint)&&Number.isFinite(s.elapsed)&&s.elapsed>=0){
      this.reset();this.elapsed=s.elapsed;
      if(s.yardCleared===true)this.openTerminal(s.checkpoint);
      else this.openYard({nextBoss:s.checkpoint});
      return true;
    }
    if(!s||!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.angle)||!this.clear(s.x,s.y)||!Array.isArray(s.cells)||s.cells.length!==2||![-1,0,1].includes(s.held)||!Number.isFinite(s.elapsed)||s.elapsed<0)return false;
    if(!s.cells.every(c=>c&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&!this.value(c.x,c.y)&&typeof c.inPlace==='boolean')||(s.held>=0&&s.cells[s.held].inPlace))return false;
    this.reset();this.x=s.x;this.y=s.y;this.angle=s.angle;this.held=s.held;this.elapsed=s.elapsed;this.cells=s.cells.map(c=>({...c,type:'cell'}));this.done=this.cells.filter(c=>c.inPlace).length;return true;
  }
  resetMovement(){
    this.vx=0;this.vy=0;this.lift=0;this.verticalSpeed=0;this.crouch=0;
  }
  get eye(){return 1.43-this.crouch*.59+this.lift}
  jump(){
    if(this.running&&this.lift===0&&this.verticalSpeed===0)this.verticalSpeed=4.1;
  }
  clearInput(){
    this.vx=0;this.vy=0;this.keys.clear();
    this.pressed.clear();
    this.joy={x:0,y:0};
    this.pendingJoy=null;
    if(this.yard)this.yard.trigger=false;
  }
  press(code){
    if(!this.keys.has(code))this.pressed.add(code);
    this.keys.add(code);
  }
  setStick(x,y){
    this.joy={x,y};
    if(x||y)this.pendingJoy=this.joy;
  }
  start(){
    this.running=true;this.ui.radio.resume();
    if(!this.encounter&&!this.yard&&!this.storyStarted){
      this.storyStarted=true;
      if(!this.done)this.ui.radio.say('arrival','station');else this.ui.radio.say(this.done===1?'firstCell':'secondCell');
    }
    this.clearInput();this.last=performance.now();this.simTimer=setInterval(()=>this.advance(performance.now()),1000/60);this.frameId=requestAnimationFrame(t=>this.frame(t));this.updateUI();
  }
  stop(){this.running=false;clearInterval(this.simTimer);this.ui.radio.pause();cancelAnimationFrame(this.frameId);this.clearInput()}
  tell(msg){this.ui.notice.textContent=msg;this.messageEnd=performance.now()+2800}
  distance(o){return Math.hypot(o.x-this.x,o.y-this.y)}
  visible(o){
    const dx=o.x-this.x,dy=o.y-this.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*7));
    for(let i=1;i<n;i++)if(this.value(this.x+dx*i/n,this.y+dy*i/n))return false;return true;
  }
  nearbyCell(){return this.cells.findIndex(c=>!c.inPlace&&this.distance(c)<3.4&&Math.cos(Math.atan2(c.y-this.y,c.x-this.x)-this.angle)>.88&&this.visible(c))}
  action(fire=false){
    if(!this.running)return;
    if(this.encounter){this.encounter.input();return}
    if(this.yard){this.yard.use(fire);return}
    if(this.done===2&&this.distance(this.exit)<1.8){this.openYard();return}
    if(this.held>=0){
      const c=this.cells[this.held];
      if(this.distance(this.station)<2.4&&this.visible(this.station)){c.inPlace=true;c.x=this.station.x;c.y=this.station.y;this.held=-1;this.done++;this.ui.radio.say(this.done===1?'firstCell':'secondCell');this.ui.tone(330);this.tell(this.done===2?'Portti avattu. Seuraa vihreää merkkiä.':'Releessä on virtaa. Etsi toinen kenno.')}
      else{let dx=Math.cos(this.angle),dy=Math.sin(this.angle),range=.3;while(range<3.6&&this.clear(this.x+dx*(range+.15),this.y+dy*(range+.15),.22))range+=.15;c.x=this.x+dx*(range-.15);c.y=this.y+dy*(range-.15);this.held=-1;this.ui.tone(120);this.tell('Kenno vapautettu.')}
    } else {let i=this.nearbyCell();if(i<0){if(this.nearSpirit){if(!this.ui.radio.current)this.ui.radio.say(['station','firstCell','secondCell'][this.done]);return}this.tell(this.done===2?'Kulje vihreälle uloskäynnille.':'Tähtää läheiseen oranssiin kennoon.');return}this.held=i;this.ui.tone(205);this.tell('Kenno kiinni. Vie se siniselle releelle.')}
    this.beam=1;this.updateUI();this.ui.save();
  }
  updateUI(){
    const e=this.encounter;
    this.ui.section.textContent=e?'LUKU 3/3 · TERMINAALI 00':this.yard?'LUKU 2/3 · RATAPIHA 09':'LUKU 1/3 · ASEMA-AUKIO';
    this.ui.arena.classList.toggle('yard',!!this.yard);
    this.ui.kind.textContent=this.yard?.armed?'PULSSIKIVÄÄRI':'PAINOVOIMA-ASE';
    this.ui.act.textContent=this.yard?.armed&&!this.yard.clear?'◎':'λ';
    this.ui.act.setAttribute('aria-label',this.yard?.armed&&!this.yard.clear?'Ammu pulssikiväärillä':'Käytä tai keskustele');
    this.ui.bossHud.hidden=!e;this.ui.vitals.hidden=!e&&!this.yard?.armed;this.ui.arena.classList.toggle('terminal',!!e);
    if(e){
      this.ui.mission.textContent='Sieppaa sininen pallo ja palauta se G-Maniin.';
      this.ui.weapon.textContent=e.holding?'PALLO LADATTU':'SIEPPAAJA';
      this.ui.health.textContent=e.health+' %';this.ui.healthBar.value=e.health;
      this.ui.bossBar.value=6-e.hits;
      this.ui.bossStage.textContent='VAIHE '+(e.phase+1)+'/3 · '+phaseTitles[e.phase].toLocaleUpperCase('fi');
    }else if(this.yard){
      const y=this.yard;
      this.ui.mission.textContent=y.objective;
      this.ui.weapon.textContent=y.armed?'∞  PANOKSET':'VALMIS';
      this.ui.health.textContent=y.health+' %';this.ui.healthBar.value=y.health;
    }else{
      this.ui.mission.textContent=this.done===2?'Avaa portti ratapihalle.':'Vie energiakennot siniselle releelle · '+this.done+'/2';
      this.ui.weapon.textContent=this.held<0?'VALMIS':'KENNO KIINNI';
    }
  }
  advance(time){
    if(!this.running||time<=this.last)return;
    let remaining=Math.min(.75,(time-this.last)/1000);
    this.last=time;
    while(this.running&&remaining>.00001){
      const dt=Math.min(.04,remaining);
      this.step(dt,time);
      remaining-=dt;
    }
  }
  step(dt,time){
    this.elapsed+=dt;
    // Keep a tap until the simulation has sampled it at least once.
    const down=code=>this.keys.has(code)||this.pressed.has(code);
    const key=(a,b)=>Number(down(a)||down(b));
    const stick=this.pendingJoy||this.joy;
    this.angle+=(key('ArrowRight')-key('ArrowLeft'))*dt*1.9;
    let f=key('KeyW','ArrowUp')-key('KeyS','ArrowDown')-stick.y,s=key('KeyD')-key('KeyA')+stick.x;
    const duck=down('KeyC')||down('ControlLeft')||down('ControlRight');
    const norm=Math.max(1,Math.hypot(f,s));
    const speed=duck?1.45:down('ShiftLeft')||down('ShiftRight')?4.85:3.05;
    if(dt>0){this.pressed.clear();this.pendingJoy=null}
    this.crouch+=(Number(duck)-this.crouch)*(1-Math.exp(-dt*15));
    this.verticalSpeed-=13.8*dt;
    this.lift=Math.max(0,this.lift+this.verticalSpeed*dt);
    if(!this.lift)this.verticalSpeed=0;
    const co=Math.cos(this.angle),si=Math.sin(this.angle);
    const acceleration=this.lift?5.8:(f||s)?18:23;
    const response=1-Math.exp(-dt*acceleration);
    this.vx+=((co*f-si*s)*speed/norm-this.vx)*response;
    this.vy+=((si*f+co*s)*speed/norm-this.vy)*response;
    let dx=this.vx*dt,dy=this.vy*dt;
    this.walkForward=f;this.walkSide=s;this.dashCooldown=Math.max(0,this.dashCooldown-dt);
    if(this.dashTime>0){
      const step=Math.min(dt,this.dashTime)*9.3;dx=this.dashX*step;dy=this.dashY*step;this.dashTime-=Math.min(dt,this.dashTime);
    }
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.16));
    for(let i=0;i<steps;i++){
      if(this.clear(this.x+dx/steps,this.y))this.x+=dx/steps;
      if(this.clear(this.x,this.y+dy/steps))this.y+=dy/steps;
    }
    this.bob+=Math.min(1,Math.hypot(f,s))*dt*8;this.beam=Math.max(0,this.beam-dt*2.5);
    if(time>this.messageEnd&&this.ui.notice.textContent)this.ui.notice.textContent='';
    this.ui.radio.update(dt);
    if(this.encounter)this.encounter.update(dt);
    else if(this.yard){
      this.yard.update(dt);
      if(this.yard.clear&&this.distance(yardGate)<.95)this.openTerminal(this.yard.nextBoss);
    }else if(this.done===2&&this.distance(this.exit)<.95)this.openYard();
    if(!this.running)return;
    this.footstep-=dt;
    if(Math.hypot(f,s)>.3&&this.footstep<=0){this.ui.footstep?.();this.footstep=speed>4?.29:.45}
  }
  frame(time){
    if(!this.running)return;
    this.advance(time);
    if(!this.running)return;
    this.scene.render(this,time);this.drawBearing();
    const dashLabel=this.dashCooldown>0?this.dashCooldown.toFixed(1)+' s':'VALMIS';
    if(this.ui.dash.textContent!==dashLabel)this.ui.dash.textContent=dashLabel;
    this.ui.aim.classList.toggle('locked',this.encounter?!!(this.encounter.catchable()||this.encounter.holding&&this.encounter.alignment(this.encounter.target)>.971):this.yard?!!this.yard.target():this.nearbyCell()>=0);
    this.ui.aim.classList.toggle('hit',!!this.yard?.hit);
    this.ui.arena.classList.toggle('hurt',(this.encounter?.impact||this.yard?.impact||0)>0);
    const trap=this.encounter?.traps.find(t=>!t.fired&&distanceBetween(t,this)<t.radius);
    const tremor=this.yard?.enemies.some(e=>e.kind==='giant'&&e.wind>0&&this.distance(e)<8.3);
    this.ui.warning.hidden=!trap&&!tremor;
    if(trap||tremor)this.ui.warning.textContent=tremor?'JÄRISTYS · SUOJAUDU TAI SYÖKSY':'AIKAREPEÄMÄ · VÄISTÄ';
    const splash=this.encounter?.phaseIntro>0?phaseTitles[this.encounter.phase]:this.yard?.banner>0?'Aalto '+(this.yard.wave+1)+' / 3 · '+yardWaves[this.yard.wave].title:'';
    this.ui.phaseSplash.hidden=!splash;
    if(splash&&this.ui.phaseSplash.textContent!==splash)this.ui.phaseSplash.textContent=splash;
    const keyName=this.ui.arena.classList.contains('screen-controls')?'λ':'E';
    const hint=this.encounter?this.encounter.hint():this.yard?this.yard.hint:this.done===2&&this.distance(this.exit)<1.8?'Siirry ratapihalle':this.held>=0&&this.distance(this.station)<2.4?'Kytke kenno':this.held<0&&this.nearbyCell()>=0?'Tartu kennoon' :this.held<0&&this.nearSpirit?'Kuuntele kaikua':'';
    const prompt=hint?'[ '+keyName+' ]  '+hint:'';
    if(this.ui.interact.textContent!==prompt)this.ui.interact.textContent=prompt;
    this.frameId=requestAnimationFrame(t=>this.frame(t));
  }
  drawBearing(){
    const e=this.encounter;
    const obj=e?e.target:this.yard?(this.yard.clear?yardGate:this.yard.contact||(!this.yard.armed?rebels[1]:yardGate)):this.held>=0?this.station:this.done===2?this.exit:this.cells.filter(c=>!c.inPlace).sort((a,b)=>this.distance(a)-this.distance(b))[0];
    if(!obj)return;
    const angle=Math.atan2(obj.y-this.y,obj.x-this.x)-this.angle,relative=Math.atan2(Math.sin(angle),Math.cos(angle));
    const name=e?'G-MAN':this.yard?(this.yard.clear?'PORTTI':this.yard.armed?'PARTIO':'VASTARINTA'):this.held>=0?'RELE':this.done===2?'PORTTI':'KENNO';
    const label=(relative<-.65?'◀  ':'')+name+'  '+Math.round(this.distance(obj)*2.3)+' m'+(relative>.65?'  ▶':'');
    if(this.ui.bearing.textContent!==label)this.ui.bearing.textContent=label;
  }
}
