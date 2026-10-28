const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  wallpaper:()=>ipcRenderer.invoke('wallpaper'),
  update:settings=>ipcRenderer.send('settings',settings),
  image:image=>ipcRenderer.send('image',image),
  level:level=>ipcRenderer.send('level',level),
  onSettings:callback=>ipcRenderer.on('settings',(_event,value)=>callback(value)),
  onImage:callback=>ipcRenderer.on('image',(_event,value)=>callback(value)),
  onLevel:callback=>ipcRenderer.on('level',(_event,value)=>callback(value)),
  onTogglePause:callback=>ipcRenderer.on('toggle-pause',()=>callback()),
  onError:callback=>ipcRenderer.on('app-error',(_event,value)=>callback(value))
});
