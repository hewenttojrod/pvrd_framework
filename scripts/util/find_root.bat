@echo off
setlocal enabledelayedexpansion

REM Find pvrd_framework root directory
set "current_dir=%cd%"
set "root_dir="

REM Check if we're already in pvrd_framework
if exist "%current_dir%\docker\docker-compose.yaml" (
    set "root_dir=%current_dir%"
    goto :found
)

REM Search up the directory tree
set "search_dir=%current_dir%"
:search_loop
if "%search_dir%"=="" goto :not_found
if exist "%search_dir%\docker\docker-compose.yaml" (
    set "root_dir=%search_dir%"
    goto :found
)

REM Move up one directory
for /f "delims=" %%A in ('cd /d "%search_dir%\.." ^& cd') do set "search_dir=%%A"
if "%search_dir%"==%root_dir% goto :not_found
goto :search_loop

:not_found
echo Error: Could not find pvrd_framework folder!
exit /b 1

:found
cd /d "%root_dir%"
endlocal & set ROOT_DIR=%root_dir%