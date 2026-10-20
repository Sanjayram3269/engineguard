param(
    [string]$Root = "D:\engineguard",
    [string]$TeamName = "Honeycomb",
    [string]$ProblemStatement = "PS2",
    [string]$HuggingFacePath = ""
)

$ErrorActionPreference = "Stop"
Set-Location $Root

Write-Host "`n=== Honeycomb HackHive Dataset Prep ===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) { throw "No .git directory found at $Root" }
$remote = git remote get-url origin
if ($LASTEXITCODE -ne 0 -or $remote -notmatch "Sanjayram3269/engineguard") { throw "Unexpected origin remote: $remote" }
Write-Host "Team: $TeamName | Problem statement: $ProblemStatement"
git status --short

$required = @("data\EngineFaultDB_Final.csv","data\vibration_features.csv","data\Audio","data\vibration_raw","audio_csv\audio_mfcc_features.csv","data\synthetic_bearing_rul_demo.csv","data\synthetic_bearing_rul_demo.metadata.json")
foreach ($p in $required) { if (-not (Test-Path $p)) { throw "Required dataset input missing: $p. Nothing has been pushed." } }
if ($HuggingFacePath -and -not (Test-Path $HuggingFacePath)) { throw "HuggingFacePath does not exist: $HuggingFacePath" }

# Clean local absolute paths from audio audit metadata.
if (Test-Path "audio_csv\audio_audit.csv") {
  $auditPath = Join-Path $Root "audio_csv\audio_audit.csv"
  $rows = Import-Csv $auditPath
  foreach ($row in $rows) {
    if ($row.PSObject.Properties.Name -contains "path" -and ([string]$row.path) -match "^[A-Za-z]:\\") {
      $leaf = [System.IO.Path]::GetFileName([string]$row.path)
      $row.path = Join-Path (Join-Path "data" "Audio") (Join-Path ([string]$row.class) $leaf)
    }
  }
  $rows | Export-Csv -NoTypeInformation -Encoding UTF8 $auditPath
}

# Remove the broad dataset ignore rules and replace with explicit source-data allow-list.
$gitignorePath = Join-Path $Root ".gitignore"
$gi = Get-Content $gitignorePath -Raw
$gi = $gi -replace "(?ms)^data/\*\r?\n!data/README\.md\r?\n\r?\nmodels/\*\r?\n!models/README\.md\r?\n# ML asset protection.*?(?=^# Frontend)", ""
$gi = $gi.TrimEnd() + "`r`n`r`n# HackHive dataset sources for Honeycomb`r`n!data/`r`ndata/*`r`n!data/README.md`r`n!data/Audio/`r`n!data/Audio/**`r`n!data/EngineFaultDB_Final.csv`r`n!data/vibration_raw/`r`n!data/vibration_raw/**`r`n!data/vibration_features.csv`r`n!data/vibration_report_features.csv`r`n!data/vibration_report_features_v2.csv`r`n!data/synthetic_bearing_rul_demo.csv`r`n!data/synthetic_bearing_rul_demo.metadata.json`r`n!audio_csv/`r`n!audio_csv/**`r`n"
Set-Content -Path $gitignorePath -Value $gi -Encoding UTF8

# Stop if a single file exceeds GitHub standard file limits; use LFS or keep that file in OneDrive if needed.
$dataFiles = @(Get-ChildItem "data" -Recurse -File) + @(Get-ChildItem "audio_csv" -Recurse -File)
if ($HuggingFacePath -and (Test-Path $HuggingFacePath)) { $dataFiles += Get-ChildItem $HuggingFacePath -Recurse -File }
$tooLarge = $dataFiles | Where-Object { $_.Length -gt 95MB }
if ($tooLarge) { $tooLarge | Select-Object FullName,Length | Format-Table -AutoSize; throw "Files above 95 MB found. No push attempted; handle these with Git LFS or OneDrive." }
$totalMB = [math]::Round((($dataFiles | Measure-Object Length -Sum).Sum / 1MB), 1)
Write-Host "Dataset total: about $totalMB MB; individual files checked." -ForegroundColor Yellow

# Stage only the necessary dataset and provenance files, not virtual environments, node_modules, builds or logs.
git add .gitignore
git add -f data/README.md data/EngineFaultDB_Final.csv data/vibration_features.csv data/synthetic_bearing_rul_demo.csv data/synthetic_bearing_rul_demo.metadata.json
git add -f data/Audio data/vibration_raw audio_csv
if ($LASTEXITCODE -ne 0) { throw "git add failed" }
$staged = git diff --cached --name-only
if ($staged -match "^(venv|\.venv|node_modules|dist|frontend/dist|\.audio_test_venv|\.freebuff|_scratch_untracked|ui_src|ui_src2|ui_work)/") { throw "Unsafe path staged. Review staged names before continuing." }
Write-Host "`n--- Staged data change summary ---" -ForegroundColor Cyan
git diff --cached --stat
Write-Host "`nReview staged file list and verify source redistribution rights before publishing raw third-party data." -ForegroundColor Yellow
$answer = Read-Host "Type YES to commit and push these datasets to GitHub"
if ($answer -ne "YES") { Write-Host "Cancelled before commit/push."; exit 0 }
git commit -m "Add HackHive datasets used by Honeycomb"
if ($LASTEXITCODE -ne 0) { throw "Commit failed; inspect git status." }
$pushSucceeded = $true
try {
  git push origin main
  if ($LASTEXITCODE -ne 0) { $pushSucceeded = $false; Write-Warning "Git push failed. The ZIP will still be built; resolve GitHub auth/size errors separately." }
} catch {
  $pushSucceeded = $false
  Write-Warning "Git push failed: $_. The ZIP will still be built; resolve separately."
}



# Build separate dataset archive with provenance, manifest and SHA-256 inventory.
$stage = Join-Path $env:TEMP "Honeycomb_PS2_dataset_submission"
$zipPath = Join-Path $Root "$($TeamName)_$($ProblemStatement).zip"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($d in @("01_Telemetry","02_Audio","03_Vibration","04_Health_and_Synthetic","05_Documentation")) { New-Item -ItemType Directory -Path (Join-Path $stage $d) | Out-Null }
Copy-Item "data\EngineFaultDB_Final.csv" (Join-Path $stage "01_Telemetry\EngineFaultDB_Final.csv")
Copy-Item "data\README.md" (Join-Path $stage "05_Documentation\EngineFaultDB_DATASET_CARD.md")
Copy-Item "data\Audio" (Join-Path $stage "02_Audio\Audio") -Recurse
Copy-Item "audio_csv\audio_mfcc_features.csv" (Join-Path $stage "02_Audio\audio_mfcc_features.csv")
if ($HuggingFacePath -and (Test-Path $HuggingFacePath)) {
  Copy-Item $HuggingFacePath (Join-Path $stage "04_Health_and_Synthetic\HuggingFace_engine_condition") -Recurse
} else {
  Write-Warning "Hugging Face dataset path was not provided. If you have downloaded it locally, rerun with -HuggingFacePath pointing to that folder."
}
if (Test-Path "audio_csv\audio_audit.csv") { Copy-Item "audio_csv\audio_audit.csv" (Join-Path $stage "02_Audio\audio_audit.csv") }
Copy-Item "data\vibration_raw" (Join-Path $stage "03_Vibration\vibration_raw") -Recurse
Copy-Item "data\vibration_features.csv" (Join-Path $stage "03_Vibration\vibration_features.csv")
foreach ($n in @("vibration_report_features.csv","vibration_report_features_v2.csv")) { if (Test-Path "data\$n") { Copy-Item "data\$n" (Join-Path $stage "03_Vibration\$n") } }
Copy-Item "data\synthetic_bearing_rul_demo.csv" (Join-Path $stage "04_Health_and_Synthetic\synthetic_bearing_rul_demo.csv")
Copy-Item "data\synthetic_bearing_rul_demo.metadata.json" (Join-Path $stage "04_Health_and_Synthetic\synthetic_bearing_rul_demo.metadata.json")
$manifest = @'
# Honeycomb — HackHive 2026 Dataset Manifest

## Engine telemetry
- Dataset: EngineFaultDB
- Source: https://github.com/leoxthomas/EngineFaultDB
- Research paper: https://doi.org/10.1109/ACCESS.2023.3331316
- File: `01_Telemetry/EngineFaultDB_Final.csv`
- Keep non-zero fault classes generic unless their mapping is verified against original source documentation.

## Acoustic audio
- Source project: AI Mechanic, https://github.com/faroukelfeky/Ai_Mechanic
- Files: class-organized raw audio in `02_Audio/Audio/` and derived MFCC features.
- Classes: Engine Issue, Non engine issue, Normal engine.
- Verify individual recording licences before redistributing third-party audio files.

## Vibration
- Source: Mendeley Data, https://data.mendeley.com/datasets/3fcrrdjjvk/5
- Files: local source recordings and derived feature CSVs in `03_Vibration/`.
- This is a separate bearing-condition dataset; it is not the EngineFaultDB engine-fault taxonomy.

## Additional engine-condition dataset
- Source: https://huggingface.co/datasets/dhani10/engine-condition-dataset
- Include the exact local files only if they were used in the hackathon workflow and are present in the package.
- This script does not invent or download an unspecified Hugging Face file.

## Synthetic bearing RUL data
- Files in `04_Health_and_Synthetic/` are synthetic scenario data and metadata, not real measured failure-life records.

## Scope and reproducibility
These are distinct datasets with different units, sampling schemes, labels and experimental settings. They are not synchronized measurements from one physical engine. Model metrics must be interpreted separately by dataset and evaluation protocol.

## Redistribution
Before transferring raw files, verify each source licence permits redistribution and include required attribution/licence text.
'@
Set-Content -Path (Join-Path $stage "05_Documentation\DATASET_MANIFEST.md") -Value $manifest -Encoding UTF8
$inventory = Get-ChildItem $stage -Recurse -File | Sort-Object FullName | ForEach-Object { $rel=$_.FullName.Substring($stage.Length+1); [PSCustomObject]@{path=$rel;size_bytes=$_.Length;sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash} }
$inventory | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $stage "05_Documentation\SHA256SUMS.csv")
if ($HuggingFacePath -and (Test-Path $HuggingFacePath)) {
  $hfTarget = Join-Path $stage "04_Health_and_Synthetic\HuggingFace_engine_condition"
  New-Item -ItemType Directory -Path $hfTarget -Force | Out-Null
  Get-ChildItem $HuggingFacePath -Force | Copy-Item -Destination $hfTarget -Recurse
}
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -CompressionLevel Optimal
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "`nSUCCESS: local dataset archive created." -ForegroundColor Green
Write-Host "Git push success: $pushSucceeded"
Write-Host "ZIP: $zipPath"
Write-Host "Size: $zipSize MB"
Write-Host "Next: upload this ZIP to Honeycomb\PS2 in the organizer OneDrive folder."