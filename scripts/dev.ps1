$env:Path = "C:\Program Files\nodejs;" + $env:Path
Set-Location -Path (Join-Path $PSScriptRoot "..")
& "C:\Program Files\nodejs\npm.cmd" run dev
