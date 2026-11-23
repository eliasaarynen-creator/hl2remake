'use strict';

function drawHeldWeapon(game,W,H){
  const rifle=!!game.yard?.armed, key=rifle?'weapon-pulse':'weapon-gravity', sheet=campaignSheet(key);
  if(!sheet)return;
  const g=game.ctx,frameW=sheet.width/3;
  const kick=rifle?Math.min(1,game.yard.cooldown/.155):game.beam*.36;
  const delta=Number.isFinite(game.weaponHeading)?Math.atan2(Math.sin(game.angle-game.weaponHeading),Math.cos(game.angle-game.weaponHeading)):0;
  game.weaponHeading=game.angle;
  game.weaponSway=(game.weaponSway||0)*.78+Math.max(-1,Math.min(1,delta*9))*.22;
  const sway=game.weaponSway,view=sway<-.055?0:sway>.055?2:1;
  const h=Math.min(H*.43,W*.53),w=h*frameW/sheet.height;
  const x=W*.61-w*.12+sway*w*.07+Math.sin(game.bob*.5)*h*.009;
  const y=H-h+Math.abs(Math.sin(game.bob))*.015*h+h*.055*kick;
  g.save();g.translate(x,y);g.rotate(sway*.019-kick*.018);
  g.drawImage(sheet,view*frameW,0,frameW,sheet.height,0,0,w,h);
  if(rifle&&kick>.58){
    const mx=w*.043,my=h*.045,r=h*.14*kick;
    const flash=g.createRadialGradient(mx,my,.3,mx,my,r);
    flash.addColorStop(0,'#f5ffff');flash.addColorStop(.24,'#a7f7ffda');flash.addColorStop(.62,'#52cde76a');flash.addColorStop(1,'#4caaff00');
    g.fillStyle=flash;g.fillRect(mx-r,my-r,2*r,2*r);
    g.strokeStyle='#ddffff';g.lineWidth=Math.max(1,h*.009);g.beginPath();g.moveTo(mx,my);g.lineTo(mx-r*.36,my-r*.42);g.stroke();
  }else if(!rifle){
    const charged=game.encounter?.holding||game.held>=0,px=w*.19,py=h*.125,r=h*(charged?.185:.115);
    const glow=g.createRadialGradient(px,py,0,px,py,r);
    glow.addColorStop(0,game.encounter?.holding?'#b6ffffa9':charged?'#ffb251b0':'#faaa4e59');glow.addColorStop(1,'#ffb44200');
    g.globalCompositeOperation='screen';g.fillStyle=glow;g.fillRect(px-r,py-r,r*2,r*2);
  }
  g.restore();
}
