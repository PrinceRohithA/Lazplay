# Script to compress Catalyst files, skipping node_modules and output zip
Get-ChildItem -Path . -Exclude "node_modules", "lazplay-iac-deploy.zip" -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules" } | 
    Compress-Archive -DestinationPath "lazplay-iac-deploy.zip" -Force

Write-Host "Success! lazplay-iac-deploy.zip created successfully."
