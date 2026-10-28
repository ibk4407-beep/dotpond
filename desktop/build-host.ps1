$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:exe /platform:x64 /reference:System.Drawing.dll /reference:System.Windows.Forms.dll "/out:$PSScriptRoot\WallpaperHost.exe" "$PSScriptRoot\WallpaperHost.cs"
if ($LASTEXITCODE -ne 0) { throw 'WallpaperHost build failed' }
