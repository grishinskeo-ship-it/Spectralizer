# Install Spectralizer VST3 for FL Studio (run PowerShell as Administrator)
# Example: powershell -ExecutionPolicy Bypass -File install-fl.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "target\bundled\spectralizer-vst.vst3"

if (-not (Test-Path $src)) {
    Write-Host "Bundle not found. Build first:" -ForegroundColor Yellow
    Write-Host "  cargo xtask bundle spectralizer-vst --release"
    exit 1
}

$targets = @(
    "$env:CommonProgramFiles\VST3\spectralizer-vst.vst3",
    "$env:ProgramFiles\VST3\spectralizer-vst.vst3"
)

foreach ($dst in $targets) {
    $parent = Split-Path $dst -Parent
    if (-not (Test-Path $parent)) {
        Write-Host "Skip (folder missing): $parent"
        continue
    }

    if (Test-Path $dst) {
        Remove-Item $dst -Recurse -Force
    }

    Copy-Item $src $dst -Recurse -Force
    Write-Host "OK: $dst" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next in FL Studio:" -ForegroundColor Cyan
Write-Host "  1. F10 -> Manage plugins"
Write-Host "  2. Enable: Verify plugins + Rescan previously verified plugins"
Write-Host "  3. Find more plugins / Start scan"
Write-Host "  4. Browser -> Plugin database -> Installed -> Effects -> VST3 -> Spectralizer"
Write-Host ""
Write-Host 'Note: FL Studio ignores custom VST3 paths (for example target\bundled).'
