@echo off
REM Folio Docker Compose Deployment Script (Windows Batch)
REM Builds and deploys the full stack: Folio + Kavita + ABS + Caddy
REM
REM Usage:
REM   deploy.bat                    Deploy with ..\docker-compose.yml
REM   deploy.bat ..\docker-compose.yml   Custom compose path

REM Get the directory where this script is located and resolve ..\..\docker-compose.yml
set SCRIPT_DIR=%~dp0
set PARENT_DIR=%SCRIPT_DIR%..\..
for /f "tokens=*" %%a in ("%PARENT_DIR%") do set PARENT_DIR=%%~fa

set COMPOSE_FILE=%1
if "%COMPOSE_FILE%"=="" set COMPOSE_FILE=%PARENT_DIR%\docker-compose.yml

echo ========================================
echo Folio Docker Compose Deployment
echo ========================================
echo Compose file: %COMPOSE_FILE%
echo.

REM Verify compose file exists
if not exist "%COMPOSE_FILE%" (
    echo ERROR: Compose file not found: %COMPOSE_FILE%
    echo.
    echo Hint: Copy the template and customize:
    echo   cp docker-compose.caddy.template.yml ..\docker-compose.yml
    exit /b 1
)

echo [1/3] Building and starting services...
docker-compose -f "%COMPOSE_FILE%" up -d --build
if %errorlevel% neq 0 (
    echo docker-compose up failed!
    exit /b 1
)

echo.
echo [2/3] Checking service status...
timeout /t 3 >nul
docker-compose -f "%COMPOSE_FILE%" ps

echo.
echo [3/3] Testing endpoints...
curl -s -o nul -w "Folio: HTTP %%{http_code}\n" http://localhost/dynamic-proxy?url=http://example.com
curl -s -o nul -w "Kavita: HTTP %%{http_code}\n" http://localhost:8050/api/health
curl -s -o nul -w "ABS: HTTP %%{http_code}\n" http://localhost:13378/api/health

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo Folio:     http://localhost
echo Kavita:    http://localhost:8050
echo ABS:       http://localhost:13378
echo.
echo To view logs: docker-compose -f "%COMPOSE_FILE%" logs -f
echo To stop:     docker-compose -f "%COMPOSE_FILE%" down
echo ========================================
