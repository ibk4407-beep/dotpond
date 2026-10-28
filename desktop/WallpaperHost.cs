using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

static class WallpaperHost
{
    delegate bool EnumProc(IntPtr window, IntPtr param);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string name,string title);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string name,string title);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback,IntPtr param);
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetParent(IntPtr child,IntPtr parent);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr window,int index);
    [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW", SetLastError=true)] static extern IntPtr SetWindowLongPtr(IntPtr window,int index,IntPtr value);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool ScreenToClient(IntPtr window,ref Point point);
    [DllImport("user32.dll")] static extern bool MoveWindow(IntPtr window,int x,int y,int w,int h,bool repaint);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("kernel32.dll")] static extern void SetLastError(uint error);
    [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr window,uint message,IntPtr wparam,IntPtr lparam,uint flags,uint timeout,out IntPtr result);
    static int Main(string[] args)
    {
        try
        {
            long value;
            if(args.Length!=1 || !long.TryParse(args[0],out value)) return 1;
            SetProcessDPIAware();
            IntPtr child=new IntPtr(value),progman=FindWindow("Progman",null),worker=IntPtr.Zero,result;
            if(!IsWindow(child) || progman==IntPtr.Zero) return 2;
            // shortcut: WorkerW is undocumented; stop if the desktop hierarchy changes.
            SendMessageTimeout(progman,0x052C,IntPtr.Zero,IntPtr.Zero,2,1000,out result);
            SendMessageTimeout(progman,0x052C,new IntPtr(13),IntPtr.Zero,2,1000,out result);
            SendMessageTimeout(progman,0x052C,new IntPtr(13),new IntPtr(1),2,1000,out result);
            worker=FindWindowEx(progman,IntPtr.Zero,"WorkerW",null);
            if(worker==IntPtr.Zero) EnumWindows(delegate(IntPtr window,IntPtr param){
                if(FindWindowEx(window,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero)
                    worker=FindWindowEx(IntPtr.Zero,window,"WorkerW",null);
                return worker==IntPtr.Zero;
            },IntPtr.Zero);
            if(worker==IntPtr.Zero) return 3;
            long style=GetWindowLongPtr(child,-16).ToInt64();
            SetLastError(0);SetWindowLongPtr(child,-16,new IntPtr((style & ~0x80000000L) | 0x40000000L));
            if(Marshal.GetLastWin32Error()!=0) return 4;
            SetLastError(0);SetParent(child,worker);
            if(Marshal.GetLastWin32Error()!=0) return 4;
            Rectangle bounds=Screen.PrimaryScreen.Bounds;Point origin=bounds.Location;ScreenToClient(worker,ref origin);
            if(!MoveWindow(child,origin.X,origin.Y,bounds.Width,bounds.Height,true)) return 5;
            Console.WriteLine("READY");Console.Out.Flush();
            while(IsWindow(child) && IsWindow(worker) && FindWindow("Progman",null)==progman)Thread.Sleep(1000);
            return 0;
        }
        catch{return 6;}
    }
}
