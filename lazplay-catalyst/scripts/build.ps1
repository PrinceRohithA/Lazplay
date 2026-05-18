param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$ClientDist = Join-Path $Root "client\dist"

Push-Location $Frontend
try {
  if (-not $SkipInstall) {
    npm.cmd install
  }
  npm.cmd run build
}
finally {
  Pop-Location
}

New-Item -ItemType Directory -Force $ClientDist | Out-Null

$BuiltDist = Join-Path $Frontend "dist"
Copy-Item -Path (Join-Path $BuiltDist "*") -Destination $ClientDist -Recurse -Force

@{
  name = "lazplay-client"
  version = "1.0.0"
  homepage = "index.html"
  login_redirect = "index.html"
  "404" = "404.html"
} | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $ClientDist "client-package.json")

Copy-Item -LiteralPath (Join-Path $ClientDist "index.html") -Destination (Join-Path $ClientDist "404.html") -Force

Write-Host "Built Catalyst web client at $ClientDist"
