@echo off
setlocal EnableExtensions

if "%~1"=="" (
    echo Usage: run_sh_via_wsl.bat ^<absolute_or_relative_sh_path^> [args...]
    exit /b 1
)

where wsl >nul 2>nul
if errorlevel 1 (
    echo Error: WSL is not available on this system.
    exit /b 1
)

set "TARGET_SH=%~1"
shift

for %%I in ("%TARGET_SH%") do set "TARGET_SH_ABS=%%~fI"

if not exist "%TARGET_SH_ABS%" (
    echo Error: Script not found: "%TARGET_SH_ABS%"
    exit /b 1
)

for /f "delims=" %%I in ('wsl wslpath -a "%TARGET_SH_ABS%"') do set "TARGET_WSL=%%I"

if not defined TARGET_WSL (
    echo Error: Could not translate Windows path to WSL path.
    exit /b 1
)

wsl bash "%TARGET_WSL%" %*
exit /b %errorlevel%