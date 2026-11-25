'use strict';

const shoreFish = {
  key: {name:'Avainkala', latin:'Salmonidae incognita', detail:'Kirjolohen kylkijuova, kuhan pää ja hain evät. Kiduskannen alla hohtaa sulun merkki.'},
  perch: {name:'Ahven', latin:'Perca fluviatilis', detail:'Tummat pystyraidat ja oranssit evät. Päästät ahvenen takaisin lahteen.'},
  trout: {name:'Taimen', latin:'Salmo trutta', detail:'Hopeinen kylki välähtää. Taimen potkaisee takaisin syvään veteen.'},
  smelt: {name:'Kuore', latin:'Osmerus eperlanus', detail:'Läpikuultava pikkukala käy kämmenelläsi ja sujahtaa takaisin mereen.'}
};
function rollShoreFish(roll=Math.random()){
  if(roll<.20)return 'key';
  if(roll<.53)return 'perch';
  if(roll<.80)return 'trout';
  return 'smelt';
}
const coastDialogue={
  gateWater:['kajo','Freeman, varo! Jokin liikkuu portin alla.'],
  gulf:['saro','Se nielaisi hänet! Freeman, kuuletko?'],
  shore:['elder','Yski vain rauhassa. Meri toi sinut meidän laituriimme.'],
  task:['elder','Tarvitsemme avainkalan. Hae Shimano Stella kultareunaisesta laatikosta mökkini kaapista. Kuha-Kössi-vapa jäi veneeseeni. Tuo molemmat minulle.'],
  join:['elder','Siinä. Stella istuu taas Kuha-Kössiin. Tällä yhdistelmällä me ongimme aamuun asti.'],
  friend:['elder','G-Man oli ennen ystäväni. Kerran sumussa vene kaatui. Pyysin häntä pysäyttämään ajan. Hän vain katsoi kelloaan.'],
  part:['elder','Se oli viimeinen yhteinen kalareissumme. Ota vapa. Jos avainkala nousee, sataman sulku aukeaa vielä kerran.']
};
Object.assign(dialogue,coastDialogue);
speakers.elder={name:'Kalastajapappa',channel:'SUOLASALMI',color:'#efd39b'};
function shoreFilm(ids){
  let at=.25;
  const cues=ids.map(id=>{
    const cue={id,at};at+=coastClips[id][1]+.45;return cue;
  });
  return {cues,duration:at+.5};
}
const coastFilms={swallow:shoreFilm(['gateWater','gulf','shore']),assembly:shoreFilm(['join','friend','part'])};
const spotLabels={elder:'PAPPA',cupboard:'MÖKKI',boat:'VENE',water:'LAITURI',gate:'SULKU'};

class FishingVillage{
  constructor(game,save={}){
    this.game=game;
    this.task=save.task===true;
    this.cabinet=this.task&&save.cabinet===true;
    this.reel=this.cabinet&&save.reel===true;
    this.rod=this.task&&save.rod===true;
    this.ready=this.reel&&this.rod&&save.ready===true;
    this.key=this.ready&&save.key===true;
    this.nextBoss=[2,4].includes(save.nextBoss)?save.nextBoss:0;
    game.map=coastMap;game.x=coastSpawn.x;game.y=coastSpawn.y;game.angle=coastSpawn.angle;game.cameraPitch=0;game.held=-1;
    if(Number.isFinite(save.x)&&Number.isFinite(save.y)&&game.clear(save.x,save.y)&&Number.isFinite(save.angle)){
      game.x=save.x;game.y=save.y;game.angle=save.angle;
    }
    this.film=save.film==='swallow'?'swallow':save.film==='assembly'&&this.reel&&this.rod&&!this.ready?'assembly':'';
    this.t=this.film?Math.min(coastFilms[this.film].duration,Math.max(0,Number(save.t)||0)):0;
    this.line=-1;this.catchTime=0;this.catchId='';
    this.cast=this.ready&&!this.key&&Object.hasOwn(shoreFish,save.cast)?save.cast:'';
    this.wait=this.cast?Math.max(0,Math.min(4,Number(save.wait)||0)):0;
  }
  checkpoint(){
    const {x,y,angle,elapsed}=this.game;
    return {stage:'village',x,y,angle,elapsed,task:this.task,cabinet:this.cabinet,reel:this.reel,rod:this.rod,ready:this.ready,
      key:this.key,nextBoss:this.nextBoss,film:this.film,t:this.t,cast:this.cast,wait:this.wait};
  }
  get target(){
    if(this.key)return 'gate';
    if(this.ready)return 'water';
    if(!this.task||this.rod&&this.reel)return 'elder';
    if(this.reel)return 'boat';
    if(this.rod)return 'cupboard';
    return this.game.distance(coastSpots.cupboard)<this.game.distance(coastSpots.boat)?'cupboard':'boat';
  }
  get objective(){
    if(this.film==='swallow')return 'Ratapihan tulvaportti';
    if(this.film==='assembly')return 'Kuuntele kalastajapapan tarina.';
    if(this.key)return 'Avaa sataman sulku avainkalalla.';
    if(this.ready)return this.cast?(this.wait>0?'Siima on vedessä. Odota tärppiä.':'Tärppäsi! Kelaa kala ylös.'):'Kalasta avainkala laiturin päästä.';
    if(!this.task)return 'Puhu mökin edessä seisovalle kalastajapapalle.';
    if(this.reel&&this.rod)return 'Vie kela ja vapa takaisin kalastajapapalle.';
    return this.rod?'Etsi Shimano Stella mökin kaapista.':this.reel?'Hae Kuha-Kössi-vapa laituriveneestä.':'Etsi mökistä Shimano Stella ja veneestä Kuha-Kössi-vapa.';
  }
  get spot(){
    const g=this.game;
    return Object.keys(coastSpots).filter(k=>g.distance(coastSpots[k])<(k==='cupboard'?1.72:1.9)&&g.visible(coastSpots[k]))
      .sort((a,b)=>g.distance(coastSpots[a])-g.distance(coastSpots[b]))[0];
  }
  get hint(){
    if(this.film)return '';
    const spot=this.spot;
    if(spot==='elder')return this.task&&!this.ready&&this.rod&&this.reel?'Anna kela ja vapa':'Puhu kalastajapapalle';
    if(spot==='cupboard'&&this.task&&!this.reel)return this.cabinet?'Avaa kultareunainen laatikko ja ota Stella':'Avaa mökin kaappi';
    if(spot==='boat'&&this.task&&!this.rod)return 'Nosta Kuha-Kössi-vapa veneestä';
    if(spot==='water'&&this.ready&&!this.key)return this.cast?(this.wait>0?'Odota tärppiä…':'Kelaa saalis'):'Heitä siima';
    if(spot==='gate'&&this.key)return 'Avaa sataman sulku';
    return '';
  }
  items(){
    const prop=(spot,type)=>({...coastSpots[spot],type});
    return [prop('elder','coastElder'),prop('cupboard',this.reel?'coastCabinetEmpty':this.cabinet?'coastCabinetOpen':'coastCabinetClosed'),
      prop('boat',this.rod?'coastBoatEmpty':'coastBoatRod'),prop('gate',this.key?'coastGateOpen':'coastGate')];
  }
  changed(message,pitch=320){
    const g=this.game;if(message)g.tell(message);g.ui.tone(pitch);g.updateUI();g.ui.save();
  }
  use(){
    if(this.film)return;
    const spot=this.spot,g=this.game;
    if(spot==='elder'){
      if(!this.task){this.task=true;g.ui.radio.clear();g.ui.radio.say('task');this.changed('Kalastajan pyyntö · Mökin kaappi ja laiturivene.');return}
      if(this.reel&&this.rod&&!this.ready){this.film='assembly';this.t=0;this.line=-1;g.clearInput();g.ui.radio.clear();this.changed('');return}
      if(!this.ready){g.ui.radio.clear();g.ui.radio.say('task')}
      else g.tell(this.key?'Pappa nyökkää kohti sulkua.':'Pappa osoittaa laiturin päähän.');
      return;
    }
    if(spot==='cupboard'&&this.task&&!this.reel){
      if(!this.cabinet){this.cabinet=true;this.changed('Hyllyllä on kultareunainen laatikko.',210)}
      else{this.reel=true;this.changed('Sait Shimano Stella -kelan.')}
      return;
    }
    if(spot==='boat'&&this.task&&!this.rod){this.rod=true;this.changed('Sait Kalastajan Kanavan Kuha-Kössi-vavan.');return}
    if(spot==='water'&&this.ready&&!this.key){
      if(!this.cast){g.angle=Math.PI/2;g.cameraPitch=-.12;this.catchId='';this.cast=rollShoreFish();this.wait=2+Math.random()*2;this.changed('Siima solahtaa lahteen.',440);return}
      if(this.wait>0)return;
      this.catchId=this.cast;this.cast='';this.catchTime=6;
      this.key=this.catchId==='key';this.changed(this.key?'Avainkala! Sataman sulun lukko vastaa.':'',this.key?680:440);return;
    }
    if(spot==='gate'&&this.key){g.openTerminal(this.nextBoss);return}
    if(spot==='water'&&!this.ready)g.tell('Tarvitset ensin papan kokoaman vavan.');
    if(spot==='gate'&&!this.key)g.tell('Sulun lukossa on kalanmuotoinen kolo.');
  }
  finishFilm(){
    if(!this.film)return;
    const assembled=this.film==='assembly';this.film='';this.t=0;this.line=-1;
    if(assembled)this.ready=true;
    this.game.ui.radio.clear();this.game.clearInput();
    this.changed(assembled?'Vapa on valmis. Kokeile laiturin päästä.':'Suolasalmi · Rannassa seisoo vanha kalastaja.');
  }
  update(dt){
    if(this.film){
      const seq=coastFilms[this.film];this.t+=dt;
      if(this.t>=seq.duration){this.finishFilm();return}
      const index=seq.cues.findLastIndex(c=>this.t>=c.at);
      if(index!==this.line&&index>=0){
        this.line=index;const cue=seq.cues[index];
        this.game.ui.radio.sayAt(cue.id,this.t-cue.at);
      }
      return;
    }
    if(this.cast&&this.wait>0){
      this.wait=Math.max(0,this.wait-dt);
      if(!this.wait){this.game.ui.tone(600);this.game.tell('Koho painui! Kelaa saalis laiturilta.');this.game.updateUI()}
    }
    if(this.catchId){this.catchTime-=dt;if(this.catchTime<=0)this.catchId=''}
  }
  render(){
    const film=document.getElementById('coastFilm'),rig=document.getElementById('coastFloat'),card=document.getElementById('shoreCatch');
    film.hidden=!this.film;
    if(this.film){
      film.dataset.film=this.film;film.dataset.shot=String(Math.max(0,this.line));
      film.style.setProperty('--shot-progress',String(Math.min(1,this.t/coastFilms[this.film].duration)));
      const text=this.film==='swallow'?['Tulvaportti','Syvyyksiin','Suolasalmi']:['Viimeinen kalareissu','Mies salkkuineen','Katkennut siima'];
      film.querySelector('strong').textContent=text[Math.max(0,this.line)];
    }
    rig.hidden=!this.cast||!!this.film||this.game.distance(coastSpots.water)>1.9||Math.sin(this.game.angle)<.63;
    if(!rig.hidden)rig.classList.toggle('bite',this.wait===0);
    card.hidden=!this.catchId||!!this.film;
    if(this.catchId&&card.dataset.fish!==this.catchId){
      const fish=shoreFish[this.catchId];card.dataset.fish=this.catchId;
      card.querySelector('img').src='assets/'+(this.catchId==='key'?'keyfish.svg':'fish-'+this.catchId+'.svg');
      card.querySelector('strong').textContent=fish.name;card.querySelector('i').textContent=fish.latin;
      card.querySelector('p').textContent=fish.detail;
    }
  }
}
