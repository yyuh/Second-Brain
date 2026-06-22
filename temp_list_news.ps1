$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
$files = Get-ChildItem -Path "C:\Users\18480\Desktop\second-brain\wiki\news\" -Filter "*.md" | Sort-Object Name -Descending | Select-Object -First 8
foreach ($f in $files) {
    Write-Host ($f.Name)
}
