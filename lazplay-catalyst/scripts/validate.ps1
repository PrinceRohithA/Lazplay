$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$jsonFiles = @(
  "catalyst.json",
  "catalyst-user-rules.json",
  "backend/app-config.json",
  "backend/app-config.example.json",
  "configs/api-routes.json",
  "configs/environment.template.json",
  "configs/r2-policy.json",
  "functions/cacheInvalidator/catalyst-config.json",
  "functions/cacheInvalidator/package.json",
  "iac/cache-segments.json",
  "iac/datastore.schema.json",
  "iac/migration-plan.json"
)

foreach ($file in $jsonFiles) {
  $path = Join-Path $Root $file
  Get-Content -Raw $path | ConvertFrom-Json | Out-Null
  Write-Host "JSON OK $file"
}

$reservedEnvPattern = "(^CATALYST_|^X_ZOHO_|^ZOHO_|^NODE_|CATALYST|ZOHO)"
$envConfigFiles = @(
  "backend/app-config.json",
  "backend/app-config.example.json",
  "functions/cacheInvalidator/catalyst-config.json"
)

foreach ($file in $envConfigFiles) {
  $path = Join-Path $Root $file
  $json = Get-Content -Raw $path | ConvertFrom-Json
  $envBlocks = @()

  if ($json.env_variables) {
    $envBlocks += $json.env_variables
  }

  if ($json.deployment -and $json.deployment.env_variables) {
    $envBlocks += $json.deployment.env_variables
  }

  foreach ($block in $envBlocks) {
    foreach ($key in $block.PSObject.Properties.Name) {
      if ($key -match $reservedEnvPattern) {
        throw "Reserved Catalyst environment variable key '$key' found in $file. Use the LAZPLAY_ namespace for custom values."
      }
    }
  }
}

$lockFiles = @(
  "backend/package-lock.json",
  "functions/cacheInvalidator/package-lock.json"
)

foreach ($file in $lockFiles) {
  $path = Join-Path $Root $file
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('JSON OK ' + process.argv[1])" $path
}

Push-Location (Join-Path $Root "backend")
try {
  node --check src/catalyst/server.js
  node --check src/catalyst/app.js
  node --check src/catalyst/http.js
  node --check src/catalyst/services/auth.js
  node --check src/catalyst/services/cache.js
  node --check src/catalyst/services/datastore.js
  node --check src/catalyst/services/r2.js
}
finally {
  Pop-Location
}

node --check (Join-Path $Root "functions/cacheInvalidator/index.js")
Write-Host "Validation complete"
