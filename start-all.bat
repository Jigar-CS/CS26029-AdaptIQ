@echo off
title CLIAS Multi-Service Launcher
echo ===================================================
echo   Starting CLIAS Platform Services...
echo ===================================================

:: 1. Check & Start XAMPP MySQL on Port 3307
netstat -ano | findstr :3307 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/4] MySQL is ALREADY RUNNING on Port 3307. Reusing active instance!
) else (
    echo [1/4] Starting MySQL on Port 3307...
    start "CLIAS 1 - MySQL (Port 3307)" cmd /k "color 0A && echo Starting MySQL on Port 3307... && C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --console"
    timeout /t 3 /nobreak >nul
)

:: 2. Check & Start FastAPI AI Microservice on Port 8000
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/4] FastAPI AI Service is ALREADY RUNNING on Port 8000. Reusing active instance.
) else (
    echo [2/4] Starting FastAPI AI Service on Port 8000...
    start "CLIAS 2 - FastAPI AI Service (Port 8000)" /d "%~dp0apps\ai" cmd /k "color 0B && echo Starting FastAPI Microservice... && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
)

:: 3. Check & Start NestJS Backend API on Port 4000
netstat -ano | findstr :4000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [3/4] NestJS Backend API is ALREADY RUNNING on Port 4000. Reusing active instance.
) else (
    echo [3/4] Starting NestJS Backend API on Port 4000...
    start "CLIAS 3 - NestJS API (Port 4000)" /d "%~dp0apps\api" cmd /k "color 0E && echo Starting NestJS API... && npm run dev"
)

:: 4. Check & Start Next.js Frontend on Port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [4/4] Next.js Web Frontend is ALREADY RUNNING on Port 3000. Reusing active instance.
) else (
    echo [4/4] Starting Next.js Web Frontend on Port 3000...
    start "CLIAS 4 - Next.js Web (Port 3000)" /d "%~dp0apps\web" cmd /k "color 0D && echo Starting Next.js Frontend... && npm run dev"
)

echo ===================================================
echo   All 4 services active!
echo   - Web Frontend:  http://localhost:3000
echo   - NestJS API:    http://localhost:4000/api/v1
echo   - AI Service:    http://localhost:8000
echo   - MySQL DB:      localhost:3307 (clias_db)
echo ===================================================
ping 127.0.0.1 -n 6 >nul
