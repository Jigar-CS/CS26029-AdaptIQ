@echo off
title CLIAS (AdaptIQ) Multi-Service Launcher
echo ===================================================
echo   Starting CLIAS (AdaptIQ) Platform Services...
echo ===================================================

:: 1. Start XAMPP MySQL on Port 3307
echo [1/4] Starting MySQL on Port 3307...
start "CLIAS 1 - MySQL (Port 3307)" cmd /k "color 0A && echo Starting MySQL on Port 3307... && \"C:\xampp\mysql\bin\mysqld.exe\" --defaults-file=\"C:\xampp\mysql\bin\my.ini\" --console"

:: Wait 3 seconds for database to initialize
timeout /t 3 /nobreak >nul

:: 2. Start FastAPI AI Microservice on Port 8000
echo [2/4] Starting FastAPI AI Service on Port 8000...
start "CLIAS 2 - FastAPI AI Service (Port 8000)" cmd /k "color 0B && cd /d \"%~dp0apps\ai\" && echo Starting FastAPI Microservice... && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: 3. Start NestJS Backend API on Port 4000
echo [3/4] Starting NestJS Backend API on Port 4000...
start "CLIAS 3 - NestJS API (Port 4000)" cmd /k "color 0E && cd /d \"%~dp0apps\api\" && echo Starting NestJS API... && npm run dev"

:: 4. Start Next.js Frontend on Port 3000
echo [4/4] Starting Next.js Web Frontend on Port 3000...
start "CLIAS 4 - Next.js Web (Port 3000)" cmd /k "color 0D && cd /d \"%~dp0apps\web\" && echo Starting Next.js Frontend... && npm run dev"

echo ===================================================
echo   All 4 services launched in separate windows!
echo   - Web Frontend:  http://localhost:3000
echo   - NestJS API:    http://localhost:4000/api/v1
echo   - AI Service:    http://localhost:8000
echo   - MySQL DB:      localhost:3307 (clias_db)
echo ===================================================
timeout /t 5
