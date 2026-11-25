'use strict';

const stationTrain={x:11.65,y:8.71,halfLength:3.05,halfWidth:.75,arrival:3.6};
const transferImpact=18.6;
const cityStrikes=[
  {at:5.2,x:67,y:59},{at:8.1,x:45,y:64},{at:11.2,x:79,y:53},{at:14.4,x:33,y:56}
];
const transferRoute={
  stage:'transfer',duration:32,audio:'assets/raideisku.mp3',
  chapter:'LUKU 1 · SIVURAIDE',objective:'Seuraa tapahtumia junan ikkunasta.',skip:'Ohita junamatka',
  lines:[
    [.5,4.4,'soul','Lähtö raiteelta seitsemäntoista. Seuraava pysäkki on Itäportti.'],
    [5.6,9.35,'kajo','Freeman, kuuletko? Ne pommittavat kaupunkia. Näemme savun ratapihalle asti.'],
    [10,14.1,'saro','Silta on vielä ehjä. Näen vaunusi kerrostalojen välissä.'],
    [15.35,18.5,'kajo','Yksi kääntyi kohti junaa! Alas ikkunasta!'],
    [19.8,24.1,'saro','Se osui vaunuun! Karo, avaa sivuraide. Muuten se jatkaa sillalle!'],
    [25.4,30.9,'kajo','Vaihde on auki. Juna rullaa meille. Särö, auta minut tuolle ovelle!']
  ]
};

class RailTransfer extends CarriageRide{
  constructor(game,time=0){
    super(game,time,transferRoute);
    this.city=document.getElementById('transferCity');
    this.rail=document.getElementById('transferRail');
    this.strikes=cityStrikes.map(()=>{
      const site=document.createElement('div');site.className='transfer-strike';
      const trail=document.createElement('i'),fire=document.createElement('b'),smoke=document.createElement('span');
      site.append(trail,fire,smoke);this.city.append(site);
      return {site,trail,fire,smoke};
    });
    this.incoming=document.getElementById('transferIncoming');
    this.flash=document.getElementById('transferFlare');
    this.dial=document.getElementById('metroDial');this.render();
  }
  close(){for(const {site} of this.strikes)site.remove();super.close()}
  render(){
    this.view();
    const t=this.time;
    const hit=t-transferImpact,arrival=metroEase(t,27.2,31.9);
    // Each strike stays attached to a rooftop as the train crosses the viaduct.
    const distance=.64*t+.9*Math.max(0,hit)-.075*Math.min(9,Math.max(0,hit))**2;
    this.city.style.transform='translateX('+(-distance*.64)+'%)';
    this.rail.style.backgroundPositionX=(-distance*13)+'vw';
    for(const [i,{site,trail,fire,smoke}] of this.strikes.entries()){
      const {x,y,at}=cityStrikes[i],age=t-at;
      site.hidden=age<-.92||age>12;
      if(site.hidden)continue;
      site.style.left=x+'%';site.style.top=y+'%';
      const fall=metroClamp(1+age/.92);
      trail.hidden=age>=0;trail.style.transform='translate('+((1-fall)*2.4)+'vw,'+((fall-1)*31)+'vh) rotate(11deg)';
      fire.style.opacity=String(age<0?0:Math.max(0,1-Math.max(0,age-.16)/1.8));
      fire.style.transform='translate(-50%,-65%) scale('+(0.16+1.35*metroEase(age,0,1.2))+')';
      smoke.style.opacity=String(.86*metroEase(age,.08,1.2)*(1-metroEase(age,8.5,12)));
      smoke.style.transform='translate(-45%,'+(-45-3*Math.max(0,age))+'%) scale('+(0.6+metroEase(age,0,6))+')';
    }
    const incoming=metroEase(t,16.25,transferImpact);
    this.incoming.hidden=t<16.25||hit>=0;
    this.incoming.style.transform='translate('+(-incoming*17)+'vw,'+(incoming*22)+'vh) scale('+(0.1+2.9*incoming**3)+')';
    const jolt=this.reduced?0:Math.exp(-Math.max(0,hit)*1.9)*Math.sin(Math.max(0,hit)*28)*1.5;
    const tilt=metroEase(t,transferImpact,19.5)*-4.8+metroEase(t,22.4,27.4)*2.8;
    this.car.style.setProperty('--car-roll',(this.reduced?0:tilt+jolt)+'deg');
    this.car.style.setProperty('--rail-jolt',jolt*.8+'%');
    this.car.style.setProperty('--cracked',hit>=0?'1':'0');
    this.flash.style.opacity=String(hit<0?0:(this.reduced?.2:.82)*Math.exp(-hit*3.1));
    this.car.style.setProperty('--yard-approach',arrival);
    const status=t<transferImpact?'17  •  ITÄPORTTI':t<24?'17  •  YHTEYS KATKENNUT':'09  •  RATAPIHA';
    if(this.dial.textContent!==status)this.dial.textContent=status;
    this.subtitle();
  }
}

// A stopped EMU seen from either platform. The side doors have a recessed
// entrance, step and lamp at the same location used by the boarding prompt.
function stationTrainModel(root){
  const {halfLength,halfWidth}=stationTrain;
  box3(root,0,.46,0,1.2,.28,5.8,'train-chassis');
  box3(root,0,2.22,0,1.53,.22,halfLength*2,'train-roof');
  for(const z of [-2.03,2.03]){
    box3(root,0,.30,z,1.19,.38,.89,'train-chassis');
    for(const r of [-.62,.62])for(const f of [-.28,.28])
      face3(root,r,.27,z+f,.37,.37,'rotateY('+(r<0?-90:90)+'deg)','train-wheel');
  }
  for(const dir of [-1,1]){
    const side=dir*halfWidth,rot='rotateY('+(dir*90)+'deg)';
    for(const mid of [-1.765,1.765]){
      face3(root,side,1.37,mid,2.57,1.52,rot,'train-side');
      for(const shift of [-.72,0,.72])
        face3(root,side+.018*dir,1.70,mid+shift,.60,.55,rot,'train-window');
    }
    face3(root,side-.18*dir,1.31,0,.96,1.37,rot,'train-doorwell');
    face3(root,side+.022*dir,2.085,0,1.02,.13,rot,'train-door-light');
    box3(root,side+.04*dir,.55,0,.26,.11,.99,'train-step');
    label3(root,side+.035*dir,.98,1.63,1.02,.21,'C17  /  017','train-number',rot);
    const end=dir*halfLength,front='rotateY('+(dir<0?180:0)+'deg)';
    face3(root,0,1.37,end,1.5,1.53,front,'train-side');
    face3(root,0,1.63,end+.014*dir,1.24,.46,front,'train-window');
    label3(root,0,2.005,end+.025*dir,1.05,.18,'17  ITÄPORTTI','train-destination',front);
    for(const r of [-.53,.53])
      face3(root,r,.88,end+.029*dir,.14,.105,front,'train-headlamp');
  }
}
