const {app,BrowserWindow,Tray,Menu,ipcMain,screen,session,desktopCapturer,protocol,net,nativeImage,shell}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {spawn}=require('node:child_process');
const {validImage,validLevel,trustedUrl}=require('./validation.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let main,background,tray,helper,quitting=false,settings,image=null;
const dist=path.join(__dirname,'../dist');
const rendererOptions={preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false};
function primarySender(event){return main && !main.isDestroyed() && event.sender===main.webContents && event.senderFrame===main.webContents.mainFrame && trustedUrl(event.senderFrame.url);}
function sendBackground(channel,value){if(background && !background.isDestroyed())background.webContents.send(channel,value);}
function stopWallpaper(){if(helper){helper.kill();helper=null;}if(background && !background.isDestroyed())background.destroy();background=null;}
function showMain(){main.show();main.focus();}
function secureWindow(window){
  window.webContents.on('will-navigate',(event,url)=>{if(!trustedUrl(url))event.preventDefault();});
  window.webContents.setWindowOpenHandler(({url})=>{
    if(url==='https://github.com/ibk4407-beep/dotpond/releases/latest')shell.openExternal(url).catch(()=>{});
    return {action:'deny'};
  });
}
async function startWallpaper(){
  if(process.platform!=='win32')return '壁紙への常駐はWindowsで利用できます。';
  if(background){stopWallpaper();return '壁紙の表示を停止しました。';}
  const bounds=screen.getPrimaryDisplay().bounds;
  const window=background=new BrowserWindow({...bounds,frame:false,show:false,skipTaskbar:true,focusable:false,backgroundColor:'#111410',webPreferences:rendererOptions});
  secureWindow(window);window.setIgnoreMouseEvents(true);
  await window.loadURL('app://dotpond/index.html?wallpaper=1');
  if(image)sendBackground('image',image);sendBackground('settings',settings);
  window.showInactive();
  const hwnd=window.getNativeWindowHandle().readBigUInt64LE().toString();
  const exe=app.isPackaged?path.join(process.resourcesPath,'WallpaperHost.exe'):path.join(__dirname,'WallpaperHost.exe');
  return new Promise(resolve=>{
    const child=helper=spawn(exe,[hwnd],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let settled=false,output='';
    const finish=message=>{if(settled)return;settled=true;clearTimeout(timer);resolve(message);};
    const timer=setTimeout(()=>{stopWallpaper();finish('壁紙の開始がタイムアウトしました。通常表示で操作できます。');},5000);
    child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('READY'))finish('デスクトップで壁紙を開始しました。トレイから停止できます。');});
    child.on('error',()=>{stopWallpaper();finish('壁紙を開始できません。通常表示で操作できます。');});
    child.on('exit',()=>{
      if(helper!==child)return;
      const started=settled;stopWallpaper();finish('このWindows環境では壁紙を開始できません。');
      if(started && main && !main.isDestroyed())main.webContents.send('app-error','デスクトップ構成が変わったため壁紙を停止しました。再度設定してください。');
    });
  });
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',()=>{if(main)showMain();});
  app.whenReady().then(async()=>{
    const {defaults}=await import('../dist/model.mjs');settings={...defaults};
    protocol.handle('app',request=>{
      const url=new URL(request.url),relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(dist,relative||'index.html');
      if(!trustedUrl(request.url) || !file.startsWith(dist+path.sep))return new Response('Not found',{status:404});
      return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.setPermissionCheckHandler((contents,permission,origin)=>contents===main?.webContents && trustedUrl(origin) && ['media','display-capture'].includes(permission));
    session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===main?.webContents && trustedUrl(details.requestingUrl) && ['media','display-capture','fullscreen'].includes(permission)));
    session.defaultSession.setDisplayMediaRequestHandler(async(request,callback)=>{
      if(!main || request.frame!==main.webContents.mainFrame || !trustedUrl(request.frame.url)){callback({});return;}
      try{
        const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:0,height:0}});
        const primary=sources.find(source=>source.display_id===String(screen.getPrimaryDisplay().id))||sources[0];
        if(!primary){callback({});return;}
        callback({video:primary,audio:'loopback'});
      }catch{callback({});}
    });
    main=new BrowserWindow({width:1360,height:860,minWidth:760,minHeight:600,backgroundColor:'#111410',title:'DOTPOND',autoHideMenuBar:true,webPreferences:rendererOptions});
    secureWindow(main);
    const pixels=Buffer.alloc(32*32*4);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){const dot=x>=5&&x<27&&y>=5&&y<27&&((x-5)%8<5)&&((y-5)%8<5)&&!(x>20&&y>20);const i=(y*32+x)*4;pixels[i]=dot?179:16;pixels[i+1]=dot?207:20;pixels[i+2]=dot?196:17;pixels[i+3]=255;}
    tray=new Tray(nativeImage.createFromBitmap(pixels,{width:32,height:32}));tray.setToolTip('DOTPOND');
    tray.setContextMenu(Menu.buildFromTemplate([
      {label:'設定を開く',click:showMain},
      {label:'再生 / 一時停止',click:()=>main.webContents.send('toggle-pause')},
      {label:'壁紙を開始 / 停止',click:()=>startWallpaper().then(message=>main.webContents.send('app-error',message))},
      {type:'separator'},{label:'終了',click:()=>app.quit()}
    ]));tray.on('double-click',showMain);
    main.on('close',event=>{if(!quitting){event.preventDefault();main.hide();}});
    main.webContents.on('render-process-gone',()=>app.quit());
    screen.on('display-added',stopWallpaper);screen.on('display-removed',stopWallpaper);screen.on('display-metrics-changed',stopWallpaper);
    const {normalize}=await import('../dist/model.mjs');
    ipcMain.handle('wallpaper',event=>{if(!primarySender(event))throw new Error('Unauthorized');return startWallpaper();});
    ipcMain.on('settings',(event,value)=>{if(!primarySender(event))return;settings=normalize(value);if(value?.scene==='image' && image)settings.scene='image';sendBackground('settings',settings);});
    ipcMain.on('image',(event,value)=>{if(!primarySender(event))return;if(value===null){image=null;sendBackground('image',null);}else if(validImage(value)){image=value;sendBackground('image',value);}});
    ipcMain.on('level',(event,value)=>{if(primarySender(event) && validLevel(value))sendBackground('level',value);});
    await main.loadURL('app://dotpond/index.html');
  }).catch(error=>{console.error(error);app.quit();});
}
app.on('before-quit',()=>{quitting=true;stopWallpaper();tray?.destroy();});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
