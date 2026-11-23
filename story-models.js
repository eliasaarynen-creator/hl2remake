'use strict';

const campaignSheets=new Map();
function campaignSheet(file){
  let image=campaignSheets.get(file);
  if(!image){image=new Image();campaignSheets.set(file,image);image.src='assets/'+file+'.webp'}
  return image.complete&&image.naturalWidth?image:null;
}
function sheetFrame(sheet,cols,rows,col,row){
  const width=sheet.width/cols,height=sheet.height/rows;
  return {image:sheet,x:col*width,y:row*height,width,height,aspect:width/height};
}
let phantomSheet;
function storyActorFrame(game,o){
  if(!['soul','gman','ghost'].includes(o.type))return null;
  const soul=o.type==='soul';
  let sheet=campaignSheet(soul?'story-model-soul':'story-model-gman');
  if(!sheet)return null;
  if(o.type==='ghost'){
    if(!phantomSheet){
      phantomSheet=game.makeCanvas(sheet.width,sheet.height);
      const ink=phantomSheet.getContext('2d');ink.drawImage(sheet,0,0);
      ink.globalCompositeOperation='source-atop';ink.fillStyle='#5bc9d483';ink.fillRect(0,0,sheet.width,sheet.height);
      ink.fillStyle='#203d604d';for(let y=0;y<sheet.height;y+=6)ink.fillRect(0,y,sheet.width,1);
    }
    sheet=phantomSheet;
  }
  const yaw=Math.atan2(game.y-o.y,game.x-o.x)-Math.PI;
  const view=(Math.round(yaw*6/Math.PI)%12+12)%12;
  return sheetFrame(sheet,4,3,view%4,Math.floor(view/4));
}
