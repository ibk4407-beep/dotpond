import {koiPosition,koiWidth,pixelColor} from './model.mjs';

export function drawScene(ctx,w,h,t,state,level=0,image=null,thumbnail=false) {
  ctx.fillStyle='#111410';ctx.fillRect(0,0,w,h);
  const step=thumbnail?3:state.size;
  const rgb=state.color.slice(1).match(/../g).map(v=>parseInt(v,16));
  const brightness=state.brightness*(1+level*.6);
  if(state.scene==='image' && image){
    const scale=Math.min(w/image.width,h/image.height)*.88;
    const iw=image.width*scale,ih=image.height*scale,ox=(w-iw)/2,oy=(h-ih)/2;
    const sample=image.data,sw=image.width;
    for(let y=0;y<ih;y+=step) for(let x=0;x<iw;x+=step){
      const sx=Math.min(sw-1,Math.floor(x/scale)),sy=Math.min(image.height-1,Math.floor(y/scale));
      const index=(sy*sw+sx)*4,c=pixelColor(sample[index],sample[index+1],sample[index+2],sample[index+3],brightness);
      if(c){ctx.fillStyle=c;ctx.fillRect(ox+x+Math.sin(t*.7+y*.012)*level*10,oy+y,step-1,step-1);}
    }
    return;
  }
  if(state.scene==='waves' || state.scene==='nebula'){
    const gap=thumbnail?4:Math.max(6,step+2);
    for(let y=0;y<h;y+=gap) for(let x=0;x<w;x+=gap){
      const nx=(x/w-.44)*2,ny=(y/h-.5)*2;
      let value;
      if(state.scene==='waves'){
        const wave=Math.sin(nx*5+t*.5)*.2+Math.sin(nx*9-t*.3)*.06;
        const d=Math.abs(ny-wave);value=Math.max(0,1-d*2.2)*(.5+.5*Math.sin(d*55-t*2+nx*3));
      }else{
        const r=Math.hypot(nx*1.1,ny),a=Math.atan2(ny,nx);
        value=Math.max(0,1-r)*Math.pow(Math.max(0,Math.sin(a*3+r*13-t*.45)),3);
        value+=Math.pow(Math.max(0,Math.sin(x*37.7+y*42.3)),45)*.25*Math.max(0,1-r);
      }
      value*=brightness*(.75+level);
      if(value<.025)continue;
      ctx.fillStyle=`rgba(${rgb},${Math.min(.85,value)})`;ctx.fillRect(x,y,step-1,step-1);
    }
    return;
  }
  const area=thumbnail?w:w>800?w*.76:w;
  const scale=thumbnail?.23:Math.max(.65,Math.min(area/900,h/700))*1.25;
  const ripple=(cx,cy,r,alpha)=>{
    ctx.fillStyle=`rgba(${rgb},${alpha*brightness})`;
    const count=Math.max(30,Math.round(r*1.5));
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2;const x=Math.round((cx+Math.cos(a)*r)/step)*step,y=Math.round((cy+Math.sin(a)*r*.55)/step)*step;
      if(Math.sin(i*4.7)>.05)ctx.fillRect(x,y,Math.max(1,step-2),Math.max(1,step-2));
    }
  };
  for(let i=0;i<4;i++){
    const r=(t*9+i*65)%300*scale;
    ripple(area*.51,h*.51,r,.13*(1-r/(300*scale)));
  }
  if(!thumbnail){
    ctx.fillStyle='#88967709';
    for(let y=0;y<h;y+=step*3)for(let x=0;x<w;x+=step*3)if(Math.sin(x*12+y*7)>.6)ctx.fillRect(x,y,1,1);
  }
  for(let fish=0;fish<3;fish++){
    const p=koiPosition(t,fish),next=koiPosition(t+.1,fish);
    const angle=Math.atan2((next.y-p.y)*h,(next.x-p.x)*area)+Math.PI;
    ctx.save();ctx.translate(p.x*area,p.y*h);ctx.rotate(angle);ctx.scale(scale,scale);
    const grid=thumbnail?6:Math.max(3,step/scale);
    for(let x=-96;x<=136;x+=grid)for(let y=-37;y<=37;y+=grid){
      const u=(x+96)/192,sway=Math.sin(t*2.3-u*5+fish)*9*u*u;
      const v=y-sway,width=koiWidth(u);
      const body=u>0 && u<1 && Math.abs(v)<width;
      const tail=x>=88 && x<=132 && Math.abs(v)<(x-84)*.61 && Math.abs(v)>(x-96)*.13;
      const fin=x>-44 && x<-8 && Math.abs(v)<34-Math.abs(x+28)*.65;
      if(!body && !tail && !fin)continue;
      let grain=(.76+.24*Math.sin(x*9.12+y*4.17+fish*7))*brightness;
      let color;
      if(body){
        const marking=Math.sin(u*19+fish*3)+Math.cos(v*.14+u*9);
        color=marking>.75?[186,82,46]:marking<-1?[48,57,43]:rgb;
        grain*=.52+.48*Math.sqrt(Math.max(0,1-v*v/(width*width)));
        if(x<-68 && x>-80 && Math.abs(v)>width*.5)color=[20,25,19];
      }else{color=rgb.map(c=>c*.44);grain*=.62;}
      ctx.fillStyle=pixelColor(...color,255,grain)||'#111410';
      ctx.fillRect(x,y,Math.max(1,grid-.8),Math.max(1,grid-.8));
    }
    ctx.restore();
    if(!thumbnail)ripple(p.x*area,p.y*h,125*scale,.018);
  }
}
