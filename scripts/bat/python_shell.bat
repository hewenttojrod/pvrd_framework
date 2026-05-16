@echo off
setlocal
set "THIS_DIR=%~dp0"
call "%THIS_DIR%run_sh_via_wsl.bat" "%THIS_DIR%..\python_shell.sh" %*
exit /b %errorlevel%