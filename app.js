'use strict';
const $=id=>document.getElementById(id), home=$('home'), arena=$('arena'), panel=$('panel'), content=$('panelContent');
const icons=name=>'<svg class="icon" aria-hidden="true"><use href="#'+name+'"/></svg>';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const prefs=Object.assign({sound:true,volume:65,sensitivity:50},read('lambda.settings',{}));
const radio=new CampaignRadio($('radio'),prefs);
let game=null,view='',parentView='',previousFocus=null,inGame=false,audioCtx,master,drone,toastTimer,practice=false,footBuffer;
let progress=read('lambda.progress',null),drag=null,padPointer=null;
function showScreenControls(show){
  arena.classList.toggle('screen-controls',show);
  $('padToggle').setAttribute('aria-pressed',String(show));
  if(!show)releasePad();
}
showScreenControls(prefs.screenControls??matchMedia('(any-pointer:coarse)').matches);
$('padToggle').onclick=()=>{
  prefs.screenControls=!arena.classList.contains('screen-controls');
  showScreenControls(prefs.screenControls);
  write('lambda.settings',prefs);
  $('world').focus({preventScroll:true});
};
function soundInit(){
  if(!prefs.sound)return;
  try{if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.connect(audioCtx.destination);drone=audioCtx.createOscillator();const hum=audioCtx.createGain();hum.gain.value=.016;drone.frequency.value=54.5;drone.type='sine';drone.connect(hum).connect(master);drone.start()}radio.connect(audioCtx,master);audioCtx.resume().catch(()=>{});master.gain.setTargetAtTime(prefs.volume/100,audioCtx.currentTime,.03)}catch{}
}
function tone(pitch){
  if(!prefs.sound||!audioCtx||!master)return;
  const n=audioCtx.currentTime,os=audioCtx.createOscillator(),v=audioCtx.createGain();os.type='sine';os.frequency.setValueAtTime(pitch,n);os.frequency.exponentialRampToValueAtTime(pitch*.64,n+.15);v.gain.setValueAtTime(.13,n);v.gain.exponentialRampToValueAtTime(.0001,n+.22);os.connect(v).connect(master);os.start();os.stop(n+.24);
}
function pulse(){
  if(!prefs.sound||!audioCtx||!master)return;
  const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
  osc.type='sawtooth';osc.frequency.setValueAtTime(240,now);osc.frequency.exponentialRampToValueAtTime(48,now+.11);
  filter.type='lowpass';filter.frequency.setValueAtTime(2600,now);filter.frequency.exponentialRampToValueAtTime(380,now+.13);
  gain.gain.setValueAtTime(.16,now);gain.gain.exponentialRampToValueAtTime(.001,now+.14);
  osc.connect(filter).connect(gain).connect(master);osc.start();osc.stop(now+.15);
}
function allyPulse(index){
  if(!prefs.sound||!audioCtx||!master)return;
  const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type='triangle';osc.frequency.setValueAtTime(index?360:310,now);osc.frequency.exponentialRampToValueAtTime(110,now+.09);
  gain.gain.setValueAtTime(.042,now);gain.gain.exponentialRampToValueAtTime(.001,now+.1);osc.connect(gain).connect(master);osc.start();osc.stop(now+.12);
}
function footstep(){
  if(!prefs.sound||!audioCtx||!master)return;
  if(!footBuffer){
    footBuffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.085),audioCtx.sampleRate);
    const samples=footBuffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/samples.length*5);
  }
  const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
  source.buffer=footBuffer;filter.type='lowpass';filter.frequency.value=game?.encounter?620:950;
  gain.gain.value=.105;source.connect(filter).connect(gain).connect(master);source.start();
}
function reflectSound(){const on=prefs.sound;$('soundIcon').setAttribute('href',on?'#sound':'#mute');$('soundName').textContent=on?'Äänet päällä':'Äänet pois';$('soundBtn').setAttribute('aria-pressed',String(on));$('soundBtn').setAttribute('aria-label',on?'Mykistä äänet':'Ota äänet käyttöön');if($('soundToggle')){$('soundToggle').textContent=on?'Päällä':'Pois';$('soundToggle').setAttribute('aria-pressed',String(on))}}
function toggleSound(){prefs.sound=!prefs.sound;if(prefs.sound){soundInit();tone(240)}else if(master)master.gain.setTargetAtTime(0,audioCtx.currentTime,.025);radio.playClip();reflectSound();write('lambda.settings',prefs)}
function toast(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',3200)}
function choice(id,title,sub,primary=false,icon=''){return '<button class="choice '+(primary?'primary':'')+'" id="'+id+'"><span><strong>'+title+'</strong><small>'+sub+'</small></span>'+icons(icon||'play')+'</button>'}
function openPanel(name){
  if(!panel.open){previousFocus=document.activeElement;panel.showModal()}view=name;renderPanel();
}
function closePanel(){if(panel.open)panel.close();view='';parentView='';if(!inGame&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true})}
function back(){if(view==='restartStory'){openPanel('pause');return}if(view==='pause'){resume();return}if(view==='winner'||view==='defeat'){mainMenu();return}if(view==='controls'||view==='settings'){if(parentView==='pause'){openPanel('pause');return}}closePanel()}
function row(label,keys){return '<div class="row"><span>'+label+'</span><span>'+keys.map(k=>'<kbd>'+k+'</kbd>').join(' ')+'</span></div>'}
function renderPanel(){
  const name=view;let html='',heading='';
  if(name==='original'){
    heading='Half-Life 2';html='<p class="helper">Pelaa alkuperäistä kampanjaa selaimella. Avaa GeForce NOW, kirjaudu sisään ja hae peli nimellä Half-Life 2. Tarvitset pelin Steam-kirjastoosi.</p><a class="choice primary" href="https://play.geforcenow.com/" target="_blank" rel="noopener"><span><strong>Avaa GeForce NOW</strong><small>Pilvipeli · Avautuu uuteen välilehteen</small></span>'+icons('play')+'</a><a class="choice" href="steam://rungameid/220"><span><strong>Käynnistä Steamissa</strong><small>Avaa tietokoneelle asennettu peli</small></span>'+icons('play')+'</a><a class="textlink" href="https://store.steampowered.com/app/220/HalfLife_2/" target="_blank" rel="noopener">Half-Life 2 Steam-kaupassa</a>';
  }else if(name==='controls'){
    heading='Ohjaimet';html='<p class="fieldlabel">CITY 17 · FANITEHTÄVÄ</p>'+row('Liiku',['W','A','S','D'])+row('Eteen ja taakse',['↑','↓'])+row('Katso ympärillesi',['Hiiri'])+row('Käänny',['←','→'])+row('Juokse',['Shift'])+row('Tartu, vapauta tai käytä',['E','Hiiren 1'])+row('Ammu pulssikiväärillä',['Hiiren 1','F'])+row('Syöksy ja väistä',['Välilyönti'])+row('Tauko',['Esc'])+'<p class="helpfooter">Ruutuohjaimen saa esiin pelin oikeasta yläkulmasta. Liiku vetämällä vasenta ohjainta ja käänny vetämällä pelikenttää. λ-painikkeella voit käyttää esineitä ja siepata tai palauttaa energiapallon. Ratapihalla pidä ampumapainiketta pohjassa. Pulssikiväärissä on loputtomasti panoksia. Betonivallit ja rahtikontit pysäyttävät vihollisten tulen ja järistykset. Syöksy liikesuuntaan omalla painikkeellaan.</p>';
  }else if(name==='settings'){
    heading='Asetukset';html='<div class="row"><span>Äänet</span><button id="soundToggle" class="toggle"></button></div><div class="row"><label for="volume">Äänenvoimakkuus<small id="volumeValue"></small></label><input id="volume" type="range" min="0" max="100" value="'+Number(prefs.volume)+'"></div><div class="row"><label for="sensitivity">Hiiren herkkyys<small id="sensValue"></small></label><input id="sensitivity" type="range" min="1" max="100" value="'+Number(prefs.sensitivity)+'"></div><p class="helpfooter">Asetukset tallentuvat tähän selaimeen.</p>';
  }else if(name==='pause'){
    heading='Peli tauolla';html='<p class="fieldlabel">'+(game?.encounter?'TERMINAALI 00 · G-MAN':game?.yard?'RATAPIHA 09 · VASTARINTA':'CITY 17 · ASEMA-AUKIO')+'</p>'+choice('continue','Jatka peliä','Palaa käynnissä olevaan peliin',true)+choice('pauseControls','Ohjaimet','Liikkuminen, aseet ja vuorovaikutus',false,'keys')+choice('pauseSettings','Asetukset','Äänet ja hiiren herkkyys',false,'gear')+'<button id="toMenu" class="closealt">'+(practice?'Lopeta harjoittelu':'Tallenna ja palaa päävalikkoon')+'</button>';
    if(!practice)html+='<button id="restartStory" class="closealt">Aloita kampanja alusta</button>';
  }else if(name==='restartStory'){
    heading='Palataanko asemalle?';
    html='<p class="helper">Uusi kampanja korvaa tämän selaimen tallennuksen. Tapaat junanlähettäjän ensimmäisellä laiturilla.</p>'+choice('newGame','Aloita alusta','Asema-aukio · Luku 1',true)+'<button id="cancelRestart" class="closealt">Takaisin taukovalikkoon</button>';
  }else if(name==='defeat'){
    heading='Aika pysähtyi.';
    if(game.yard){
      const num=game.yard.wave+1;
      html='<p class="fieldlabel">RATAPIHA 09 · AALTO '+num+'/3</p><p class="helper">Karo ja Särö vartioivat vaihdetta. Palaa radalle täydellä kunnolla.</p>'+choice('retry','Yritä uudelleen','Aloita aalto '+num+' uudelleen',true)+'<button id="toMenu" class="closealt">Päävalikkoon</button>';
    }else{
    const phase=game.encounter.phase+1;
    html='<p class="fieldlabel">G-MAN · VAIHE '+phase+'/3</p><p class="helper">Sieppaa sininen pallo läheltä ja palauta se kohti kultaista kehää. Syöksyllä pääset aikarepeämän ulottumattomiin.</p>'+choice('retry','Yritä uudelleen','Jatka vaiheesta '+phase+' täydellä kunnolla',true)+'<button id="toMenu" class="closealt">Päävalikkoon</button>';
    }
  }else if(name==='winner'){
    heading='Aika liikkuu taas.';
    const seconds=Math.floor(game.elapsed);
    html='<p class="fieldlabel">G-MAN KUKISTETTU</p><p class="helper">Viimeinen pallo rikkoo aikasilmukan. Salkku putoaa laiturille. Viimeinen juna ylittää vaihteen, ja junanlähettäjän lyhty sammuu.</p>'+row(practice?'Harjoitteluaika':'Kampanjan kesto',[Math.floor(seconds/60)+' min '+seconds%60+' s'])+choice('replay',practice?'Harjoittele uudelleen':'Uusi kampanja',practice?'Palaa ensimmäiseen vaiheeseen':'Palaa asema-aukiolle',true)+'<button id="toMenu" class="closealt">Päävalikkoon</button>';
  }
  content.innerHTML='<h2 id="panelTitle" tabindex="-1">'+heading+'</h2>'+html;
  const bind=(id,fn)=>{if($(id))$(id).onclick=fn};
  bind('soundToggle',toggleSound);bind('restartStory',()=>openPanel('restartStory'));bind('newGame',()=>begin('fresh'));bind('cancelRestart',()=>openPanel('pause'));
  bind('replay',()=>begin(practice?'practice':'fresh'));bind('retry',retry);bind('continue',resume);bind('toMenu',mainMenu);
  bind('pauseControls',()=>{parentView='pause';openPanel('controls')});bind('pauseSettings',()=>{parentView='pause';openPanel('settings')});
  if(name==='settings'){
    reflectSound();const update=()=>{$('volumeValue').textContent=prefs.volume+' %';$('sensValue').textContent=prefs.sensitivity+' %'};update();
    $('volume').oninput=e=>{prefs.volume=Number(e.target.value);if(prefs.sound)soundInit();update();write('lambda.settings',prefs)};$('volume').onchange=()=>tone(220);
    $('sensitivity').oninput=e=>{prefs.sensitivity=Number(e.target.value);update();write('lambda.settings',prefs)};
  }
  $('panelTitle').focus({preventScroll:true});
}
function checkpoint(){if(practice||!game||game.completed)return;progress=game.serialize();write('lambda.progress',progress)}
function getGame(){
  if(!game)game=new CityGame($('world'),{
    radio,pulse,kind:$('weaponKind'),act:$('actBtn'),mission:$('mission'),weapon:$('weaponState'),interact:$('interaction'),notice:$('notice'),
    section:$('sectionName'),bossHud:$('bossHud'),bossBar:$('bossBar'),bossStage:$('bossStage'),
    vitals:$('vitals'),health:$('health'),healthBar:$('healthBar'),bearing:$('bearing'),dash:$('dashState'),
    phaseSplash:$('phaseSplash'),warning:$('hazardWarning'),aim:$('crosshair'),arena,
    tone,footstep,allyPulse,save:checkpoint,finish:win,lose:defeat
  });
  return game;
}
function lock(){
  if(arena.classList.contains('screen-controls')||document.pointerLockElement||!$('world').requestPointerLock)return;
  try{const promise=$('world').requestPointerLock();if(promise?.catch)promise.catch(()=>{})}catch{}
}
function unlock(){if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock()}
function begin(mode='continue'){
  practice=mode==='practice';
  const g=getGame();g.reset();inGame=true;closePanel();home.hidden=true;arena.hidden=false;soundInit();
  if(practice)g.openTerminal();
  else if(mode==='continue'&&progress)g.restore(progress);
  g.start();$('world').focus();
  if(g.encounter)g.tell('Sieppaa lähestyvä pallo ja palauta se G-Maniin.');
  else if(g.yard)g.tell(g.yard.armed?'Seuraa ratapihan opastinta.':'Karo viittoo sinua lähemmäs.');
  else g.tell(g.held>=0?'Vie kenno siniselle releelle.':g.done===2?'Kulje vihreälle portille.':(arena.classList.contains('screen-controls')?'Liiku vetämällä vasenta ohjainta.':'Liiku WASD-näppäimillä tai nuolilla.'));
  checkpoint();
}
function retry(){
  closePanel();if(game.yard)game.openYard(game.yard.checkpoint());else game.openTerminal(game.encounter.checkpoint);game.start();$('world').focus();
}
function defeat(){checkpoint();unlock();openPanel('defeat')}
function updatePlayLabel(){
  $('playText').textContent=progress?'Jatka kampanjaa':'Aloita kampanja';
  const chapter=progress?.stage==='terminal'&&progress.yardCleared===true?2:progress?.stage==='yard'||progress?.stage==='terminal'?1:0;
  document.querySelectorAll('.route li').forEach((item,i)=>{if(i===chapter)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current')});
}
function pause(){if(!game?.running)return;game.stop();drag=null;releasePad();checkpoint();unlock();openPanel('pause')}
function resume(){closePanel();game.start();$('world').focus();soundInit()}
function mainMenu(){radio.clear();if(game?.running)game.stop();if(inGame&&!game.completed)checkpoint();inGame=false;unlock();arena.hidden=true;home.hidden=false;closePanel();practice=false;updatePlayLabel();$('playBtn').focus()}
function win(){if(!practice){progress=null;write('lambda.progress',null)}tone(540);unlock();openPanel('winner')}
$('playBtn').onclick=()=>begin();$('practiceBtn').onclick=()=>begin('practice');$('originalBtn').onclick=()=>openPanel('original');$('settingsBtn').onclick=()=>{parentView='home';openPanel('settings')};$('controlsBtn').onclick=()=>{parentView='home';openPanel('controls')};$('soundBtn').onclick=toggleSound;$('closePanel').onclick=back;$('pauseBtn').onclick=pause;
panel.addEventListener('cancel',e=>{e.preventDefault();back()});
panel.addEventListener('click',e=>{if(e.target!==panel)return;const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)back()});
$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Selain ei tue koko näytön tilaa.')}catch{toast('Koko näytön tila ei ole käytettävissä tässä näkymässä.')}};
document.addEventListener('fullscreenchange',()=>{let label=document.fullscreenElement?'Poistu koko näytöstä':'Koko näyttö';$('fullBtn').setAttribute('aria-label',label);$('fullBtn').title=label;$('fullIcon').setAttribute('href',document.fullscreenElement?'#shrink':'#full')});
const gameKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape','KeyE','KeyF','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight']);
const keyAliases={w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',e:'KeyE',f:'KeyF',' ':'Space',Shift:'ShiftLeft'};
function gameKey(e){
  if(gameKeys.has(e.code))return e.code;
  return keyAliases[e.key]||keyAliases[e.key?.toLowerCase()]||e.key;
}
window.addEventListener('keydown',e=>{
  if(panel.open||e.ctrlKey||e.metaKey||e.altKey)return;
  if(game?.running){
    const code=gameKey(e);
    if(!gameKeys.has(code))return;
    e.preventDefault();
    if(code==='Escape'){if(!e.repeat)pause();return}
    if(code==='Space'){if(!e.repeat)game.dash();return}
    if(code==='KeyE'){if(!e.repeat)game.action();return}
    if(code==='KeyF'&&!e.repeat)game.yard?.fire();
    game.press(code);
    return;
  }
  const nav=[...document.querySelectorAll('.navitem,#practiceBtn')],i=nav.indexOf(document.activeElement);
  if(e.code==='ArrowDown'||e.code==='ArrowUp'){e.preventDefault();nav[(i<0?(e.code==='ArrowDown'?0:nav.length-1):(i+(e.code==='ArrowDown'?1:-1)+nav.length)%nav.length)].focus()}
  if(e.key==='Enter'&&document.activeElement===document.body){e.preventDefault();$('playBtn').click()}
},true);
window.addEventListener('keyup',e=>game?.keys.delete(gameKey(e)),true);
function look(dx,dy){if(!game?.running)return;const sense=.00055+prefs.sensitivity*.00004;game.angle+=dx*sense;game.cameraPitch=Math.min(.29,Math.max(-.29,game.cameraPitch-dy*sense*.5))}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('world'))look(e.movementX,e.movementY)});
document.addEventListener('pointerlockchange',()=>{
  drag=null;
  if(game?.yard)game.yard.trigger=false;
});
$('world').addEventListener('pointerdown',e=>{
  if(!game?.running||e.button!==0)return;
  $('world').focus({preventScroll:true});
  if(document.pointerLockElement===$('world')){const y=game.yard;if(y?.armed)y.trigger=true;game.action(true);return}
  drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:0};$('world').setPointerCapture(e.pointerId);
});
$('world').addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);look(dx,dy);drag.x=e.clientX;drag.y=e.clientY});
$('world').addEventListener('pointerup',e=>{if(e.pointerId!==drag?.id)return;if(drag.moved<6&&e.pointerType!=='touch'){game.action(true);lock()}drag=null});
document.addEventListener('pointerup',()=>{if(game?.yard)game.yard.trigger=false});
document.addEventListener('pointercancel',()=>{if(game?.yard)game.yard.trigger=false;drag=null});
$('actBtn').onpointerdown=e=>{
  if(!game?.running)return;e.preventDefault();$('actBtn').setPointerCapture(e.pointerId);
  if(game.yard?.armed)game.yard.trigger=true;game.action(true);
};
$('actBtn').onclick=e=>{if(e.detail===0)game?.action(true)};$('dashBtn').onclick=()=>game?.dash();
function movePad(e){if(e.pointerId!==padPointer)return;const r=$('pad').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,lim=Math.max(31,Math.hypot(dx,dy));game.setStick(dx/lim,dy/lim);$('stick').style.transform='translate('+game.joy.x*29+'px,'+game.joy.y*29+'px)'}
function releasePad(){padPointer=null;if(game)game.setStick(0,0);$('stick').style.transform=''}
$('pad').onpointerdown=e=>{if(!game?.running||padPointer!==null)return;e.preventDefault();padPointer=e.pointerId;$('pad').setPointerCapture(e.pointerId);movePad(e)};$('pad').onpointermove=movePad;$('pad').onlostpointercapture=$('pad').onpointerup=$('pad').onpointercancel=e=>{if(e.pointerId===padPointer)releasePad()};
window.addEventListener('blur',()=>{if(game?.running){drag=null;releasePad();game.clearInput()}});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game?.running)pause();if(audioCtx)audioCtx.suspend().catch(()=>{})}else if(prefs.sound&&audioCtx)soundInit()});
window.addEventListener('pagehide',()=>{if(inGame)checkpoint()});
setInterval(()=>{if(game?.running)checkpoint()},5000);
reflectSound();

updatePlayLabel();
