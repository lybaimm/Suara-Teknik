param([int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$php = Get-Command php -ErrorAction SilentlyContinue
if (!$php -and (Test-Path -LiteralPath 'C:\xampp\php\php.exe')) {
    $php = Get-Item -LiteralPath 'C:\xampp\php\php.exe'
}
if (!$php) { throw 'PHP tidak ditemukan. Pasang XAMPP atau tambahkan PHP ke PATH.' }
$phpPath = if ($php.Source) { $php.Source } else { $php.FullName }
New-Item -ItemType Directory -Path "$PSScriptRoot\.runtime\sessions" -Force | Out-Null
Write-Output "Suara Teknik: http://127.0.0.1:$Port/"
Write-Output 'MySQL/MariaDB harus aktif. Tekan Ctrl+C untuk menghentikan web.'
Push-Location $PSScriptRoot
try {
    & $phpPath -d "session.save_path=$PSScriptRoot\.runtime\sessions" -S "127.0.0.1:$Port" -t $PSScriptRoot "$PSScriptRoot\router.php"
} finally { Pop-Location }
