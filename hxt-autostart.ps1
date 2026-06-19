$ErrorActionPreference = 'SilentlyContinue'

$Port = 3000
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerFile = Join-Path $RootDir 'server.js'

if (-not (Test-Path -LiteralPath $ServerFile)) {
  exit 1
}

$Existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($Existing) {
  exit 0
}

$Node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $Node) {
  exit 1
}

Start-Process -FilePath $Node.Source -ArgumentList 'server.js' -WorkingDirectory $RootDir -WindowStyle Hidden
