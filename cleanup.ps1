Write-Host "Running cleanup"
Remove-Item -Path $env:TEMP\test_cleanup\* -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Cleanup done"
