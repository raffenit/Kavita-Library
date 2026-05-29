#!/usr/bin/env pwsh
# Folio Docker Compose Deployment Script
# Builds and deploys the full stack: Folio + Kavita + ABS + Caddy
#
# Usage:
#   .\deploy.ps1                    # Deploy with ..\docker-compose.yml
#   .\deploy.ps1 -File ..\docker-compose.yml   # Custom compose path

param(
    [string]$File = "",
    [switch]$Pull = $false,
    [switch]$Down = $false
)

# Resolve default path relative to script location (scripts/ is one level deeper)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($File)) {
    $File = [System.IO.Path]::GetFullPath((Join-Path $scriptDir "..\..\docker-compose.yml"))
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Folio Docker Compose Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Compose file: $File" -ForegroundColor Gray

# Verify compose file exists
if (-not (Test-Path $File)) {
    Write-Error "Compose file not found: $File"
    Write-Host "`nHint: Copy the template and customize:" -ForegroundColor Yellow
    Write-Host "  cp docker-compose.caddy.template.yml ..\docker-compose.yml" -ForegroundColor Yellow
    exit 1
}

# Stop existing stack if requested
if ($Down) {
    Write-Host "`n[1/3] Stopping existing stack..." -ForegroundColor Yellow
    docker-compose -f $File down
}

# Pull latest images if requested
if ($Pull) {
    Write-Host "`n[1/3] Pulling latest images..." -ForegroundColor Yellow
    docker-compose -f $File pull
}

# Build and start
Write-Host "`n[1/3] Building and starting services..." -ForegroundColor Yellow
docker-compose -f $File up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker-compose up failed!"
    exit 1
}

# Health check
Write-Host "`n[2/3] Checking service status..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$services = docker-compose -f $File ps --format "table {{.Name}}`t{{.Status}}`t{{.Ports}}"
Write-Host $services

# Test endpoints
Write-Host "`n[3/3] Testing endpoints..." -ForegroundColor Yellow
$endpoints = @(
    @{ Name = "Folio"; Url = "http://localhost/dynamic-proxy?url=http://example.com" },
    @{ Name = "Kavita"; Url = "http://localhost:8050/api/health" },
    @{ Name = "ABS"; Url = "http://localhost:13378/api/health" }
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $ep.Url -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "  $($ep.Name): OK (HTTP $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  $($ep.Name): Not ready yet (expected during startup)" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Folio:     http://localhost" -ForegroundColor Cyan
Write-Host "Kavita:    http://localhost:8050" -ForegroundColor Cyan
Write-Host "ABS:       http://localhost:13378" -ForegroundColor Cyan
Write-Host "`nTo view logs: docker-compose -f $File logs -f" -ForegroundColor Gray
Write-Host "To stop:     docker-compose -f $File down" -ForegroundColor Gray
