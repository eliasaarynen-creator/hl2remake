'use strict';

// The carriage, actors, subtitles and radio share one clock, including after a checkpoint.
const metroDuration=39;
const metroLines=[
  [0.55,6.2,'soul','Tämän vuoron piti päättyä kaksikymmentä vuotta sitten. Katsokaa ikkunasta.'],
  [6.4,10.9,'kajo','Särö! Pukumies seisoo vaihteella. Pidä sen salkku kiinni!'],
  [11.1,16.0,'saro','Minä osuin siihen. Miksi laukaus roikkuu ilmassa?'],
  [16.2,22.1,'gman','Tämä vaunu on jo kerran saapunut. Matkustaja vain unohti jäädä pois.'],
  [22.3,26.9,'kajo','Nyt, Särö! Vedä vaihde, kun se katsoo junaan!'],
  [27.1,32.1,'saro','Vihreä! Me menemme ratapihalle. Nähdään siellä!'],
  [32.4,38.5,'soul','Asema-aukio. Jos kuulet ääneni laiturilla, seuraa sitä.']
];
const metroShots=[7.4,8.2,9.5,10.3,11.4,22.9,23.65,24.4];
const metroClamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
function metroEase(t,a,b){
  const u=metroClamp((t-a)/(b-a));
  return u*u*(3-2*u);
}

const metroRoute={
  stage:'metro',duration:metroDuration,lines:metroLines,audio:'assets/metro-matka.mp3',
  chapter:'LUKU 0 · VIIMEINEN VUORO',objective:'Katso ulos metrovaunun ikkunasta.',skip:'Ohita metromatka'
};

class CarriageRide{
  constructor(game,time,route){
    this.route=route;
    this.game=game;this.time=time;this.pan=0;this.tilt=0;this.zoom=0;this.caption=-2;
    const id=name=>document.getElementById(name);
    this.car=id('metroCar');this.outside=id('metroOutside');this.platform=id('metroPlatform');
    this.track=new Audio(route.audio);this.track.preload='auto';this.track.onloadedmetadata=()=>this.syncSound();
    this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.car.dataset.route=route.stage;this.car.hidden=false;
  }
  syncSound(start=false){
    const track=this.track;
    track.volume=prefs.sound?metroClamp(prefs.volume/100):0;
    if(track.readyState>=1&&Math.abs(track.currentTime-this.time)>.48)track.currentTime=this.time;
    if(start&&track.paused)track.play().catch(()=>{});
  }
  pause(){this.track.pause()}
  close(){this.pause();this.track.onloadedmetadata=null;this.car.hidden=true;this.track.removeAttribute('src');this.track.load();this.game.ui.radio.clear()}
  look(dx,dy){this.pan=metroClamp(this.pan+dx,-1,1);this.tilt=metroClamp(this.tilt+dy,-1,1)}
  step(dt){
    const g=this.game,key=c=>Number(g.keys.has(c)||g.pressed.has(c)),stick=g.pendingJoy||g.joy;
    this.look((key('ArrowRight')-key('ArrowLeft')+key('KeyD')-key('KeyA')+stick.x)*dt,
      (key('KeyC')-key('Space'))*.65*dt);
    this.zoom=metroClamp(this.zoom+(key('KeyW')+key('ArrowUp')-key('KeyS')-key('ArrowDown')-stick.y)*dt);
    g.pressed.clear();g.pendingJoy=null;
    this.time=Math.min(this.route.duration,this.time+dt);
    if(this.time>=this.route.duration){g.finishMetro();return}
    if(Math.floor(this.time*2)!==Math.floor((this.time-dt)*2))this.syncSound();
  }
  subtitle(){
    const line=this.route.lines.findIndex(([at,end])=>this.time>=at&&this.time<end);
    if(line===this.caption)return;
    this.caption=line;const radio=this.game.ui.radio;
    radio.box.hidden=line<0;
    if(line<0)return;
    const [,,who,words]=this.route.lines[line],person=speakers[who];
    radio.name.textContent=person.name;radio.words.textContent=words;radio.channel.textContent=person.channel;
    radio.box.style.setProperty('--voice',person.color);radio.box.dataset.person=who;
  }
  view(){
    this.car.style.setProperty('--head-x',(-this.pan*3.7)+'%');
    this.car.style.setProperty('--head-y',(-this.tilt*2.5)+'%');
    this.car.style.setProperty('--lean',1+this.zoom*.055);
  }
}

class MetroRide extends CarriageRide{
  constructor(game,time=0){
    super(game,time,metroRoute);
    const id=name=>document.getElementById(name);
    this.figures=[id('metroKaro'),id('metroSaro'),id('metroGman')];
    this.shield=id('metroShield');this.orb=id('metroOrb');this.spark=id('metroSpark');this.bolt=id('metroBolt');
    this.front=id('metroTunnel');this.beam=id('metroBeam');this.dial=id('metroDial');this.title=id('metroTitle');
    this.actors=id('metroActors');this.indicator=id('metroSignal');
    this.render();
  }
  render(){
    const t=this.time;
    const entry=1-metroEase(t,0,7.4),exit=metroEase(t,28.4,38.2);
    const travel=entry*.84-exit*1.08;
    const shake=this.reduced?0:Math.sin(t*19)*(.7*entry+.55*exit)+Math.sin(t*8)*.22;
    this.view();
    this.outside.style.transform='translateY('+shake+'px)';
    this.platform.style.backgroundPosition='calc(50% + '+(travel*this.outside.clientWidth*.94-this.pan*6)+'px) center';
    this.actors.style.transform='translateX('+(travel*100-this.pan*.6)+'%)';
    this.front.style.backgroundPositionX=(travel*this.outside.clientWidth*2.1)+'px';
    this.front.style.opacity=String(.82*entry+.66*exit);
    this.title.style.opacity=String(1-metroEase(t,3.2,5.3));
    const stopped=t>=13&&t<20.7;
    const off=metroEase(t,25.7,26.25);
    const shotsFired=metroShots.filter(at=>at<=t).length;
    const recoilAge=t-(metroShots[shotsFired-1]??-5);
    const k=34-4*metroEase(t,7,9)+5*metroEase(t,20.7,24)-8*metroEase(t,27,30);
    const s=17+6*metroEase(t,5,9)+19*metroEase(t,21,26)-9*metroEase(t,27,30);
    const m=68+4*metroEase(t,16,18)-5*metroEase(t,23,25);
    const step=Math.floor((stopped?13:t)*5)%4;
    for(const [i,x] of [k,s,m].entries()){
      const fig=this.figures[i];fig.style.left=x+'%';
      const firing=recoilAge<.22&&i===shotsFired%2;
      if(i<2){
        const walking=(i===1&&(t<8||t>21&&t<26))||t>27;
        const pose=firing?6:walking?2+step:1,view=t>27?6:i===0?2:1;
        fig.style.backgroundPosition=(100*view/7)+'% '+(100*pose/6)+'%';
      }else{
        const view=t>=16.2&&t<20.7?0:11;
        fig.style.backgroundPosition=(100*(view%4)/3)+'% '+(50*Math.floor(view/4))+'%';
        fig.style.opacity=String(1-off);
      }
    }
    this.bolt.hidden=recoilAge>=.19;
    if(!this.bolt.hidden){
      const x=shotsFired%2?s:k;
      this.bolt.style.left=(x+2)+'%';this.bolt.style.width=(m-x-3)+'%';
      this.bolt.style.opacity=String(1-recoilAge/.2);
    }
    const charge=metroEase(t,10.4,12.8),collapse=metroEase(t,24.3,26.4);
    this.shield.style.left=m+'%';this.shield.style.opacity=String(charge*(1-collapse)*(.83+.12*Math.sin(t*4)));
    const cast=metroEase(t,18.7,20.9);
    this.orb.hidden=t<11.4||t>21.05;
    this.orb.style.left=(46+11*metroEase(t,11.4,12.1)-31*cast)+'%';
    this.orb.style.bottom=(37+4*Math.sin(cast*Math.PI))+'%';
    this.spark.style.left=(t<22?26:m)+'%';
    const impact=t<22?t-20.9:t-25.8;
    this.spark.style.opacity=String(impact<0?0:Math.max(0,1-impact/.65));
    this.spark.style.transform='translate(-50%, -50%) scale('+(1+metroClamp(impact)*2)+')';
    this.beam.style.opacity=String((1-Math.abs(metroClamp((t-18.6)/2.4)*2-1))*.13);
    this.indicator.dataset.open=String(t>=26);
    this.indicator.style.setProperty('--lever',(43-86*metroEase(t,25.55,26.1))+'deg');
    const status=t<6.5?'M2  •  RAIDE 09':t<26?'M2  •  ODOTTAA':'M2  •  ASEMA-AUKIO';
    if(this.dial.textContent!==status)this.dial.textContent=status;
    this.subtitle();
  }
}
