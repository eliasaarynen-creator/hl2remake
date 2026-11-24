'use strict';

function pulseModel(parent,firstPerson=false){
  const body=group3(parent);
  box3(body,0,0,0,.17,.15,.42,'gunmetal');
  box3(body,0,-.024,.205,.185,.14,.105,'rubber');
  box3(body,0,.085,-.018,.11,.028,.33,'alloy-light');
  box3(body,0,.075,-.17,.09,.12,.045,'rubber');
  label3(body,0,.084,-.145,.063,.049,'◉','lens');
  const barrel=group3(body);barrel.style.transform=local3(0,.013,-.205)+' rotateX(90deg)';
  drum3(barrel,0,.17,0,.051,.054,.34,'alloy-light');
  for(let i=0;i<5;i++)drum3(barrel,0,.035+i*.056,0,.064,.062,.025,'gunmetal');
  drum3(barrel,0,.314,0,.068,.067,.1,'rubber');
  drum3(barrel,0,.369,0,.037,.038,.011,'pulse-light');
  for(const s of [-1,1]){
    box3(body,s*.087,.005,.018,.015,.095,.23,'receiver');
    for(let j=0;j<5;j++)box3(body,s*.098,.006,.08-j*.035,.008,.056,.012,'rubber');
  }
  box3(body,0,-.12,-.035,.115,.18,.11,'magazine');
  box3(body,0,-.175,-.035,.125,.025,.123,'alloy-light');
  beam3(body,[0,-.06,.12],[0,-.235,.183],.084,.085,'rubber');
  box3(body,-.045,.081,.08,.021,.016,.10,'pulse-light');
  if(firstPerson)hands3(body);
  return body;
}
function gravityModel(parent){
  const body=group3(parent);
  box3(body,0,-.013,.12,.195,.19,.24,'receiver');
  const coil=group3(body);coil.style.transform=local3(0,0,.045)+' rotateX(90deg)';
  drum3(coil,0,.175,0,.080,.081,.35,'hot-coil',10);
  for(let i=0;i<8;i++)drum3(coil,0,.008+i*.046,0,.096,.094,.016,'copper',10);
  drum3(coil,0,.374,0,.113,.115,.072,'gunmetal');
  for(const [x,y] of [[-.117,.063],[.117,.063],[0,-.12]]){
    beam3(body,[x*.62,y*.65,-.27],[x*1.44,y*1.42,-.36],.035,.042,'alloy-light');
    beam3(body,[x*1.44,y*1.42,-.36],[x*1.40,y*1.40,-.53],.029,.033,'gunmetal');
    beam3(body,[x*1.40,y*1.40,-.53],[x,y,-.56],.023,.027,'copper');
  }
  box3(body,-.06,.115,.13,.076,.062,.09,'instrument');
  label3(body,-.06,.117,.177,.06,.042,'λ','lens amber-lens');
  for(let i=0;i<3;i++)box3(body,.103,.005,.155-i*.046,.012,.09,.018,'copper');
  hands3(body);return body;
}
function hands3(body){
  beam3(body,[.067,-.087,.141],[.185,-.262,.31],.09,.09,'hev');
  box3(body,.061,-.073,.138,.105,.096,.105,'rubber');
  beam3(body,[-.077,-.135,-.145],[-.17,-.258,.06],.081,.086,'hev');
  box3(body,-.065,-.091,-.151,.103,.102,.106,'glove');
}
// A curved, textured shell for each recorded pose. Each facet has its own depth
// and normal. The atlas supplies directional skin, clothing and animation frames.
function actor3(root,type){
  const friend=type==='kajo'||type==='saro',story=['soul','gman','ghost'].includes(type);
  const file=story?'story-model-'+(type==='soul'?'soul':'gman'):'actor-'+type;
  const views=story?12:8,cols=story?4:8,rows=story?3:friend?7:type==='giant'?8:6;
  const aspect={soul:162/316,gman:212/406,ghost:212/406,kajo:178/278,saro:178/278,guard:137/203,giant:169/223}[type];
  const height=1.78,width=aspect*height,facets=[],shell=group3(root);
  floorMark(root,0,0,width*.89,.4,'contact-shadow');
  const divisions=7,depth=type==='giant'?.19:.112;
  for(let i=0;i<divisions;i++){
    const a=i/divisions,b=(i+1)/divisions;
    const z=u=>depth*Math.sqrt(Math.max(0,1-(2*u-1)**2));
    const x0=(a-.5)*width,x1=(b-.5)*width,z0=z(a),z1=z(b);
    const strip=Math.hypot(x1-x0,z1-z0),yaw=Math.atan2(z0-z1,x1-x0);
    const part=face3(shell,(x0+x1)/2,height/2,(z0+z1)/2,strip+.0018,height,'rotateY('+yaw+'rad)','actor-skin');
    const texWidth=strip*divisions;
    part.style.backgroundImage='url(assets/'+file+'.webp)';
    part.style.backgroundSize=px(texWidth*cols)+' '+px(height*rows);
    if(type==='ghost')part.style.filter='sepia(.8) saturate(2) hue-rotate(125deg)';
    facets.push({part,texWidth,a});
  }
  let previous=-1;
  return {update(o,observer){
    const facing=o.facing??Math.PI,delta=Math.atan2(observer.y-o.y,observer.x-o.x)-facing;
    const index=(Math.round(delta*views/(2*Math.PI))%views+views)%views;
    const phase=Number.isFinite(o.pose)?Math.floor(o.pose*4)%4:-1;
    let row=0,col=index;
    if(story){row=Math.floor(index/cols);col=index%cols}
    else if(friend)row=!o.armed?0:o.firing?6:phase<0?1:2+phase;
    else if(type==='giant')row=o.stomp?3+Math.max(1,Math.round(o.stomp*3)):o.flash>0?7:Math.max(0,phase);
    else row=o.flash>0?5:o.firing?4:Math.max(0,phase);
    const frame=row*cols+col;
    if(frame!==previous){
      previous=frame;
      for(const {part,texWidth,a} of facets)part.style.backgroundPosition=px(-(col+a)*texWidth)+' '+px(-row*height);
    }
    // Rotate in sub-view increments so the shell remains three-dimensional between views.
    return -index*2*Math.PI/views;
  }};
}
