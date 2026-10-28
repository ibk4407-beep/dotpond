export const defaults = Object.freeze({scene:'pond', speed:1, size:5, brightness:1, color:'#c4cfb3', paused:false, reactive:true});
const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max,Math.max(min,value)) : fallback;
export function normalize(input) {
  const v=input && typeof input==='object' ? input : {};
  return {
    scene:['pond','waves','nebula'].includes(v.scene)?v.scene:'pond',
    speed:number(v.speed,1,.2,2), size:number(v.size,5,3,12), brightness:number(v.brightness,1,.2,1.5),
    color:typeof v.color==='string' && /^#[0-9a-f]{6}$/i.test(v.color)?v.color:defaults.color,
    paused:typeof v.paused==='boolean'?v.paused:false, reactive:v.reactive!==false
  };
}
export function koiPosition(time, fish) {
  const phase=time*.035+fish*Math.PI*2/3;
  return {x:.5+.31*Math.cos(phase),y:.5+.29*Math.sin(phase*1.13+fish*.4)};
}
export function koiWidth(u) {return u<=0 || u>=1?0:25*Math.pow(Math.sin(Math.PI*u),.65)*(1.25-.8*u);}
export function pixelColor(r,g,b,a,brightness) {
  if(a<30 || r+g+b<12) return null;
  return `rgb(${Math.min(255,Math.round(r*brightness))},${Math.min(255,Math.round(g*brightness))},${Math.min(255,Math.round(b*brightness))})`;
}
export function validateImage(file) {
  if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) return 'PNG・JPEG・WebP の画像を選択してください。';
  if(file.size>15*1024*1024) return '画像は15MB以下にしてください。';
  return null;
}
export function audioLevel(bytes) {
  if(!bytes.length) return 0;
  let sum=0; for(const b of bytes) sum+=((b-128)/128)**2;
  return Math.min(1,Math.sqrt(sum/bytes.length)*2.5);
}
