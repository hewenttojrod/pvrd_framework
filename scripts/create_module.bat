@REM Used for building a module for the framework. Sets things in the correct folders and adds any files the app needs to function


@echo off
setlocal enabledelayedexpansion

REM File: scripts/create_django_app.bat

if "%1"=="" (
    echo Error: App name is required
    echo Usage: create_django_app.bat ^<app_name^>
    exit /b 1
)

set "APP_NAME=%1"

REM Get project root (go up two directories from scripts folder)
for /d %%D in ("%~dp0..") do set "PROJECT_ROOT=%%~fD"

REM Create the module directory structure locally
set "MODULE_PATH=%PROJECT_ROOT%\modules\%APP_NAME%\server"
if not exist "%MODULE_PATH%" (
    mkdir "%MODULE_PATH%"
    echo Created: %MODULE_PATH%
)

REM Run startapp in the Django container
echo Creating Django app '%APP_NAME%' in container...
docker exec prvd_framework-api-1 bash -c "python manage.py startapp %APP_NAME% /modules/%APP_NAME%/server"

if %errorlevel% equ 0 (
    echo.
    echo Successfully created app: %MODULE_PATH%
    echo App files:
    for /f %%F in ('dir /b "%MODULE_PATH%"') do (
        echo   - %%F
    )
) else (
    echo Error creating app
    exit /b 1
)

endlocal