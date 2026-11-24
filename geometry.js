'use strict';

// One map tile is 96 CSS pixels. Geometry uses (right, height, forward) locally.
const UNIT=96;
const px=n=>(n*UNIT).toFixed(3)+'px';
const local3=(r,h,f)=>'translate3d('+px(r)+','+px(-h)+','+px(f)+')';
const place3=(x,y,z)=>local3(y,z,-x);
function group3(parent,cls=''){
  const el=document.createElement('div');el.className='mesh '+cls;parent.append(el);return el;
}
function face3(parent,r,h,f,w,size,rotation,material,shade=0,words=''){
  const el=document.createElement('div');
  el.className='face '+(material.startsWith('#')?'':material);
  if(material.startsWith('#'))el.style.backgroundColor=material;
  if(shade)el.style.setProperty('--shade',shade);
  el.style.width=px(w);el.style.height=px(size);
  el.style.marginLeft=px(-w/2);el.style.marginTop=px(-size/2);
  el.style.transformOrigin='center';el.style.transform=local3(r,h,f)+' '+rotation;
  if(words)el.textContent=words;
  parent.append(el);return el;
}
function box3(parent,r,h,f,w,height,depth,material){
  face3(parent,r,h,f+depth/2,w,height,'',material,.04);
  face3(parent,r,h,f-depth/2,w,height,'rotateY(180deg)',material,.25);
  face3(parent,r-w/2,h,f,depth,height,'rotateY(-90deg)',material,.29);
  face3(parent,r+w/2,h,f,depth,height,'rotateY(90deg)',material,.14);
  face3(parent,r,h+height/2,f,w,depth,'rotateX(90deg)',material);
  face3(parent,r,h-height/2,f,w,depth,'rotateX(-90deg)',material,.40);
}
function drum3(parent,r,h,f,rx,rz,height,material,n=8){
  for(let i=0;i<n;i++){
    const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
    const x1=rx*Math.sin(a),z1=rz*Math.cos(a),x2=rx*Math.sin(b),z2=rz*Math.cos(b);
    const yaw=Math.atan2(z1-z2,x2-x1),shade=.03+.28*(1-Math.cos(yaw-.65))/2;
    face3(parent,r+(x1+x2)/2,h,f+(z1+z2)/2,Math.hypot(x2-x1,z2-z1)+.002,height,'rotateY('+yaw+'rad)',material,shade);
  }
  for(const sign of [-1,1]){
    const cap=face3(parent,r,h+sign*height/2,f,rx*2,rz*2,'rotateX('+(90*sign)+'deg)',material,sign<0?.34:0);
    cap.style.clipPath='polygon('+Array.from({length:n},(_,i)=>(50+50*Math.sin(i*2*Math.PI/n))+'% '+(50+50*Math.cos(i*2*Math.PI/n))+'%').join(',')+')';
  }
}
function beam3(parent,a,b,width,depth,material){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);
  if(len<.001)return;
  const part=group3(parent);
  const twist=Math.hypot(dx,dz)<.0001?(dy<0?'rotateX(180deg)':''):'rotate3d('+(-dz)+',0,'+dx+','+Math.acos(Math.max(-1,Math.min(1,dy/len)))+'rad)';
  part.style.transform=local3(...a)+' '+twist;
  box3(part,0,len/2,0,width,len,depth,material);
}
function label3(parent,r,h,f,w,height,caption,material='enameled',rot=''){
  const el=face3(parent,r,h,f,w,height,rot,'sign3 '+material,0,caption);
  el.style.fontSize=px(Math.min(height*.61,w/(caption.length*.64||1)));
  return el;
}
function floorMark(parent,r,f,w,d,material,z=.012){
  return face3(parent,r,z,f,w,d,'rotateX(90deg)',material);
}
