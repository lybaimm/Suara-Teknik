param([int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$php = Get-Command php -ErrorAction SilentlyContinue
if (!$php -and (Test-Path -LiteralPath 'C:\xampp\php\php.exe')) {
    $php = Get-Item -LiteralPath 'C:\xampp\php\php.exe'
}
if (!$php) { throw 'PHP tidak ditemukan. Pasang XAMPP atau tambahkan PHP ke PATH.' }
$phpPath = if ($php.Source) { $php.Source } else { $php.FullName }
New-Item -ItemType Directory -Path "$PSScriptRoot\.runtime\sessions" -Force | Out-Null
New-Item -ItemType Directory -Path "$PSScriptRoot\.runtime\tmp" -Force | Out-Null
Write-Output "Suara Teknik: http://127.0.0.1:$Port/"
Write-Output 'MySQL/MariaDB harus aktif. Tekan Ctrl+C untuk menghentikan web.'
Push-Location $PSScriptRoot
try {
    & $phpPath -d display_errors=0 -d log_errors=1 -d "sys_temp_dir=$PSScriptRoot\.runtime\tmp" -d "upload_tmp_dir=$PSScriptRoot\.runtime\tmp" -d "session.save_path=$PSScriptRoot\.runtime\sessions" -S "127.0.0.1:$Port" -t $PSScriptRoot "$PSScriptRoot\router.php"
} finally { Pop-Location }
