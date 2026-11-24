'use strict';

// Store model faces once. Project each visible plane independently so browsers
// do not have to depth-sort an entire preserve-3d city on every footstep.
class SurfaceBatch{
  constructor(model,layer){
    this.layer=layer;this.faces=[];
    const walk=(parent,base)=>{
      for(const node of parent.children){
        const local=new DOMMatrix(node.style.transform||undefined);
        const matrix=base.multiply(local);
        if(node.classList.contains('mesh')){walk(node,matrix);continue}
        const w=parseFloat(node.style.width),h=parseFloat(node.style.height);
        const ground=node.matches('.street-floor,.terminal-floor')?1000:node.matches('.track-bed')?1100:
          node.matches('.rail,.rail-amber')?1200:node.matches('.contact-shadow,.ground-fx')?1300:0;
        this.faces.push({node,w,h,ground,m:matrix.translate(-w/2,-h/2),out:null,uv:null});
      }
    };
    walk(model,new DOMMatrix());
  }
  dispose(){for(const face of this.faces)face.out?.remove()}
  hide(){for(const face of this.faces)if(face.out&&!face.out.hidden)face.out.hidden=true}
  draw(view,focal,cx,cy){
    const near=6,fx=cx/focal,fy=cy/focal;
    for(const face of this.faces){
      const {node,w,h}=face,m=view.multiply(face.m);
      const x=m.m41,y=m.m42,z=m.m43,ax=m.m11,ay=m.m12,az=m.m13,bx=m.m21,by=m.m22,bz=m.m23;
      const away=(ay*bz-az*by)*x+(az*bx-ax*bz)*y+(ax*by-ay*bx)*z;
      let visible=away<-.00001;
      let verts;
      if(visible){
        verts=[[0,0,x,y,z],[w,0,x+w*ax,y+w*ay,z+w*az],[w,h,x+w*ax+h*bx,y+w*ay+h*by,z+w*az+h*bz],[0,h,x+h*bx,y+h*by,z+h*bz]];
        visible=!verts.every(p=>p[4]>-near)&&!verts.every(p=>p[2]<fx*p[4])&&!verts.every(p=>p[2]>-fx*p[4])&&
          !verts.every(p=>p[3]<fy*p[4])&&!verts.every(p=>p[3]>-fy*p[4]);
      }
      if(!visible){if(face.out&&!face.out.hidden)face.out.hidden=true;continue}
      if(!face.out){
        face.out=node.cloneNode(true);
        Object.assign(face.out.style,{margin:'0',left:'0',top:'0',transformOrigin:'0 0',backfaceVisibility:'visible'});
        this.layer.append(face.out);
      }
      const out=face.out;out.hidden=false;
      const crossing=verts.some(p=>p[4]>-near);
      if(crossing){
        const clipped=[];
        for(let i=0;i<4;i++){
          const a=verts[i],b=verts[(i+1)%4],inside=a[4]<=-near;
          if(inside)clipped.push(a);
          if(inside!==(b[4]<=-near)){
            const t=(-near-a[4])/(b[4]-a[4]);
            clipped.push(a.map((v,j)=>v+(b[j]-v)*t));
          }
        }
        verts=clipped;
        out.style.clipPath='polygon('+verts.map(p=>p[0].toFixed(2)+'px '+p[1].toFixed(2)+'px').join(',')+')';
      }else if(face.crossing)out.style.clipPath=node.style.clipPath;
      face.crossing=crossing;
      if(face.uv!==node.style.backgroundPosition){face.uv=node.style.backgroundPosition;out.style.backgroundPosition=face.uv}
      // CSS applies this homography to the original texture, including its UVs.
      // All output lives on the screen plane. Ordering depends on camera depth.
      const u=-az/focal,v=-bz/focal,q=-z/focal;
      const projection=[ax+cx*u,ay+cy*u,0,u,bx+cx*v,by+cy*v,0,v,0,0,1,0,x+cx*q,y+cy*q,0,q];
      out.style.transform='matrix3d('+projection.map(n=>Number(n.toFixed(8))).join(',')+')';
      let depth=0;
      for(const p of verts)depth+=p[4];
      // Adjacent surface pieces use a common, deterministic depth order.
      out.style.zIndex=String(face.ground||200000+Math.round(depth/verts.length*8));
    }
  }
}
