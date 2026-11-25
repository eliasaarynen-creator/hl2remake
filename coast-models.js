'use strict';

const coastSpawn={x:3.45,y:8.7,angle:-.13};
const coastSpots={
  elder:{x:8.65,y:7.8},cupboard:{x:13.5,y:3.75},boat:{x:13.72,y:14.35},
  water:{x:12.95,y:17.28},gate:{x:22.2,y:8.55}
};
// The open area includes the net shed's interior, its south-facing doorway and the jetty.
const coastMap=Array.from({length:19},(_,y)=>Array.from({length:24},(_,x)=>{
  if(x===0||x===23||y===0||y>=12&&!(x>=12&&x<=13&&y<=17))return '1';
  if(x>=2&&x<=6&&y>=2&&y<=5||x>=17&&x<=20&&y>=2&&y<=5)return '2';
  if(x>=9&&x<=15&&y>=2&&y<=6&&(x===9||x===15||y===2||y===6&&(x<11||x>13)))return '2';
  return '0';
}).join(''));

function coastPlace(root,x,y,z=0,yaw=0){
  const group=group3(root);group.style.transform=place3(x,y,z)+' rotateY('+yaw+'deg)';return group;
}
function coastHouse(root,x,y,width,depth,paint,walkIn=false){
  const cottage=coastPlace(root,x,y,0,90),half=width/2,front=depth/2,eaves=2.25,rise=1.18;
  const wall=(r,f,w,d)=>box3(cottage,r,eaves/2,f,w,eaves,d,paint);
  wall(0,-front,width,.11);
  wall(-half,0,.12,depth);wall(half,0,.12,depth);
  if(walkIn){
    // Front extends from x9.5 to x15.5. Leave the full mapped three-tile entrance clear.
    for(const side of [-1,1])wall(side*(half+1.5)/2,front,half-1.5,.13);
    box3(cottage,0,2.05,front+.02,3,.4,.16,paint);
    floorMark(cottage,0,0,width-.10,depth-.10,'track-bed coast-interior',.016);
    for(const r of [-1.51,1.51])box3(cottage,r,.96,front+.04,.12,1.92,.19,'coast-cream');
    label3(cottage,0,2.08,front+.107,2.31,.26,'VERKKOVAJA','coast-sign');
    const net=face3(cottage,-half+.16,1.48,-.10,1.5,1,'rotateY(90deg)','coast-net');
    net.style.clipPath='polygon(0 0,100% 6%,93% 86%,43% 100%,4% 78%)';
    for(const r of [-1.65,2.05])box3(cottage,r,2.12,0,.12,.13,depth,'coast-tar');
    box3(cottage,-1.74,.61,-front+.22,1.52,.11,.43,'coast-cream');
    box3(cottage,-1.74,.30,-front+.21,.11,.6,.31,'coast-timber');
  }else{
    wall(0,front,width,.13);
    face3(cottage,-half*.50,.92,front+.071,.85,1.84,'','coast-door');
    face3(cottage,-half*.50+.28,.91,front+.078,.068,.068,'','coast-brass');
    face3(cottage,half*.37,1.35,front+.071,.83,.88,'','coast-window');
    box3(cottage,half*.37,.89,front+.10,.98,.08,.17,'coast-cream');
  }
  for(const side of [-1,1]){
    const gable=face3(cottage,0,eaves+rise/2,side*(front+.017),width,rise,side<0?'rotateY(180deg)':'',paint);
    gable.style.clipPath='polygon(0 100%,50% 0,100% 100%)';
    box3(cottage,side*(half-.035),eaves/2,front+.066,.11,eaves,.084,'coast-cream');
  }
  const pitch=Math.atan2(rise,half),over=.29,slope=(half+over)/Math.cos(pitch);
  for(const side of [-1,1]){
    const rotation='rotateZ('+(side*pitch)+'rad) rotateX(90deg)';
    face3(cottage,side*(half+over)/2,eaves+rise/2-over*Math.tan(pitch)/2,0,slope,depth+.53,rotation,'coast-roof');
    if(walkIn)face3(cottage,side*(half+over)/2,eaves+rise/2-over*Math.tan(pitch)/2-.035,0,slope,depth+.45,'rotateZ('+(side*pitch)+'rad) rotateX(-90deg)','coast-timber');
    beam3(cottage,[0,eaves+rise,front+.27],[side*(half+over),eaves-over*Math.tan(pitch),front+.27],.092,.10,'coast-cream');
  }
  box3(cottage,-half*.57,eaves+rise*.72,-front*.60,.31,1.06,.32,'brickwork');
  box3(cottage,-half*.57,eaves+rise*.72+.55,-front*.60,.40,.09,.40,'coast-tar');
}
function coastMooringPost(root,x,y,tall=false){
  const pier=coastPlace(root,x,y);
  box3(pier,0,tall?.30:.09,0,.13,tall?1.2:.68,.14,'coast-tar');
  if(tall)box3(pier,0,.61,0,.149,.09,.159,'coast-rope');
}
function coastLantern(root,x,y){
  const light=coastPlace(root,x,y);
  box3(light,0,1.27,0,.13,2.55,.13,'coast-tar');
  box3(light,0,2.51,.16,.085,.077,.40,'coast-tar');
  box3(light,0,2.34,.30,.17,.22,.17,'coast-lamp');
  box3(light,0,2.48,.30,.25,.07,.25,'coast-tar');
}
function coastIslands(root){
  // Low, cut-paper profiles keep the Baltic horizon continuous across the water.
  for(const [x,y,rotation,width,height] of [[-12,39,-120,36,2.1],[15,52,-90,40,2.65],[39,41,-55,22,1.75],[49,15,-18,31,3.1]]){
    const isle=coastPlace(root,x,y,-.45,rotation);
    const face=face3(isle,0,height/2,0,width,height,'','coast-island');
    face.style.clipPath='polygon(0 100%,0 94%,8% 86%,14% 70%,19% 76%,25% 49%,31% 60%,39% 41%,44% 47%,51% 30%,58% 41%,63% 36%,69% 58%,74% 54%,81% 71%,87% 68%,96% 87%,100% 94%,100% 100%)';
  }
  const beacon=coastPlace(root,24,31,-.35);
  drum3(beacon,0,.84,0,.43,.43,1.7,'coast-cream',8);
  drum3(beacon,0,2,0,.36,.36,.72,'coast-cinnabar',8);
  drum3(beacon,0,2.93,0,.32,.32,1.14,'coast-cream',8);
  drum3(beacon,0,3.47,0,.48,.48,.10,'coast-tar',8);
  box3(beacon,0,3.74,0,.48,.43,.48,'coast-lamp');
  drum3(beacon,0,4.0,0,.42,.42,.12,'coast-tar',8);
  // A distant Combine installation connects the hamlet to the city skyline.
  const spire=coastPlace(root,47,-1,0);
  box3(spire,0,5.0,0,1.45,10,1.75,'coast-spire');box3(spire,.34,11.0,-.02,.63,4.4,.98,'coast-spire');
  box3(spire,-.32,9.8,.90,.064,3.6,.07,'coast-relay');
}
function coastArchitecture(root,map){
  const size=map[0].length;
  // Ground faces use the projector's ground layers to avoid drawing over walls.
  for(let x=-5;x<size+7;x+=4)for(let y=-6;y<12;y+=3)
    floorMark(root,y+1.5,-x-2,3.01,4.01,'street-floor coast-ground',0);
  for(let x=-40;x<=64;x+=10)for(let y=12;y<62;y+=10)
    floorMark(root,y+5,-x-5,10.02,10.02,'street-floor coast-water',-.32);
  for(let x=1;x<23;x+=2){
    face3(root,12,-.16,-x-1,2.01,.34,'rotateY(90deg)','coast-bank');
    floorMark(root,11.7,-x-1,.60,2.01,'track-bed coast-shingle',.016);
  }
  coastIslands(root);
  coastHouse(root,4.5,4,4.72,3.78,'coast-cinnabar');
  coastHouse(root,12.5,4.5,6,4,'coast-sage',true);
  coastHouse(root,19,4,3.72,3.78,'coast-ochre');
  const shed=coastPlace(root,-1.6,8.4,0,90);box3(shed,0,1.10,0,3.6,2.2,3,'coast-sage');
  box3(shed,0,2.24,0,3.88,.20,3.35,'coast-roof');
  for(const [x,y] of [[2.5,10.35],[10.45,7.25],[14.6,11.35],[21.25,9.8]])coastLantern(root,x,y);
  // Deck planks sit at foot level. A gap in the mooring posts is the boat pickup.
  for(let y=11;y<18;y++)
    floorMark(root,y+.5,-13,1.005,2.015,'track-bed coast-deck',.045);
  face3(root,18,-.11,-13,2,.31,'rotateY(90deg)','coast-tar');
  for(const x of [12.10,13.90])for(const y of [12.05,15.7,17.87])coastMooringPost(root,x,y,true);
  const deckEnd=coastPlace(root,12.24,17.74);
  box3(deckEnd,0,.78,0,.28,.14,.12,'coast-lamp');
  // A row of nets hanging beside the fish landing.
  const racks=coastPlace(root,6.1,10.75,0,90);
  for(const i of [-1.26,1.26])box3(racks,i,1.02,0,.095,2.02,.10,'coast-tar');
  box3(racks,0,1.94,0,2.67,.10,.11,'coast-timber');
  for(const side of [-1,1]){
    const mesh=face3(racks,0,1.37,side*.01,2.40,1.06,side<0?'rotateY(180deg)':'','coast-net');
    mesh.style.clipPath='polygon(0 0,100% 0,98% 97%,76% 85%,48% 100%,21% 80%,4% 90%)';
  }
  // A bollard, dry lobster pots, and the bright ferry ring identify the quay.
  const quay=coastPlace(root,14.72,11.54,0,90);
  box3(quay,0,.59,0,.11,1.18,.12,'coast-tar');
  const ring=face3(quay,0,.86,-.081,.48,.48,'rotateY(180deg)','coast-buoy');ring.style.borderRadius='50%';
  for(const [x,y] of [[9.5,10.85],[17,10.6],[17.6,10.7]]){
    const basket=coastPlace(root,x,y);box3(basket,0,.21,0,.51,.42,.62,'coast-creel');
  }
  // The gate interrupts the concrete sea wall just above the lane.
  for(const [center,width] of [[4.06,6.12],[10.97,2.06]]){
    const wall=coastPlace(root,23.08,center);
    box3(wall,0,.99,0,width,1.98,.35,'yard-wall');
    box3(wall,0,2.02,0,width+.06,.095,.44,'coast-concrete');
  }
  // Trees and a low wooden fence read as the northern map boundary.
  for(const y of [-1.1,-4.3]){
    const forest=coastPlace(root,12,y,-.04,90);
    const trees=face3(forest,0,2.35,0,35,4.7,'','coast-forest');
    const outline=[[0,100]];
    for(let i=0;i<=30;i++){
      const left=i/31*100,peak=10+Math.round(37*(.5+.5*Math.sin(i*4.38+y)));
      outline.push([left,70],[left+1.5,peak],[left+3.15,75]);
    }
    outline.push([100,100]);trees.style.clipPath='polygon('+outline.map(([r,h])=>r+'% '+h+'%').join(',')+')';
  }
  for(let x=1;x<=23;x+=2){
    const fence=coastPlace(root,x,.92);
    box3(fence,0,.52,0,.10,1.04,.10,'coast-tar');
    if(x<23)box3(fence,0,.67,-1,.065,.10,2,'coast-timber');
  }
}
function coastFisher(root){
  const person=group3(root);person.style.transform='rotateY(8deg)';
  floorMark(person,0,0,.64,.38,'contact-shadow');
  for(const side of [-1,1]){
    box3(person,side*.13,.11,.036,.16,.21,.26,'coast-boots');
    beam3(person,[side*.13,.18,0],[side*.13,.76,-.024],.15,.16,'coast-trousers');
  }
  drum3(person,0,.89,0,.29,.18,.43,'coast-oilskin',7);
  drum3(person,0,1.18,-.006,.268,.174,.36,'coast-oilskin',7);
  for(const side of [-1,1]){
    beam3(person,[side*.24,1.28,0],[side*.34,1.00,.025],.16,.17,'coast-oilskin');
    beam3(person,[side*.34,1.00,.025],[side*.23,.93,.20],.15,.14,'coast-oilskin');
    box3(person,side*.23,.925,.20,.105,.105,.14,'coast-skin');
    face3(person,side*.14,1.05,.159,.118,.095,'','coast-pocket');
  }
  box3(person,0,1.33,.015,.27,.15,.21,'coast-knit');
  drum3(person,0,1.51,.01,.16,.143,.28,'coast-skin',8);
  const beard=face3(person,0,1.46,.157,.32,.21,'','coast-beard');
  beard.style.clipPath='polygon(0 4%,17% 21%,40% 20%,49% 28%,58% 20%,81% 22%,100% 1%,94% 57%,73% 82%,49% 100%,19% 81%,4% 53%)';
  box3(person,0,1.545,.157,.057,.074,.055,'coast-skin');
  for(const side of [-1,1]){
    face3(person,side*.067,1.59,.147,.040,.015,'','coast-tar');
    face3(person,side*.066,1.62,.147,.070,.021,'','coast-beard');
    box3(person,side*.155,1.55,.022,.052,.09,.058,'coast-skin');
  }
  drum3(person,0,1.69,0,.174,.157,.14,'coast-hat',8);
  drum3(person,0,1.647,.005,.183,.169,.068,'coast-knit',8);
  // The mending needle and coiled twine are held at his waist.
  beam3(person,[-.21,.955,.23],[.23,.948,.22],.021,.023,'coast-bone');
}
function coastCabinet(root,open,empty){
  const cupboard=group3(root);cupboard.style.transform='rotateY(90deg)';
  box3(cupboard,0,.84,-.16,1.07,1.68,.12,'coast-door');
  for(const r of [-.51,.51])box3(cupboard,r,.84,.035,.072,1.67,.38,'coast-timber');
  for(const h of [.09,.72,1.62])box3(cupboard,0,h,.035,1.06,.074,.40,'coast-cream');
  const hinge=group3(cupboard);hinge.style.transform=local3(-.52,0,.255)+(open?' rotateY(-100deg)':'');
  box3(hinge,.51,.84,0,1.02,1.61,.067,'coast-door');
  box3(hinge,.905,.86,.056,.045,.17,.042,'coast-brass');
  if(!open){for(const h of [.31,1.36])box3(hinge,.06,h,.040,.14,.052,.025,'coast-tar')}
  if(open){
    box3(cupboard,.015,.86,.035,.68,.20,.29,'coast-box');
    for(const h of [.79,.948])box3(cupboard,.015,h,.035,.70,.024,.31,'coast-brass');
    for(const r of [-.25,.28])face3(cupboard,r,.87,.184,.033,.16,'','coast-brass');
    if(!empty){
      drum3(cupboard,.015,1.045,.035,.090,.082,.14,'coast-chrome',7);
      drum3(cupboard,.015,1.12,.035,.102,.092,.025,'coast-brass',7);
      beam3(cupboard,[.06,1.03,.06],[.16,.995,.10],.024,.026,'coast-chrome');
    }
  }
}
function coastSkiff(root,hasRod){
  const hull=group3(root);
  hull.style.transform=local3(0,-.21,-1.03)+' rotateY(90deg)';
  // Cross-sections taper into a pointed bow. The top remains open between the benches.
  const sections=[[-1.28,.39],[-.68,.50],[.29,.50],[.93,.34],[1.38,.035]];
  for(let i=1;i<sections.length;i++){
    const [a,wa]=sections[i-1],[b,wb]=sections[i];
    floorMark(hull,0,(a+b)/2,Math.min(wa,wb)*1.8,b-a+.035,'coast-skiff-bottom',.052);
    for(const s of [-1,1]){
      const mid=(a+b)/2,r=s*(wa+wb)/2;
      const yaw=s*(Math.PI/2+Math.atan2(wb-wa,b-a));
      const panel=group3(hull);panel.style.transform=local3(r,0,mid)+' rotateY('+yaw+'rad)';
      box3(panel,0,.195,0,Math.hypot(b-a,wb-wa)+.014,.34,.038,'coast-hull');
      box3(panel,0,.373,0,Math.hypot(b-a,wb-wa)+.032,.049,.068,'coast-cream');
    }
  }
  box3(hull,0,.185,-1.28,.78,.32,.05,'coast-hull');
  box3(hull,0,.28,-.61,.94,.063,.22,'coast-timber');
  box3(hull,0,.28,.40,.87,.063,.22,'coast-timber');
  const outboard=group3(hull);outboard.style.transform=local3(.11,0,-1.36)+' rotateX(-9deg)';
  box3(outboard,0,.29,0,.09,.51,.12,'coast-boots');
  box3(outboard,0,.565,0,.235,.19,.30,'coast-ochre');
  if(hasRod){
    beam3(hull,[-.25,.345,-.88],[-.16,.366,-.43],.057,.051,'coast-cork');
    beam3(hull,[-.16,.366,-.43],[.18,.47,1.22],.027,.027,'coast-rod');
    for(const t of [.30,.62,.83])box3(hull,-.16+.34*t,.366+.104*t,-.43+1.65*t,.044,.052,.03,'coast-brass');
  }
  // Mooring line runs from the gunwale back to the edge of the jetty.
  beam3(hull,[-.42,.36,-.74],[-.91,.44,-.98],.021,.026,'coast-rope');
}
function coastTerminalGate(root,open){
  const gate=group3(root);gate.style.transform=local3(0,0,-.36);
  for(const r of [-1.32,1.32])box3(gate,r,1.19,0,.23,2.38,.36,'coast-concrete');
  box3(gate,0,2.42,0,2.89,.19,.36,'coast-concrete');
  for(const s of [-1,1]){
    const r=s*(open?1.20:.62);
    box3(gate,r,1.05,-.03,open?.19:1.20,2.10,.16,'coast-shutter');
    if(!open)face3(gate,r,1.04,.057,1.195,.12,'','coast-stripe');
  }
  label3(gate,0,2.39,.19,1.64,.16,'TERMINAALI 00','coast-sign');
  box3(gate,1.32,1.18,.21,.25,.44,.12,'coast-boots');
  face3(gate,1.32,1.25,.276,.15,.10,'',open?'green-orb':'coast-lamp');
}
function coastRodModel(root){
  const rod=group3(root);
  const base=[.012,-.06,.20],seat=[0,.008,-.06],tip=[-.14,.66,-1.76];
  beam3(rod,base,seat,.052,.053,'coast-cork');
  beam3(rod,seat,[-.04,.18,-.52],.031,.035,'coast-rod');
  beam3(rod,[-.04,.18,-.52],tip,.018,.016,'coast-rod');
  for(const t of [.11,.36,.65,.93]){
    const r=seat[0]+(tip[0]-seat[0])*t,h=seat[1]+(tip[1]-seat[1])*t,f=seat[2]+(tip[2]-seat[2])*t;
    box3(rod,r,h-.013,f,.043*(1-t)+.018,.032,.016,'coast-brass');
  }
  beam3(rod,[-.005,-.01,-.05],[-.012,-.093,-.09],.032,.028,'coast-chrome');
  const reel=group3(rod);reel.style.transform=local3(-.01,-.100,-.11)+' rotateX(90deg)';
  drum3(reel,0,.006,0,.068,.060,.082,'coast-chrome',8);
  drum3(reel,0,.049,0,.059,.055,.03,'coast-brass',8);
  box3(reel,-.078,.012,0,.069,.021,.024,'coast-chrome');
  box3(reel,-.119,.024,.014,.028,.054,.041,'coast-boots');
  box3(rod,.025,-.050,.095,.1,.079,.092,'glove');
  beam3(rod,[.052,-.075,.123],[.16,-.21,.29],.08,.10,'hev');
}
function coastProp(root,type){
  switch(type){
    case 'coastElder':coastFisher(root);break;
    case 'coastCabinetClosed':coastCabinet(root,false,false);break;
    case 'coastCabinetOpen':coastCabinet(root,true,false);break;
    case 'coastCabinetEmpty':coastCabinet(root,true,true);break;
    case 'coastBoatRod':coastSkiff(root,true);break;
    case 'coastBoatEmpty':coastSkiff(root,false);break;
    case 'coastGate':coastTerminalGate(root,false);break;
    case 'coastGateOpen':coastTerminalGate(root,true);break;
    default:return false;
  }
  return true;
}
