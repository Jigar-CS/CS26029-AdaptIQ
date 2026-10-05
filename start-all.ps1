# CLIAS Multi-Service PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting CLIAS Platform Services...  " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. MySQL on Port 3307
Write-Host "[1/4] Starting MySQL on Port 3307..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'CLIAS: MySQL 3307' -ForegroundColor Green; & 'C:\xampp\mysql\bin\mysqld.exe' --defaults-file='C:\xampp\mysql\bin\my.ini' --console"

Start-Sleep -Seconds 3

# 2. FastAPI AI Service on Port 8000
Write-Host "[2/4] Starting FastAPI AI Service on Port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\ai'; Write-Host 'CLIAS: FastAPI AI Service (Port 8000)' -ForegroundColor Cyan; python -m uvicorn main:app --host 0.0.0.0 --port 8000"

# 3. NestJS API on Port 4000
Write-Host "[3/4] Starting NestJS Backend API on Port 4000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\api'; Write-Host 'CLIAS: NestJS API (Port 4000)' -ForegroundColor Yellow; npm run dev"

# 4. Next.js Web on Port 3000
Write-Host "[4/4] Starting Next.js Frontend on Port 3000..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\apps\web'; Write-Host 'CLIAS: Next.js Frontend (Port 3000)' -ForegroundColor Magenta; npm run dev"

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  All 4 services successfully launched!            " -ForegroundColor Green
Write-Host "  - Web App:      http://localhost:3000            " -ForegroundColor White
Write-Host "  - NestJS API:   http://localhost:4000/api/v1     " -ForegroundColor White
Write-Host "  - AI Service:   http://localhost:8000            " -ForegroundColor White
Write-Host "  - Database:     localhost:3307 (clias_db)        " -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
