import {defaults,normalize,validateImage,audioLevel} from './model.mjs';
import {drawScene} from './render.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const icons={
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6m0-10v1"/>',
  minimize:'<path d="M8 4v4H4m16 0h-4V4M4 16h4v4m8 0v-4h4"/>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  audio:'<path d="M4 9v6m4-10v14m4-16v18m4-15v12m4-9v6"/>',
  monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  pause:'<path d="M8 5v14m8-14v14" stroke-width="2.5"/>',
  play:'<path d="m8 4 12 8-12 8z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
let state={...defaults};
try{state=normalize(JSON.parse(localStorage.getItem('dotpond-settings')));}catch{}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(reduced.matches)state.paused=true;
let image=null,stream=null,audio=null,analyser=null,audioData=null,level=0,toastTimer,loadingImage=false,audioTimer;
const canvas=$('#pond'),ctx=canvas.getContext('2d',{alpha:false});
const wallpaper=new URLSearchParams(location.search).has('wallpaper');
if(wallpaper)document.body.classList.add('wallpaper');
function notify(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6000);}
function save(){try{localStorage.setItem('dotpond-settings',JSON.stringify(state));}catch{notify('設定を保存できません。この画面では引き続き操作できます。');}window.desktop?.update(state);}
function sync(){
  for(const key of ['size','speed','brightness']){
    const input=$(`#${key}`);input.value=state[key];input.style.setProperty('--fill',`${(state[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
    $(`#${key}-value`).textContent=key==='size'?`${state[key]} px`:key==='speed'?`${state[key].toFixed(1)} ×`:`${Math.round(state[key]*100)} %`;
  }
  $$('.scene').forEach(el=>{const active=el.dataset.scene===state.scene;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});
  $$('.swatch').forEach(el=>{const active=el.dataset.color===state.color;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});
  $('#color').value=state.color;document.documentElement.style.setProperty('--accent',state.color);
  $('#play').innerHTML=icon(state.paused?'play':'pause');$('#play').setAttribute('aria-label',state.paused?'再生':'一時停止');
  $('#play-state').innerHTML=`<span class="tiny-dot" style="opacity:${state.paused?.35:1}"></span>${state.paused?'停止中':'再生中'}`;
  const names={pond:['01','鯉の池','KOI POND'],waves:['02','波紋','RIPPLES'],nebula:['03','星雲','NEBULA'],image:['04','画像','CUSTOM IMAGE']};
  const n=names[state.scene];$('#meta-index').textContent=n[0];$('#scene-name').innerHTML=`${n[1]}<span>${n[2]}</span>`;
  $$('.scene canvas').forEach(c=>drawScene(c.getContext('2d'),c.width,c.height,27,{...state,scene:c.dataset.preview},0,null,true));
  draw();
}
function change(key,value){state[key]=value;sync();save();}
let w=0,h=0,time=27,last=0,fpsAt=performance.now(),fps=0;
function resize(){const scale=Math.min(1,1800/innerWidth,1200/innerHeight);w=canvas.width=Math.round(innerWidth*scale);h=canvas.height=Math.round(innerHeight*scale);draw();}
function draw(){if(w && h)drawScene(ctx,w,h,time,state,level,image);}
const bars=Array.from({length:28},()=>{const span=document.createElement('span');$('.audio-meter').append(span);return span;});
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden || now-last<1000/30)return;
  const delta=Math.min(.1,(now-last)/1000);last=now;
  if(!analyser && !wallpaper)level*=.9;
  if(!state.paused){time+=delta*state.speed;draw();fps++;}
  if(now-fpsAt>=1000){$('#fps').textContent=state.paused?'—':String(Math.min(30,fps));fps=0;fpsAt=now;}
}
function selectTab(name){
  $$('.tab').forEach(el=>{const active=el.dataset.tab===name;el.classList.toggle('active',active);el.setAttribute('aria-selected',active);el.tabIndex=active?0:-1;});
  ['scene','image','audio'].forEach(tab=> $(`#${tab}-tab`).hidden=tab!==name);
}
$$('.tab').forEach(el=>{
  el.addEventListener('click',()=>selectTab(el.dataset.tab));
  el.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const tabs=$$('.tab'),i=tabs.indexOf(el),next=tabs[(i+(event.key==='ArrowRight'?1:2))%3];selectTab(next.dataset.tab);next.focus();}});
});
$$('.scene').forEach(el=>el.addEventListener('click',()=>change('scene',el.dataset.scene)));
for(const key of ['size','speed','brightness'])$(`#${key}`).addEventListener('input',e=>change(key,Number(e.target.value)));
$$('.swatch').forEach(el=>el.addEventListener('click',()=>change('color',el.dataset.color)));
$('#color').addEventListener('input',e=>change('color',e.target.value));
$('#play').addEventListener('click',()=>change('paused',!state.paused));
$('#reset').addEventListener('click',()=>{state={...defaults,paused:reduced.matches};image=null;window.desktop?.image(null);$('#image-details').hidden=true;$('#image-file').value='';stopAudio();sync();save();notify('設定をリセットしました。');});
function immersive(hide){document.body.classList.toggle('immersive',hide);$('#show').hidden=!hide;if(hide)$('#show').focus();else $('#hide').focus();}
$('#hide').addEventListener('click',()=>immersive(true));$('#show').addEventListener('click',()=>immersive(false));
async function fullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{notify('このブラウザーでは全画面表示を開始できません。Windowsアプリをご利用ください。');}
}
$('#fullscreen').addEventListener('click',fullscreen);
$('#wallpaper').addEventListener('click',async()=>{
  if(!window.desktop){await fullscreen();return;}
  try{const result=await window.desktop.wallpaper();notify(result);}catch{notify('壁紙を開始できません。通常表示で引き続き操作できます。');}
});
if(window.desktop)$('#wallpaper span').textContent='壁紙として設定';
$('#about').addEventListener('click',()=>$('#info-dialog').showModal());
$('#close-info').addEventListener('click',()=>$('#info-dialog').close());
$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||$('#info-dialog').open)return;
  if(e.code==='Space' && e.target.tagName==='BUTTON')return;
  if(e.code==='Space'){e.preventDefault();change('paused',!state.paused);}
  if(e.key.toLowerCase()==='f')fullscreen();
  if(e.key.toLowerCase()==='h')immersive(!document.body.classList.contains('immersive'));
  if(e.key==='Escape')immersive(false);
});
async function loadImage(file){
  if(loadingImage)return;
  const error=validateImage(file);if(error){notify(error);return;}
  loadingImage=true;$('#drop-zone').setAttribute('aria-busy','true');
  let bitmap;
  try{
    bitmap=await createImageBitmap(file);
    if(bitmap.width*bitmap.height>24_000_000)throw new Error('画像は2400万画素以下にしてください。');
    const scale=Math.min(1,1600/bitmap.width,1200/bitmap.height),temp=document.createElement('canvas');
    temp.width=Math.max(1,Math.round(bitmap.width*scale));temp.height=Math.max(1,Math.round(bitmap.height*scale));
    const c=temp.getContext('2d',{willReadFrequently:true});c.drawImage(bitmap,0,0,temp.width,temp.height);
    image=c.getImageData(0,0,temp.width,temp.height);window.desktop?.image({width:image.width,height:image.height,data:image.data});state.scene='image';$('#image-name').textContent=file.name;$('#image-details').hidden=false;sync();save();notify('画像をドットに変換しました。');
  }catch(e){notify(e.message.includes('2400')?e.message:'画像を読み込めません。別の画像を選択してください。');}
  finally{bitmap?.close();loadingImage=false;$('#drop-zone').removeAttribute('aria-busy');$('#image-file').value='';}
}
$('#image-file').addEventListener('change',e=>{if(e.target.files[0])loadImage(e.target.files[0]);});
$('#drop-zone').addEventListener('keydown',e=>{if(e.target!==e.currentTarget)return;if(e.key==='Enter'||e.code==='Space'){e.preventDefault();$('#image-file').click();}});
for(const type of ['dragenter','dragover'])$('#drop-zone').addEventListener(type,e=>{e.preventDefault();e.currentTarget.classList.add('dragover');});
$('#drop-zone').addEventListener('dragleave',e=>e.currentTarget.classList.remove('dragover'));
$('#drop-zone').addEventListener('drop',e=>{e.preventDefault();e.currentTarget.classList.remove('dragover');if(e.dataTransfer.files[0])loadImage(e.dataTransfer.files[0]);});
$('#remove-image').addEventListener('click',()=>{image=null;window.desktop?.image(null);$('#image-details').hidden=true;change('scene','pond');});
function stopAudio(){
  clearInterval(audioTimer);window.desktop?.level(0);
  const old=stream;stream=null;old?.getTracks().forEach(t=>t.stop());
  if(audio)audio.close().catch(()=>{});audio=null;analyser=null;audioData=null;level=0;
  $('#audio-state').textContent='未接続';$('#audio-dot').classList.remove('connected');$('#stop-audio').hidden=true;
  $('#system-audio').hidden=false;$('#mic-audio').hidden=false;bars.forEach(b=>{b.style.height='3px';b.style.opacity='.3';});
}
let connecting=false;
async function connectAudio(mic){
  if(connecting)return;connecting=true;$('#system-audio').disabled=true;$('#mic-audio').disabled=true;
  stopAudio();let capture;
  try{
    if(!navigator.mediaDevices)throw new Error('この環境は音声入力に対応していません。');
    capture=mic?await navigator.mediaDevices.getUserMedia({audio:true,video:false}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
    if(!capture.getAudioTracks().length){throw new Error('音声が共有されていません。「音声を共有」を選択して接続してください。');}
    capture.getVideoTracks().forEach(t=>{t.stop();capture.removeTrack(t);});
    stream=capture;audio=new AudioContext();await audio.resume();analyser=audio.createAnalyser();analyser.fftSize=256;audioData=new Uint8Array(analyser.fftSize);audio.createMediaStreamSource(stream).connect(analyser);
    audioTimer=setInterval(()=>{analyser.getByteTimeDomainData(audioData);level=level*.7+audioLevel(audioData)*.3;window.desktop?.level(level);bars.forEach((b,i)=>{b.style.height=`${3+level*(18+Math.sin(i*1.8+performance.now()*.004)*14)}px`;b.style.opacity=.3+level*.7;});},50);
    stream.getAudioTracks()[0].addEventListener('ended',()=>{stopAudio();notify('音声の接続が終了しました。');},{once:true});
    $('#audio-state').textContent=mic?'マイクに接続中':'PC音声に接続中';$('#audio-dot').classList.add('connected');$('#stop-audio').hidden=false;$('#system-audio').hidden=true;$('#mic-audio').hidden=true;
  }catch(e){capture?.getTracks().forEach(t=>t.stop());stopAudio();notify(e.name==='NotAllowedError'?'音声接続をキャンセルしました。':e.message==='Permission denied'?'音声入力が許可されていません。':e.message);}
  finally{connecting=false;$('#system-audio').disabled=false;$('#mic-audio').disabled=false;}
}
$('#system-audio').addEventListener('click',()=>connectAudio(false));$('#mic-audio').addEventListener('click',()=>connectAudio(true));$('#stop-audio').addEventListener('click',stopAudio);
window.desktop?.onSettings(settings=>{const next=normalize(settings);if(settings.scene==='image' && image)next.scene='image';state=next;sync();});
window.desktop?.onImage(value=>{image=value;if(!image && state.scene==='image')state.scene='pond';sync();});
window.desktop?.onLevel(value=>{level=value;});
window.desktop?.onTogglePause(()=>change('paused',!state.paused));
window.desktop?.onError(notify);
reduced.addEventListener('change',e=>{if(e.matches)change('paused',true);});
addEventListener('resize',resize);addEventListener('beforeunload',stopAudio);
selectTab('scene');resize();sync();requestAnimationFrame(frame);
const loading=$('#loading');
Promise.all([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,650))]).then(()=>{loading.classList.add('loaded');setTimeout(()=>loading.hidden=true,600);});
setTimeout(()=>{loading.classList.add('loaded');setTimeout(()=>loading.hidden=true,600);},3000);
