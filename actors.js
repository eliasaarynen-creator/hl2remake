'use strict';

// A small orthographic mesh renderer for the raycast world's articulated figures.
// Model X goes across the shoulders, Y points forward and Z points up.
const actorFrame = (() => {
  const TAU=Math.PI*2, views=16;
  const cache=new Map(), models=new Map(), skins=new Map();
  const rgb=hex=>[(hex>>16)&255,(hex>>8)&255,hex&255];
  const materials=new Map();
  function mat(hex,finish='cloth',texture=null){
    const key=hex+'|'+finish+'|'+texture;
    if(!materials.has(key))materials.set(key,{rgb:rgb(hex),finish,texture});
    return materials.get(key);
  }
  const cloth=h=>mat(h), metal=h=>mat(h,'metal'), rubber=h=>mat(h,'rubber'), glow=h=>mat(h,'light');
  const black=rubber(0x232c30),steel=metal(0x758286),dark=metal(0x354851),pale=metal(0xb7bbb0);
  const gold=metal(0xc1894e),blue=glow(0x7cdfff),amber=glow(0xffb85a);
  const radial=(a,b,t)=>a+(b-a)*t;
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const unit=v=>{const d=Math.hypot(...v)||1;return v.map(n=>n/d)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const at=(a,b,t)=>a.map((n,i)=>radial(n,b[i],t));
  const vert=(p,n,u=0,v=0,blend=0)=>[...p,...n,u,v,blend];
  function mesh(){
    const triangles=[];
    function quad(p,q,r,s,m){triangles.push([p,q,r,m],[p,r,s,m])}
    function flat(points,m){
      const n=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      const v=points.map(p=>vert(p,n));for(let i=2;i<v.length;i++)triangles.push([v[0],v[i-1],v[i],m]);
    }
    function box(center,size,m){
      const x=size[0]/2,y=size[1]/2,z=size[2]/2;
      const p=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].map(v=>add(v,center));
      for(const face of [[0,3,2,1],[4,5,6,7],[3,7,6,2],[1,5,4,0],[1,2,6,5],[0,4,7,3]])flat(face.map(i=>p[i]),m);
    }
    // Horizontal profiles are [height, half-width, half-depth, optional Y offset].
    function loft(x,y,profiles,m,{sides=12,surface,uv}={}){
      const rings=profiles.map(([z,w,d,cy=0],j)=>{
        const last=profiles[Math.max(0,j-1)],next=profiles[Math.min(profiles.length-1,j+1)];
        return Array.from({length:sides+1},(_,i)=>{
          const a=i/sides*TAU,s=Math.sin(a),c=Math.cos(a);
          const slope=(s*s*(last[1]-next[1])+c*c*(last[2]-next[2]+(last[3]||0)-(next[3]||0)))/(next[0]-last[0]||1);
          const pos=[x+w*s,y+cy+d*c,z];
          if(surface)surface(pos,z,s,c);
          return vert(pos,unit([s*(d/w),c,slope]),...(uv?uv(z,s,c):[]));
        });
      });
      for(let j=1;j<rings.length;j++)for(let i=0;i<sides;i++){
        const surfaceMat=typeof m==='function'?m((profiles[j-1][0]+profiles[j][0])*.5,Math.cos((i+.5)/sides*TAU)):m;
        quad(rings[j-1][i],rings[j][i],rings[j][i+1],rings[j-1][i+1],surfaceMat);
      }
      for(const end of [0,rings.length-1]){
        const pts=rings[end].slice(0,-1).map(v=>v.slice(0,3));if(end)pts.reverse();
        flat(pts,typeof m==='function'?m(profiles[end][0],-1):m);
      }
    }
    function tube(a,b,r1,r2,m,sides=10,flatSides=false){
      const axis=unit(sub(b,a)),right=unit(cross(axis,Math.abs(axis[2])<.8?[0,0,1]:[0,1,0])),up=cross(axis,right);
      const circle=Array.from({length:sides},(_,i)=>right.map((n,j)=>n*Math.cos(i*TAU/sides)+up[j]*Math.sin(i*TAU/sides)));
      const first=circle.map(n=>a.map((q,j)=>q+r1*n[j])),last=circle.map(n=>b.map((q,j)=>q+r2*n[j]));
      for(let i=0;i<sides;i++){const k=(i+1)%sides;
        if(flatSides)flat([first[i],first[k],last[k],last[i]],m);
        else quad(vert(first[i],circle[i]),vert(first[k],circle[k]),vert(last[k],circle[k]),vert(last[i],circle[i]),m);
      }flat(first.slice().reverse(),m);flat(last,m);
    }
    // Elliptical cross-sections give sleeves and trouser legs both taper and folds.
    function garment(lower,upper,profile,m,uv){
      const rise=upper[2]-lower[2];
      const rings=profile.map(([t,rx,ry,dx=0,dy=0])=>{
        const c=at(lower,upper,t);return [c[2],rx,ry,c[1]-lower[1]+dy,c[0]-lower[0]+dx];
      });
      loft(lower[0],lower[1],rings,m,{sides:12,uv:uv?(z,s,c)=>uv((z-lower[2])/rise,s,c):undefined,
        surface:(p,z)=>{const ring=rings.find(r=>r[0]===z);p[0]+=ring[4]}});
    }
    function ball(p,r,m,sides=12){
      const shape=[-.96,-.78,-.37,.1,.56,.84,.98].map(s=>[p[2]+s*r[2],Math.sqrt(1-s*s)*r[0],Math.sqrt(1-s*s)*r[1]]);
      loft(p[0],p[1],shape,m,{sides});
    }
    function hose(points,r,m){
      for(let i=1;i<points.length;i++)tube(points[i-1],points[i],r,r,m,6);
    }
    return {triangles,flat,box,loft,tube,ball,hose,garment};
  }

  function carbine(m,c,angle=0,blast=false){
    const cs=Math.cos(angle),sn=Math.sin(angle);
    const p=(x,y,z)=>[c[0]+cs*x+sn*y,c[1]+cs*y-sn*x,c[2]+z];
    const block=(x,y,z,w,d,h,col)=>{
      const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,e])=>p(x+a*w/2,y+b*d/2,z+e*h/2));
      for(const f of [[0,3,2,1],[4,5,6,7],[3,7,6,2],[1,5,4,0],[1,2,6,5],[0,4,7,3]])m.flat(f.map(i=>pts[i]),col);
    };
    block(0,-.135,-.015,.087,.19,.085,rubber(0x243139));
    block(0,.016,0,.102,.225,.092,dark);
    block(0,.025,.054,.076,.12,.023,steel);
    m.tube(p(0,.086,.001),p(0,.37,.001),.043,.026,metal(0x657b82),10);
    for(const y of [.13,.18,.23,.28])m.tube(p(0,y,0),p(0,y+.018,0),.043,.043,black,10);
    m.tube(p(0,.34,0),p(0,.39,0),.037,.04,dark,10);
    m.tube(p(0,.3901,0),p(0,.392,0),.018,.018,blue,8);
    for(const s of [-1,1])block(s*.052,.03,-.004,.006,.114,.014,blue);
    block(0,-.015,-.078,.05,.067,.09,black);
    if(blast){m.tube(p(0,.40,0),p(0,.54,0),.058,.004,glow(0xb1ffff),7);m.tube(p(0,.41,0),p(.018,.48,.065),.032,.002,blue,6)}
  }

  const allyData={
    kajo:{face:209,shirtX:209,shirt:0x292727,skin:0xd2a07b,hair:0xb48a51,legs:0x48453e},
    saro:{face:211,shirtX:200,shirt:0x91918b,skin:0xd29b7b,hair:0x755238,legs:0x313635}
  };
  function allyHead(m,id,base){
    const a=allyData[id], skin=mat(a.skin,'skin','face'),hair=mat(a.hair,'hair','face');
    const profile=[[0,.041,.044],[.019,.065,.067],[.055,.09,.085],[.105,.103,.088],[.158,.111,.091],
      [.196,.115,.097],[.235,.118,.101],[.271,.105,.092],[.3,.077,.074],[.321,.027,.036]];
    m.loft(0,0,profile.map(([z,w,d])=>[base+z,w,d,z<.11?.012:0]),(z,c)=>z>base+.208||(c<-.22&&z>base+.099)?hair:skin,{
      sides:28,
      surface:(p,z,s,c)=>{if(c>0)p[1]+=.038*Math.exp(-Math.pow(s/.19,2)-Math.pow((z-base-.102)/.038,2))},
      uv:(z,s,c)=>{
        const front=Math.min(1,Math.max(0,(c+.08)*3.5)),height=z-base;
        if(front<.3&&height>.119)return [a.face+32*s,18+(height*245+c*21)%18,.93];
        return [a.face+s*45,107-height/.321*107,front];
      }
    });
    const hairPlain=mat(a.hair,'hair');
    for(const side of [-1,1]){
      m.ball([side*.103,-.004,base+.134],[.019,.023,.039],mat(a.skin,'skin'),9);
      m.ball([side*.117,-.001,base+.137],[.006,.011,.021],mat(0xad795e,'skin'),8);
    }
    // A layered fringe and curls wrap around the sides and back of the painted face.
    for(let i=0;i<35;i++){
      const angle=i*2.39996,s=Math.sin(angle),c=Math.cos(angle),noise=Math.sin(i*17.3);
      if(c>.22)continue;
      const z=base+.182+.036*(i%3)+noise*.009,rad=(i%3===2?.87:.99);
      const centre=[s*.103*rad,c*.093*rad,z],tip=add(centre,[s*.014,c*.012,-.034+noise*.008]);
      m.tube(centre,tip,.016,.001,hairPlain,5);
    }
  }

  function human(id,phase,armed,firing){
    const m=mesh(),friend=!!allyData[id],a=allyData[id],clothBody=friend?mat(a.shirt,'cloth','shirt'):cloth(0x394a54);
    const clothLeg=friend?cloth(a.legs):cloth(0x364550),pocket=friend?cloth(a.legs+0x050504):cloth(0x48555a);
    const glove=friend?mat(a.skin,'skin'):rubber(0x303a3c),step=phase<0?0:Math.sin(phase*TAU),idle=phase<0;
    const rise=idle?0:Math.abs(step)*.015,torso=rise;
    const boot=friend?rubber(0x413f38):black;
    for(const side of [-1,1]){
      const stride=step*side,ank=[side*(friend?.147:.162),.02+side*.057+stride*.116,.13+Math.max(0,stride)*.046];
      const knee=[side*.136,.066+side*.023-stride*.038,.48+rise*.6],hip=[side*.101,-.008,.91+torso];
      const jeans=friend?mat(a.legs,'cloth','pants'):clothLeg;
      const mapLeg=(y0,y1)=>(t,s,c)=>[(id==='saro'?199:203)+side*42+s*26,radial(y0,y1,t),.72+.15*c];
      m.garment(ank,knee,[[0,.089,.088],[.09,.09,.09],[.14,.073,.068,0,.008],[.21,.084,.08,0,-.005],[.42,.074,.079],[.7,.077,.083],[.93,.087,.091],[1,.086,.082]],
        jeans,friend?mapLeg(580,451):null);
      m.garment(knee,hip,[[0,.087,.084],[.08,.096,.096,0,.006],[.18,.087,.088],[.40,.109,.110],[.70,.115,.12],[1,.119,.125]],jeans,friend?mapLeg(451,307):null);
      m.loft(ank[0],ank[1],[[ank[2]-.12,.088,.14,.04],[ank[2]-.095,.089,.152,.05],[ank[2]-.056,.084,.142,.048],[ank[2]+.023,.072,.09]],boot);
      m.loft(ank[0],ank[1],[[ank[2]-.124,.09,.142,.04],[ank[2]-.109,.09,.148,.046]],friend?rubber(0xb1a796):rubber(0x212a2d));
      for(let j=0;j<4;j++)m.tube([ank[0]-.048,ank[1]+.098-j*.01,ank[2]-.05+j*.011],[ank[0]+.049,ank[1]+.092-j*.01,ank[2]-.048+j*.011],.005,.005,friend?cloth(0xaca896):rubber(0x687477),5);
      m.box([side*.193,.035,.717+torso],[.052,.14,.151],pocket);m.box([side*.197,.039,.777+torso],[.057,.15,.026],pocket);
      if(id==='kajo'){m.box([side*.152,.103,.676+torso],[.098,.031,.132],pocket);m.box([side*.152,.120,.73+torso],[.102,.014,.027],cloth(0x524c40));}
      if(friend)m.tube([side*.217,-.006,.697+torso],[side*.218,-.007,.774+torso],.003,.003,cloth(0x736e60),5);
      if(!friend){m.ball(add(knee,[0,.064,.006]),[.084,.055,.099],dark);m.box(add(knee,[0,.108,.009]),[.092,.017,.051],steel)}
    }
    const shirtProfile=[[.856,.187,.121],[.893,.205,.126],[.969,.2,.128],[1.111,.199,.133],[1.27,.237,.148],[1.366,.236,.132],[1.402,.164,.105],[1.436,.086,.074]].map(([z,w,d])=>[z+torso,w,d]);
    m.loft(0,0,shirtProfile,clothBody,friend?{sides:18,uv:(z,s,c)=>[a.shirtX+s*(c<0?53:73),150+(1.397+torso-z)*262,c<0?.52:.93]}:{sides:14});
    m.loft(0,.002,[[.866+torso,.20,.128],[.896+torso,.20,.13]],friend?cloth(0x4d4640):black);
    if(friend){
      m.box([-.015,.131,.88+torso],[.057,.012,.037],metal(0x998977));
      m.tube([0,0,1.379+torso],[0,.007,1.503+torso],.068,.064,mat(a.skin,'skin'));
      m.loft(0,0,[[1.4+torso,.095,.084],[1.423+torso,.082,.073]],cloth(a.shirt-0x060606));
      // The belt radio and its copper antenna remain on Karo's hip after the hand-off.
      if(id==='kajo'){m.box([.14,.125,.835+torso],[.078,.049,.121],black);m.box([.14,.153,.866+torso],[.05,.005,.024],metal(0x87958a));m.tube([.17,.128,.891+torso],[.176,.127,1.005+torso],.005,.003,steel)}
      allyHead(m,id,1.488+torso);
    }else{
      m.loft(0,0,[[1.09+torso,.178,.147],[1.17+torso,.23,.165],[1.312+torso,.231,.173],[1.38+torso,.194,.148],[1.416+torso,.124,.116]],metal(0x536773),{sides:10});
      for(let i=0;i<3;i++)m.box([0,.154-i*.004,1.233-i*.059+torso],[.30-i*.025,.038,.041],metal(i%2?0x51616a:0x62747a));
      for(let i=-1;i<=1;i++){m.box([i*.105,.125,.961+torso],[.081,.056,.112],pocket);m.box([i*.105,.158,1.003+torso],[.085,.017,.024],black)}
      m.box([0,-.136,1.198+torso],[.286,.11,.289],rubber(0x34434a));
      for(const s of [-1,1]){m.tube([s*.115,-.177,1.10+torso],[s*.115,-.177,1.328+torso],.039,.039,steel);m.hose([[s*.10,-.17,1.31+torso],[s*.16,-.14,1.395+torso],[s*.09,.05,1.411+torso]],.015,black)}
      m.tube([0,0,1.384+torso],[0,0,1.481+torso],.092,.079,black);
      m.loft(0,-.01,[[1.448,.077,.079],[1.49,.104,.098],[1.61,.119,.106],[1.69,.123,.105],[1.74,.105,.099],[1.772,.069,.067],[1.78,.043,.047]].map(([z,w,d])=>[z+torso,w,d]),metal(0x667780));
      m.loft(0,.036,[[1.444,.048,.067,.024],[1.48,.081,.086,.018],[1.54,.10,.094,.002],[1.62,.112,.086],[1.688,.113,.079],[1.715,.089,.067]].map(([z,w,d,cy])=>[z+torso,w,d,cy]),pale,{sides:16});
      for(const s of [-1,1]){
        m.ball([s*.066,.103,1.62+torso],[.048,.025,.032],black);
        m.ball([s*.067,.123,1.622+torso],[.031,.010,.018],blue);
        m.tube([s*.085,.039,1.493+torso],[s*.115,.081,1.467+torso],.041,.040,dark);
      }
      m.tube([0,.099,1.508+torso],[0,.165,1.473+torso],.050,.040,dark);
      m.tube([0,.161,1.476+torso],[0,.172,1.469+torso],.039,.039,black);
      for(let i=0;i<3;i++)m.box([0,.169+i*.003,1.486-i*.012+torso],[.047,.007,.004],steel);
      m.box([-.15,.143,1.306+torso],[.043,.016,.014],blue);
    }
    const carrying=armed||!friend,kick=firing?.043:0,gunYaw=firing?-.13:-.88;
    const weapon=[.075,.237-kick,1.187+torso+kick*.2];
    for(const side of [-1,1]){
      const shoulder=[side*.214,0,1.33+torso],elbow=carrying?[side*.269,.087-kick*.3,1.075+torso]:
        [side*(side<0?.331:.278),side<0?.032:-.026,1.104+torso];
      const wrist=carrying?(side===1?[.098,.165-kick,1.163+torso]:[firing?.035:-.072,(firing?.382:.331)-kick,1.149+torso]):
        (side<0?[side*.39,.13,1.172+torso]:[side*.212,.047,.974+torso]);
      const sleeveUV=(t,s,c)=>[a.shirtX+s*41,154+t*115+(c+1)*8,.67];
      if(friend){
        m.garment(elbow,shoulder,[[0,.073,.08],[.08,.079,.08],[.19,.067,.068],[.47,.079,.083],[.78,.093,.091],[1,.089,.091]],clothBody,sleeveUV);
        if(Math.abs(wrist[2]-elbow[2])>.055){
          const ends=wrist[2]<elbow[2]?[wrist,elbow]:[elbow,wrist];
          m.garment(...ends,[[0,.061,.061],[.09,.069,.067],[.18,.062,.06],[.37,.074,.073],[.48,.068,.071],[.73,.077,.079],[1,.074,.074]],clothBody,sleeveUV);
        }else m.tube(elbow,wrist,.079,.053,clothBody);
      }else{m.tube(shoulder,elbow,.096,.079,clothBody);m.tube(elbow,wrist,.081,.054,clothBody)}
      m.ball(shoulder,[.093,.091,.09],friend?cloth(a.shirt):dark);
      m.ball(elbow,[.075,.075,.072],friend?cloth(a.shirt):clothLeg,9);
      if(!friend){m.tube(at(shoulder,elbow,.1),at(shoulder,elbow,.42),.11,.098,dark,10,true);m.tube(at(elbow,wrist,.2),at(elbow,wrist,.73),.083,.067,steel,10,true)}
      else m.tube(at(elbow,wrist,.83),wrist,.060,.052,cloth(a.shirt-0x070707),10);
      m.ball(wrist,[.052,.051,.063],glove,10);
      if(!carrying){
        for(let finger=0;finger<4;finger++){
          const spread=(finger-1.5)*.014,knuckle=add(wrist,[side*.012,spread,-.025]),
                tip=add(knuckle,side<0?[-.052-Math.sin(finger)*.008,.027+spread,-.02]:[side*.014,.013,-.053]);
          m.tube(knuckle,tip,.010,.006,glove,7);
        }
        m.tube(add(wrist,[0,.036,-.012]),add(wrist,[side*.024,.062,.008]),.016,.010,glove,7);
      }
    }
    if(carrying)carbine(m,weapon,gunYaw,firing);
    return m.triangles;
  }

  // Riveted yard exosuit with suspended engine, exposed pistons and weighted stomp boots.
  function giant(phase,stomp){
    const m=mesh(),step=phase<0?0:Math.sin(phase*TAU),lift=stomp*.20,body=stomp*.045;
    const armor=metal(0x53646a),plate=metal(0x82908c),orange=metal(0xc17c40),coal=rubber(0x303c40);
    for(const s of [-1,1]){
      const up=s===1?lift:0,ank=[s*.177,.032+step*s*.07,.125+up],knee=[s*.163,.04+up*.55,.45+up*.7],hip=[s*.144,-.026,.78+body];
      m.loft(ank[0],ank[1],[[ank[2]-.122,.148,.196,.04],[ank[2]-.086,.153,.209,.059],[ank[2]+.026,.132,.18,.045],[ank[2]+.082,.093,.113]],armor,{sides:8});
      for(let j=0;j<5;j++)m.box([ank[0],ank[1]+.205-j*.061,ank[2]-.090],[.278,.034,.055],black);
      m.box([ank[0],ank[1]+.211,ank[2]-.007],[.191,.031,.028],orange);
      m.tube(ank,knee,.078,.092,coal);m.tube(knee,hip,.102,.121,armor,10,true);
      for(const side of [-1,1]){
        m.tube(add(ank,[side*.081,-.035,.022]),add(knee,[side*.075,-.055,-.011]),.025,.024,steel,9);
        m.tube(add(ank,[side*.084,.025,.015]),add(at(ank,knee,.62),[side*.084,.025,0]),.034,.033,plate,9);
      }
      m.ball(knee,[.127,.105,.103],coal);
      m.loft(knee[0],knee[1]+.073,[[knee[2]-.099,.065,.034],[knee[2]-.04,.105,.062],[knee[2]+.069,.114,.057],[knee[2]+.10,.066,.035]],plate,{sides:8});
      const upper=at(knee,hip,.64);m.tube(at(knee,hip,.38),at(knee,hip,.87),.12,.134,dark,8,true);
      m.box([upper[0],upper[1]+.128,upper[2]],[.115,.018,.035],orange);
    }
    m.loft(0,0,[[.702,.177,.135],[.772,.231,.161],[.866,.218,.164],[.91,.164,.146]].map(([z,w,d])=>[z+body,w,d]),armor,{sides:10});
    m.tube([0,-.01,.855+body],[0,-.01,1.034+body],.142,.172,coal,10);
    for(let i=0;i<3;i++)m.loft(0,0,[[.867+i*.041+body,.153,.135],[.885+i*.041+body,.165,.144]],dark,{sides:10});
    m.loft(0,-.022,[[.966,.19,.139],[1.037,.243,.175],[1.177,.312,.20],[1.32,.316,.201],[1.436,.263,.178],[1.48,.180,.127]].map(([z,w,d])=>[z+body,w,d]),armor,{sides:12});
    for(const s of [-1,1]){
      m.box([s*.178,.139,1.284+body],[.181,.116,.176],metal(s>0?0x788583:0x687777));
      for(const x of [-.059,.059])m.tube([s*.178+x,.196,1.342+body],[s*.178+x,.205,1.342+body],.010,.010,black,6);
      m.tube([s*.177,-.208,.991+body],[s*.177,-.208,1.487+body],.09,.09,coal,12);
      for(const z of [1.033,1.225,1.431])m.tube([s*.177,-.208,z+body],[s*.177,-.208,z+.025+body],.093,.093,plate,12);
      m.hose([[s*.178,-.211,1.466+body],[s*.205,-.153,1.533+body],[s*.147,-.024,1.545+body],[s*.104,.058,1.460+body]],.032,coal);
    }
    m.box([0,-.23,1.303+body],[.175,.112,.246],dark);
    for(let i=0;i<5;i++)m.box([0,-.288,1.225+i*.036+body],[.135,.009,.012],plate);
    m.box([0,.168,1.131+body],[.196,.055,.143],coal);
    m.box([0,.199,1.135+body],[.124,.012,.092],glow(0xee8850));
    for(let i=-2;i<=2;i++)m.box([i*.032,.212,1.132+body],[.012,.013,.109],dark);
    const hz=body+stomp*.019;
    m.tube([0,-.007,1.421+hz],[0,.011,1.501+hz],.090,.084,coal);
    m.loft(0,.015,[[1.446,.079,.085],[1.50,.112,.106],[1.608,.129,.119],[1.689,.135,.12],[1.742,.103,.091],[1.768,.055,.056]].map(([z,w,d])=>[z+hz,w,d]),pale,{sides:12});
    m.box([0,.122,1.629+hz],[.193,.031,.063],black);
    m.box([0,.142,1.635+hz],[.160,.009,.018],amber);
    m.box([0,.150,1.637+hz],[.028,.01,.023],glow(0xffe6a4));
    m.box([0,.128,1.543+hz],[.089,.049,.067],dark);
    for(const s of [-1,1])m.tube([s*.087,.069,1.551+hz],[s*.109,.087,1.494+hz],.039,.032,coal,9);
    for(const s of [-1,1]){
      const shoulder=[s*.296,-.01,1.363+body],elbow=[s*.399,.032+stomp*.13,1.085+body+stomp*.21],hand=[s*.426,.135+stomp*.21,.765+body+stomp*.42];
      m.ball(shoulder,[.133,.126,.123],coal);
      m.loft(shoulder[0]+s*.024,shoulder[1],[[shoulder[2]-.049,.132,.148],[shoulder[2]+.018,.153,.16],[shoulder[2]+.101,.122,.137],[shoulder[2]+.129,.064,.092]],plate,{sides:10});
      m.box([shoulder[0]+s*.033,.140,shoulder[2]+.012],[.149,.024,.037],orange);
      for(let j=-1;j<=1;j++)m.box([shoulder[0]+s*.033+j*.052,.154,shoulder[2]+.012],[.015,.006,.039],dark);
      m.tube(shoulder,elbow,.095,.091,armor,8,true);m.ball(elbow,[.10,.102,.099],coal);
      m.tube(at(elbow,hand,.13),at(elbow,hand,.76),.121,.14,metal(0x65767a),8,true);
      for(const u of [-1,1])m.tube(add(elbow,[s*.08,u*.046,0]),add(hand,[s*.089,u*.05,.01]),.019,.017,steel);
      m.tube(at(elbow,hand,.69),at(elbow,hand,.79),.145,.145,orange,8,true);
      m.tube(at(elbow,hand,.81),hand,.136,.124,coal,8,true);
      for(let j=0;j<3;j++)m.box([hand[0]+(j-1)*.065,hand[1]+.037,hand[2]-.035],[.057,.148,.098],armor);
    }
    return m.triangles;
  }

  function skinFor(game,id){
    if(!allyData[id])return null;
    const image=game.sprites[id];
    if(!image||!image.width||!image.height)return null;
    const ready=skins.get(id);if(ready?.image===image)return ready.pixels;
    let pixels=null;
    try{const canvas=game.makeCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);pixels=ctx.getImageData(0,0,canvas.width,canvas.height)}catch(error){if(error.name!=='SecurityError')throw error}
    skins.set(id,{image,pixels});return pixels;
  }

  function render(game,triangles,azimuth,config,skin,hit){
    const {w,h,span}=config,scale=(h-5)/span,canvas=game.makeCanvas(w,h),ctx=canvas.getContext('2d');
    const surface=ctx.createImageData(w,h),rgba=surface.data,depth=new Float32Array(w*h);depth.fill(-1e6);
    const ca=Math.cos(azimuth),sa=Math.sin(azimuth),cz=.997,sz=.076;
    const verts=new Map();
    function project(v){
      if(verts.has(v))return verts.get(v);
      const toward=v[1]*ca-v[0]*sa,side=v[0]*ca+v[1]*sa;
      const nx=v[3]*ca+v[4]*sa,ny=v[4]*ca-v[3]*sa,nz=v[5];
      // A warm high key and cold fill reveal rounded forms and worn metal edges.
      const key=Math.max(0,-.56*nx+.51*ny+.65*nz),rim=Math.max(0,.77*nx-.42*ny+.47*nz);
      const coeff=.53+.60*key+.20*rim,spec=Math.pow(Math.max(0,-.31*nx+.82*ny+.48*nz),15);
      const out=[w*.5+side*scale,h-3-(v[2]*cz-toward*sz)*scale,toward*cz+v[2]*sz,coeff,spec,v[6],v[7],v[8],ny];
      verts.set(v,out);return out;
    }
    for(const [va,vb,vc,m] of triangles){
      const a=project(va),b=project(vb),c=project(vc);
      const bx=b[0]-a[0],by=b[1]-a[1],cx=c[0]-a[0],cy=c[1]-a[1];
      const area=bx*cy-by*cx;if(Math.abs(area)<.045)continue;
      const inv=1/area,l=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),r=Math.min(w-1,Math.ceil(Math.max(a[0],b[0],c[0]))),
            t=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),d=Math.min(h-1,Math.ceil(Math.max(a[1],b[1],c[1])));
      const metal=m.finish==='metal',emissive=m.finish==='light',hair=m.finish==='hair',textured=skin&&m.texture&&Math.max(a[7],b[7],c[7])>.01;
      for(let y=t;y<=d;y++){
        const py=y+.5-a[1],px=l+.5-a[0];
        let u=(px*cy-py*cx)*inv,v=(bx*py-by*px)*inv;
        for(let x=l,idx=y*w+l;x<=r;x++,idx++,u+=cy*inv,v-=by*inv){
          if(u<-.0001||v<-.0001||u+v>1.0001)continue;const q=1-u-v,z=q*a[2]+u*b[2]+v*c[2];
          if(z<depth[idx])continue;depth[idx]=z;
          let red=m.rgb[0],green=m.rgb[1],blue=m.rgb[2];
          if(textured){
            const tx=Math.max(0,Math.min(skin.width-1,Math.round(q*a[5]+u*b[5]+v*c[5]))),ty=Math.max(0,Math.min(skin.height-1,Math.round(q*a[6]+u*b[6]+v*c[6])));
            const k=(ty*skin.width+tx)*4,mix=(q*a[7]+u*b[7]+v*c[7])*skin.data[k+3]/255;
            red=radial(red,skin.data[k],mix);green=radial(green,skin.data[k+1],mix);blue=radial(blue,skin.data[k+2],mix);
          }
          const noise=((x*17+y*23+(x*y)%13)%11)-5;
          const light=emissive?1.01:q*a[3]+u*b[3]+v*c[3],shine=metal?(q*a[4]+u*b[4]+v*c[4])*52:0;
          const grain=emissive?0:noise*(hair?1.05:metal?.58:.7),n=idx*4;
          rgba[n]=red*light+shine+grain+(hit?36:0);rgba[n+1]=green*light+shine+grain+(hit?58:0);rgba[n+2]=blue*light+shine*1.12+grain+(hit?67:1);rgba[n+3]=255;
        }
      }
    }
    ctx.putImageData(surface,0,0);
    ctx.globalCompositeOperation='destination-over';
    ctx.save();ctx.translate(w*.5,h-4);ctx.scale(scale*.39,scale*.055);
    const shadow=ctx.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'rgba(5,15,18,.58)');shadow.addColorStop(.55,'rgba(7,16,20,.25)');shadow.addColorStop(1,'rgba(10,18,23,0)');
    ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
    return {image:canvas,aspect:w/h};
  }

  return function actorFrame(game,o){
    const type=o.type;
    if(type!=='guard'&&type!=='giant'&&!allyData[type])return null;
    const toPlayer=Math.atan2(game.y-o.y,game.x-o.x);
    const angle=toPlayer-(Number.isFinite(o.facing)?o.facing:toPlayer);
    const view=((Math.round(angle*views/TAU)%views)+views)%views;
    const friend=!!allyData[type],firing=!!o.firing&&type!=='giant',armed=!!o.armed,hit=o.flash>0;
    // Four keyed walk poses and three wind-up poses avoid unbounded texture churn.
    const step=Number.isFinite(o.pose)?((Math.floor(o.pose*4)%4)+4)%4:-1;
    const stomp=type==='giant'?Math.min(3,Math.max(0,Math.round((o.stomp||0)*3))):0;
    const sheet=campaignSheet('actor-'+type);
    if(sheet){
      const col=(Math.round(angle*8/TAU)%8+8)%8;
      let row=Math.max(0,step),rows=6;
      if(friend){
        rows=7;
        row=!armed?0:firing?6:step<0?1:2+step;
      }else if(type==='giant'){
        rows=8;
        if(stomp)row=3+stomp;else if(hit)row=7;
      }else if(firing||hit)row=hit?5:4;
      return sheetFrame(sheet,8,rows,col,row);
    }
    const modelKey=[type,step,stomp,Number(firing),Number(friend&&armed)].join('/');
    const skin=skinFor(game,type),frameKey=modelKey+'/'+view+'/'+Number(hit)+'/'+Number(!!skin);
    if(cache.has(frameKey)){
      const frame=cache.get(frameKey);cache.delete(frameKey);cache.set(frameKey,frame);return frame;
    }
    let triangles=models.get(modelKey);
    if(!triangles){
      triangles=type==='giant'?giant(step<0?-1:step/4,stomp/3):human(type,step<0?-1:step/4,armed,firing);
      models.set(modelKey,triangles);
      if(models.size>22)models.delete(models.keys().next().value);
    }
    const config=friend?{w:178,h:278,span:1.855}:type==='giant'?{w:169,h:223,span:1.86}:{w:137,h:203,span:1.825};
    const frame=render(game,triangles,view*TAU/views,config,skin,hit);
    cache.set(frameKey,frame);
    if(cache.size>176)cache.delete(cache.keys().next().value);
    return frame;
  };
})();
