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
