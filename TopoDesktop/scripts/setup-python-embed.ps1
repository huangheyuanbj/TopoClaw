# Copyright 2025 OPPO

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Download and extract Python Embeddable to resources/python-embed, bootstrap pip
# Run from project root: npm run setup:python
# If python.exe exists, skip download/extract to preserve installed packages; only add pip if missing

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$PY_VERSION = "3.12.7"
$PY_EMBED_URL = "https://www.python.org/ftp/python/$PY_VERSION/python-$PY_VERSION-embed-amd64.zip"
$GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py"
$TARGET_DIR = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($PSScriptRoot, "..", "resources", "python-embed"))
$ZIP_PATH = Join-Path $env:TEMP "python-embed-amd64.zip"
$GET_PIP_PATH = Join-Path $TARGET_DIR "get-pip.py"
$pythonExe = Join-Path $TARGET_DIR "python.exe"

$envExists = Test-Path $pythonExe

if (-not $envExists) {
  Write-Host "No existing env, full install..."
  Write-Host "Downloading Python $PY_VERSION Embeddable..."
  Invoke-WebRequest -Uri $PY_EMBED_URL -OutFile $ZIP_PATH -UseBasicParsing
  if (-not (Test-Path $TARGET_DIR)) {
    New-Item -ItemType Directory -Path $TARGET_DIR -Force | Out-Null
  }
  Write-Host "Extracting to $TARGET_DIR ..."
  Expand-Archive -Path $ZIP_PATH -DestinationPath $TARGET_DIR -Force
  Remove-Item $ZIP_PATH -Force -ErrorAction SilentlyContinue
} else {
  Write-Host "Existing env found, skip download/extract, preserve packages"
}

# 1. Enable site in python*._pth (Embeddable uses extension ._pth, NOT .pth — python*.pth never matched)
$pthFiles = @(
  Get-ChildItem -Path $TARGET_DIR -Filter 'python*._pth' -File -ErrorAction SilentlyContinue
)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
foreach ($pth in $pthFiles) {
  $raw = [System.IO.File]::ReadAllText($pth.FullName)
  if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
  $newContent = $raw -replace '#\s*import\s+site', 'import site'
  if ($raw -ne $newContent) {
    [System.IO.File]::WriteAllText($pth.FullName, $newContent, $utf8NoBom)
    Write-Host "Enabled site: $($pth.Name)"
  }
}
if ($pthFiles.Count -eq 0) {
  Write-Warning "No python*._pth under $TARGET_DIR — is this a Python embeddable layout?"
}

# 2. Install pip if missing
$pipExists = $false
try {
  $null = & $pythonExe -m pip --version 2>$null
  $pipExists = $LASTEXITCODE -eq 0
} catch { }
if (-not $pipExists) {
  Write-Host "Installing pip..."
  Invoke-WebRequest -Uri $GET_PIP_URL -OutFile $GET_PIP_PATH -UseBasicParsing
  Push-Location $TARGET_DIR
  try {
    & $pythonExe $GET_PIP_PATH
    $pipExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  Remove-Item $GET_PIP_PATH -Force -ErrorAction SilentlyContinue
  if ($pipExitCode -ne 0) {
    Write-Warning ("pip install may have failed, exit code: " + $pipExitCode)
  } else {
    Write-Host "pip installed"
  }
} else {
  Write-Host "pip already exists, skip"
}

# Keep packaging tools in a known-good range to reduce resolver variance.
& $pythonExe -m pip install "pip<26" setuptools wheel --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Failed to pin pip/setuptools/wheel; continuing with current versions"
}

# 3. Install TopoClaw (topoclaw / 内置小助手) dependencies
$OPENCLAW_DIR = [System.IO.Path]::Combine($PSScriptRoot, "..", "resources", "TopoClaw")
$PYPROJECT = Join-Path $OPENCLAW_DIR "pyproject.toml"
$TopoClawCoreConstraints = Join-Path $PSScriptRoot "topoclaw-core-constraints.txt"
$TopoClawBrowserStrictConstraints = Join-Path $PSScriptRoot "topoclaw-browser-strict-constraints.txt"
$TopoClawBrowserCompatConstraints = Join-Path $PSScriptRoot "topoclaw-browser-compat-constraints.txt"
$LegacyConstraints = Join-Path $PSScriptRoot "topoclaw-constraints.txt"
$browserModeRaw = $env:TOPOCLAW_BROWSER_MODE
if ([string]::IsNullOrWhiteSpace($browserModeRaw)) { $browserModeRaw = "strict" }
$browserMode = $browserModeRaw.Trim().ToLowerInvariant()
if ($browserMode -notin @("strict", "compat", "off")) {
  Write-Warning "Unknown TOPOCLAW_BROWSER_MODE='$browserModeRaw', fallback to strict"
  $browserMode = "strict"
}
Write-Host "TopoClaw browser dependency mode: $browserMode"
$depsOk = $true
if (Test-Path $PYPROJECT) {
  Write-Host "Installing TopoClaw (topoclaw) dependencies..."
  & $pythonExe -m pip install hatchling --quiet 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "pip install hatchling failed (needed to build topoclaw package)"
    $depsOk = $false
  }
  Push-Location $OPENCLAW_DIR
  try {
    $coreConstraintsPath = $null
    if (Test-Path $TopoClawCoreConstraints) {
      $coreConstraintsPath = $TopoClawCoreConstraints
    } elseif (Test-Path $LegacyConstraints) {
      $coreConstraintsPath = $LegacyConstraints
      Write-Warning "Using legacy constraints file: $LegacyConstraints"
    }

    if ($coreConstraintsPath) {
      Write-Host "Using core dependency constraints: $coreConstraintsPath"
      & $pythonExe -m pip install . --constraint $coreConstraintsPath --prefer-binary --quiet
    } else {
      Write-Warning "No core constraints found, falling back to unconstrained TopoClaw install"
      & $pythonExe -m pip install . --prefer-binary --quiet
    }
    if ($LASTEXITCODE -ne 0) {
      Write-Error 'TopoClaw core pip install failed; built-in assistant will not start. Fix errors above.'
      $depsOk = $false
    } else {
      Write-Host "TopoClaw core deps installed"
    }

    if ($depsOk -and $browserMode -ne "off") {
      $extraName = if ($browserMode -eq "strict") { "browser-strict" } else { "browser-compat" }
      $browserConstraintsPath = $null
      if ($browserMode -eq "strict" -and (Test-Path $TopoClawBrowserStrictConstraints)) {
        $browserConstraintsPath = $TopoClawBrowserStrictConstraints
      } elseif ($browserMode -eq "compat" -and (Test-Path $TopoClawBrowserCompatConstraints)) {
        $browserConstraintsPath = $TopoClawBrowserCompatConstraints
      } elseif (Test-Path $LegacyConstraints) {
        $browserConstraintsPath = $LegacyConstraints
      }

      if ($browserConstraintsPath) {
        Write-Host "Installing browser extras ($extraName) with constraints: $browserConstraintsPath"
        & $pythonExe -m pip install ".[${extraName}]" --constraint $browserConstraintsPath --prefer-binary --quiet
      } else {
        Write-Host "Installing browser extras ($extraName) without constraints"
        & $pythonExe -m pip install ".[${extraName}]" --prefer-binary --quiet
      }

      if ($LASTEXITCODE -ne 0) {
        Write-Error "TopoClaw browser extras install failed in mode '$browserMode'."
        $depsOk = $false
      } else {
        Write-Host "TopoClaw browser extras installed ($extraName)"
      }
    } elseif ($depsOk) {
      Write-Host "TopoClaw browser extras disabled (TOPOCLAW_BROWSER_MODE=off)"
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "TopoClaw not found, skip deps (run setup:assistant first)"
}

# 4. Install GroupManager (SimpleChat) dependencies — 内置群组管理助手
$GM_DIR = [System.IO.Path]::Combine($PSScriptRoot, "..", "resources", "group-manager")
$GM_REQ = Join-Path $GM_DIR "requirements.txt"
if (Test-Path $GM_REQ) {
  Write-Host "Installing group-manager (SimpleChat) dependencies..."
  & $pythonExe -m pip install -r $GM_REQ --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host "group-manager deps installed"
  } else {
    Write-Warning "group-manager pip install failed; built-in GroupManager may not start. Run npm run setup:group-manager then npm run setup:python."
    $depsOk = $false
  }
} else {
  Write-Host "resources/group-manager/requirements.txt not found, skip (run npm run setup:group-manager first)"
}

# 5. Conservative prune to speed up installer:
#    remove caches and non-runtime docs/tests/examples from site-packages.
function Get-DirStats([string]$root) {
  if (-not (Test-Path $root)) {
    return @{ Files = 0; Bytes = 0 }
  }
  $files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue
  $bytes = ($files | Measure-Object -Property Length -Sum).Sum
  if (-not $bytes) { $bytes = 0 }
  return @{ Files = $files.Count; Bytes = $bytes }
}

Write-Host "Pruning embedded Python footprint (safe set)..."
$before = Get-DirStats $TARGET_DIR

# 5.1 remove __pycache__ directories and *.pyc files (runtime-safe)
Get-ChildItem -Path $TARGET_DIR -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  }
Get-ChildItem -Path $TARGET_DIR -Recurse -File -Filter "*.pyc" -ErrorAction SilentlyContinue |
  ForEach-Object {
    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
  }

# 5.2 remove docs/tests/examples under Lib/site-packages only
$SITE_PACKAGES = Join-Path $TARGET_DIR "Lib\site-packages"
if (Test-Path $SITE_PACKAGES) {
  $pruneDirNames = @("test", "tests", "testing", "doc", "docs", "example", "examples", "sample", "samples")
  foreach ($name in $pruneDirNames) {
    Get-ChildItem -Path $SITE_PACKAGES -Recurse -Directory -Filter $name -ErrorAction SilentlyContinue |
      ForEach-Object {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
      }
  }
}

$after = Get-DirStats $TARGET_DIR
$removedFiles = [Math]::Max(0, [int]$before.Files - [int]$after.Files)
$removedBytes = [Math]::Max(0, [double]$before.Bytes - [double]$after.Bytes)
Write-Host ("Prune done: removed {0} files, {1} MB" -f $removedFiles, [Math]::Round($removedBytes / 1MB, 2))

Write-Host ""
$verifyPy = Join-Path $TARGET_DIR 'python.exe'
Write-Host "Done. Verify: $verifyPy -m pip list"
if (-not $depsOk) { exit 1 }
