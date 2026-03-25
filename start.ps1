param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ollamaExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
$ollamaModels = "E:\.ollama\models"
$ollamaHost = "http://127.0.0.1:11434"
$appUrl = "http://localhost:8000"

function Write-Step {
    param([string]$Message)
    Write-Host "[Local AI] $Message" -ForegroundColor Cyan
}

function Test-Http {
    param([string]$Url)
    try {
        Invoke-RestMethod -Uri $Url -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-Path $ollamaExe)) {
    throw "Khong tim thay Ollama tai $ollamaExe"
}

if (-not (Test-Path $ollamaModels)) {
    throw "Khong tim thay thu muc model tai $ollamaModels"
}

$env:OLLAMA_MODELS = $ollamaModels
$env:OLLAMA_VULKAN = "1"

Write-Step "OLLAMA_MODELS = $env:OLLAMA_MODELS"
Write-Step "OLLAMA_VULKAN = $env:OLLAMA_VULKAN"

if (-not (Test-Http "$ollamaHost/api/tags")) {
    Write-Step "Khoi dong Ollama..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "set OLLAMA_MODELS=$ollamaModels && set OLLAMA_VULKAN=1 && `"$ollamaExe`" serve > `"%LOCALAPPDATA%\Ollama\server-e-drive.log`" 2>&1"

    $ollamaReady = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        if (Test-Http "$ollamaHost/api/tags") {
            $ollamaReady = $true
            break
        }
    }

    if (-not $ollamaReady) {
        throw "Ollama khong khoi dong dung han. Kiem tra log tai %LOCALAPPDATA%\Ollama\server-e-drive.log"
    }
} else {
    Write-Step "Ollama da san sang."
}

$models = @()
try {
    $tagResponse = Invoke-RestMethod -Uri "$ollamaHost/api/tags" -TimeoutSec 10
    $models = @($tagResponse.models | ForEach-Object { $_.name })
} catch {
    throw "Khong lay duoc danh sach model tu Ollama."
}

$requiredModels = @("llama3:8b", "nomic-embed-text:latest")
$missingModels = $requiredModels | Where-Object { $_ -notin $models }
if ($missingModels.Count -gt 0) {
    Write-Host "Dang thieu model: $($missingModels -join ', ')" -ForegroundColor Yellow
    Write-Host "Hay chay:" -ForegroundColor Yellow
    foreach ($model in $missingModels) {
        Write-Host "  ollama pull $model" -ForegroundColor Yellow
    }
    throw "Chua du model de khoi dong he thong."
}

$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
$pythonExe = if (Test-Path $venvPython) { $venvPython } else { "python" }
Write-Step "Dung Python: $pythonExe"

if (Test-Http "$appUrl/status") {
    Write-Step "FastAPI da dang chay tai $appUrl"
    if (-not $NoBrowser) {
        Start-Process $appUrl
    }
    exit 0
}

if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
        param($Url)
        Start-Sleep -Seconds 5
        Start-Process $Url
    } -ArgumentList $appUrl | Out-Null
}

Write-Step "Khoi dong FastAPI tai $appUrl"
Push-Location $projectRoot
try {
    & $pythonExe "main.py"
} finally {
    Pop-Location
}
