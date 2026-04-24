@echo off
REM Script to open a Python terminal inside the Docker API container

call "%~dp0util/find_root.bat"
if errorlevel 1 exit /b 1

setlocal enabledelayedexpansion

REM List running containers
echo Available running containers:
docker ps --format "{{.Names}}"
echo.

REM Try to find the API container
for /f "delims=" %%A in ('docker ps --format "{{.Names}}"') do (
    if "%%A"=="prvd_framework-api-1" (
        set "CONTAINER_NAME=%%A"
    ) else if "%%A"=="api" (
        set "CONTAINER_NAME=%%A"
    )
)

if not defined CONTAINER_NAME (
    echo Error: Could not find API container.
    echo Expected: prvd_framework-api-1 or api
    exit /b 1
)

REM Open Python shell in the container
echo.
echo Opening Python shell in container '%CONTAINER_NAME%'...
docker exec -it %CONTAINER_NAME% python manage.py shell

endlocal
pause
