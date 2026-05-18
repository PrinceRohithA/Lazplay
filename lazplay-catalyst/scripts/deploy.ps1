param(
  [switch]$SkipBuild,
  [string]$Only = "client,appsail,functions,apig"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command catalyst -ErrorAction SilentlyContinue)) {
  throw "Catalyst CLI is not installed. Install it with: npm install -g zcatalyst-cli"
}

if (-not $SkipBuild) {
  & (Join-Path $PSScriptRoot "build.ps1")
}

Push-Location $Root
try {
  catalyst apig:enable
  catalyst deploy --only $Only
}
finally {
  Pop-Location
}
