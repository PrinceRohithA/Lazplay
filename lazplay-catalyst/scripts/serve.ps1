param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command catalyst -ErrorAction SilentlyContinue)) {
  throw "Catalyst CLI is not installed. Install it with: npm install -g zcatalyst-cli"
}

if (-not $SkipBuild) {
  & (Join-Path $PSScriptRoot "build.ps1") -SkipInstall
}

Push-Location $Root
try {
  catalyst serve
}
finally {
  Pop-Location
}
