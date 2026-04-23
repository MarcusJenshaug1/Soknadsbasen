# Stop all Node processes
Write-Host "Stopper alle Node-prosesser..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove old Prisma client
Write-Host "Sletter gammel Prisma-klient..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.prisma\client" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Generate new Prisma client
Write-Host "Genererer ny Prisma-klient med JobApplication-modeller..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Prisma-klient oppdatert!" -ForegroundColor Green
    Write-Host "`nStart dev-serveren igjen med:" -ForegroundColor Yellow
    Write-Host "  npm run dev`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Feil under generering. Prøv manuelt:" -ForegroundColor Red
    Write-Host "  1. Lukk VS Code helt" -ForegroundColor Yellow
    Write-Host "  2. Åpne på nytt" -ForegroundColor Yellow
    Write-Host "  3. Kjør: npx prisma generate" -ForegroundColor Yellow
    Write-Host "  4. Kjør: npm run dev`n" -ForegroundColor Yellow
}
