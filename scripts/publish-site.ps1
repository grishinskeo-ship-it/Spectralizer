# Copy docs/ to the user Pages repo (grishinskeo-ship-it.github.io).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path $env:TEMP 'spectralizer-user-pages'

if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item -Path (Join-Path $root 'docs\*') -Destination $tmp -Recurse
Remove-Item -Force (Join-Path $tmp 'screenshots\_demo.wav') -ErrorAction SilentlyContinue

Set-Location $tmp
git init -b main | Out-Null
git add -A
git -c user.name=ag -c user.email=a.guryanovnf@yandex.ru commit -m "Update Spectralizer site."
git remote add origin https://github.com/grishinskeo-ship-it/grishinskeo-ship-it.github.io.git
git push --force origin main
Write-Output 'Published https://grishinskeo-ship-it.github.io/'
