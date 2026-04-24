@echo off
call "%~dp0util/find_root.bat"
if errorlevel 1 exit /b 1

cd docker
docker-compose build --no-cache
docker-compose -f docker-compose.yaml up -d

if not errorlevel 1 call "%~dp0util/echo_started_containers.bat"