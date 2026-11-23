'use strict';

function railArt(game) {
  const assets=game.sprites;
  for(const name of ['kajo','saro','soul']){
    const img=new Image();img.onload=()=>assets[name]=img;img.src='assets/'+name+'.webp';
  }
  const make=(w,h,paint)=>{
    const c=game.makeCanvas(w,h),g=c.getContext('2d');
    const path=(d,fill,stroke,width=1.5)=>{
      const p=new Path2D(d);if(fill){g.fillStyle=fill;g.fill(p)}
      if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.lineJoin='round';g.stroke(p)}
    };
    paint(g,path);return c;
  };
  const paintGuard=(g,p)=>{
    const steel=g.createLinearGradient(27,0,75,0);
    steel.addColorStop(0,'#344b56');steel.addColorStop(.45,'#7a8e92');steel.addColorStop(1,'#283945');
    const mask=g.createLinearGradient(30,0,66,0);
    mask.addColorStop(0,'#778d91');mask.addColorStop(.38,'#d3d6c7');mask.addColorStop(1,'#899797');
    p('M32 91 49 91 48 119 40 153 22 151 25 132Z','#26343c','#18242c',3);
    p('M49 92 66 89 71 119 71 145 55 148 50 120Z','#3d4d57','#16232d',3);
    p('M25 134 42 137 38 152 40 157 19 158 17 153Z','#19252b','#708082');
    p('M55 134 71 131 72 143 81 149 80 153 56 154Z','#16232c','#64777c');
    p('M27 110 45 112 42 126 26 123Z M54 105 69 104 72 117 58 121Z',steel,'#202e36');
    p('M28 43 42 36 58 36 69 43 73 69 65 99 33 102 24 75Z','#3b535e','#14222c',3);
    p('M31 45 43 40 48 48 58 40 68 45 64 67 48 74 30 64Z',steel,'#182c36',2);
    p('M32 67 48 74 64 68 61 79 48 84 34 77Z','#526974','#243942');
    for(let i=0;i<3;i++){g.fillStyle='#1f2b32';g.fillRect(31+i*12,82,10,12);g.fillStyle='#82908b';g.fillRect(31+i*12,83,9,2)}
    p('M28 44 19 45 13 61 14 85 23 95 34 85 30 73 26 75 30 61Z',steel,'#1e303a',3);
    p('M67 44 76 47 82 63 83 79 67 87 52 73 57 64 68 67Z',steel,'#1b2930',3);
    p('M18 50 27 47 28 53 16 58Z','#c09058');p('M17 61 27 57 M18 66 27 63',null,'#9aa9a6',2);
    p('M34 37 32 17 37 7 46 3 59 5 66 15 65 32 56 43 43 45Z',steel,'#1a2830',2);
    p('M34 21 39 14 58 14 64 19 62 33 55 38 48 43 38 36Z',mask,'#33464e',1.8);
    p('M34 19 46 21 45 28 37 29 33 25Z M51 21 62 18 63 25 57 29 52 27Z','#122c38','#afc5c2');
    g.shadowColor='#70f4ff';g.shadowBlur=5;
    p('M36 22 43 23 42 25 37 25Z M54 23 61 21 60 24 55 25Z','#91f8ff');g.shadowBlur=0;
    p('M43 31 48 27 55 31 54 39 47 42 42 38Z','#354852','#798d96');
    p('M44 33 53 32 M44 36 53 35 M45 39 51 38',null,'#111e28',1.7);
    p('M30 21 33 19 35 31 31 32Z M63 27 67 25 67 35 62 36Z','#2c3e49');
    p('M21 81 30 74 45 75 63 60 71 60 74 67 58 80 46 83 42 90 35 89 37 82 27 88Z','#192b37','#778b92',2);
    p('M54 71 66 62 71 63 60 73Z','#5e9eac');p('M26 78 34 76 39 82 35 87 27 87Z M57 72 64 68 69 73 65 79 59 78Z','#283239','#788a88');
  };
  assets.guard=make(96,164,paintGuard);
  assets.manhack=make(156,90,(g,p)=>{
    p('M64 38 43 17 12 13 36 21 0 31 47 29 67 43Z M91 38 111 16 146 8 123 20 155 24 112 30 90 44Z','#72878c','#192d37',2);
    p('M66 48 42 63 16 66 43 69 29 80 55 69 73 52Z M87 48 106 62 139 62 116 69 132 76 103 72 84 54Z','#9b9e92','#273d42',2);
    p('M46 35 63 24 89 22 110 36 103 55 84 64 58 57Z','#293b44','#93a5a4',3);
    p('M56 36 67 28 85 26 99 36 90 45 68 46Z','#627987','#2d424c');
    p('M57 43 67 34 84 32 93 41 83 54 66 53Z','#1b2832','#c39065',2.5);
    g.shadowColor='#ff6538';g.shadowBlur=9;p('M64 44 71 38 82 36 87 40 80 48 69 50Z','#ff9e53');g.shadowBlur=0;
    p('M73 42 80 39 82 41 77 45 72 46Z','#fff0bf');
  });
  for(const name of ['guard','manhack']){
    const sprite=assets[name],bright=game.makeCanvas(sprite.width,sprite.height),g=bright.getContext('2d');
    g.drawImage(sprite,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='#e0fcf9a0';g.fillRect(0,0,sprite.width,sprite.height);
    assets[name+'Hit']=bright;
  }
  assets.yardSign=make(128,152,(g,p)=>{
    p('M21 56H26V152H21Z M99 56H104V152H99Z','#47575b');
    p('M4 9H123V82H4Z','#202d31','#acaa96',3);
    g.fillStyle='#ecdcad';g.font='bold 39px sans-serif';g.fillText('09',36,49);
    g.textAlign='center';g.font='bold 11px monospace';g.fillText('VAIHDE  /  YARD',64,67);
  });
  for(const [name,color] of [['signalRed','#ff9a64'],['signalGreen','#aaffc6']]){
    assets[name]=make(58,110,(g,p)=>{
      p('M23 34H30V101H39V106H14V101H23Z','#34454c','#879290');
      p('M11 8 20 3H37L46 10V49L39 54H19L11 46Z','#293940','#a5afa8',2);
      g.fillStyle=color;g.shadowBlur=8;g.shadowColor=color;g.beginPath();g.arc(28,21,8,0,7);g.fill();g.shadowBlur=0;
      p('M24 36H32L32 43H24Z','#92a4a2');p('M22 74 13 66 9 45 13 43 19 61 27 65Z','#b0794c','#3b403c');
    });
  }
  assets.riflePickup=make(160,58,(g,p)=>{
    p('M4 22 64 17 80 8 105 8 113 13 148 9 156 17 150 33 122 36 116 49 102 50 102 36 83 34 77 46 67 45 70 32 5 30Z','#283a46','#9aadae',2);
    p('M8 26 64 22 62 27 10 28Z','#73838c');p('M15 21 63 19 62 23 16 25Z M83 15 103 15 108 21 78 21Z','#9cf3ff');
    p('M71 24 84 22 103 24 101 32 82 32 76 40 72 39 75 31Z','#516470','#263640');
    p('M119 17 145 14 150 17 146 26 126 31 115 28Z','#394956','#657477');p('M123 20 143 17 139 21 122 25Z','#20323b');
    for(let i=0;i<5;i++)p('M'+(24+i*6)+' 20l2 0 -1 8 -2 0Z','#63777d');
  });
}

// A separate first-person pulse rifle with a charge gauge, moving breech and muzzle flash.
function drawPulseRifle(game,W,H){
  const g=game.ctx,yard=game.yard,scale=Math.min(W*.47,H*.73)/280;
  const kick=yard.cooldown/.19,drop=yard.reloadTime>0?Math.sin(Math.PI*yard.reloadTime/1.35)*33:0;
  g.save();g.translate(W*.60+kick*3,H*.64+drop*scale+Math.sin(game.bob)*1.6+kick*7);g.scale(scale,scale);
  const p=(d,fill,stroke)=>{
    const shape=new Path2D(d);g.fillStyle=fill;g.fill(shape);if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke(shape)}
  };
  const body=g.createLinearGradient(85,8,165,126);body.addColorStop(0,'#7e9091');body.addColorStop(.24,'#556b74');body.addColorStop(.45,'#273c47');body.addColorStop(1,'#101d26');
  p('M5 6 18 0 69 14 124 40 115 61 45 34 2 18Z','#273843','#899b99');
  p('M8 10 47 17 97 37 95 42 44 28 8 17Z','#111f28');
  p('M16 11 46 16 84 31 72 30 19 16Z','#86d8e3');
  p('M46 14 62 9 113 18 129 36 165 42 207 75 282 103 307 204 224 222 140 166 91 91 54 60Z',body,'#152431');
  p('M64 17 77 12 95 15 103 27 92 32 72 27Z','#283842','#9eaba3');
  p('M72 19 79 16 91 18 95 23 90 24 77 22Z','#7ecee0');
  p('M56 38 85 43 127 57 153 79 144 97 115 94 74 66Z','#1c2d38','#627b80');
  for(let i=0;i<6;i++)p('M'+(68+i*8)+' '+(45+i*3)+'l5 1 10 15 -5 -2Z',i<Math.ceil(yard.ammo/2)?'#99edf0':'#465e69');
  p('M111 29 139 32 174 49 180 68 155 77 121 54Z',body,'#263846');
  p('M150 87 175 74 204 85 232 112 219 144 186 138Z','#344853','#65777c');
  p('M158 91 176 82 193 88 201 97 180 107Z','#142731','#66858a');
  p('M181 109 201 99 219 115 211 132 192 129Z','#1c313c');
  p('M128 103 151 101 168 121 185 141 174 160 154 149Z','#4f423b','#292c2b');
  if(kick>.66){g.shadowColor='#79ecff';g.shadowBlur=15;p('M7 14 -15 12 -6 4 -37 -15 -12 -9 -14 -23 3 1 13 -3Z','#b9fbff')}
  g.restore();
}
