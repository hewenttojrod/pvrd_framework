@echo off
setlocal EnableExtensions EnableDelayedExpansion

call "%~dp0util/find_root.bat"
if errorlevel 1 exit /b 1

set "COMPOSE_FILE=%ROOT_DIR%\docker\docker-compose.yaml"
set "WORKSPACE_DIR=%ROOT_DIR%\modules"
set "API_CONTAINER="
set "APP_COUNT=0"
set "SELECTED_APPS="
set "MIGRATE_ALL="

if not exist "%WORKSPACE_DIR%" (
    echo [ERROR] Workspace directory not found: "%WORKSPACE_DIR%"
    exit /b 1
)

for /d %%D in ("%WORKSPACE_DIR%\*") do (
    if exist "%%~fD\server\apps.py" (
        set /a APP_COUNT+=1
        set "APP[!APP_COUNT!]=%%~nxD"
    )
)

if !APP_COUNT! EQU 0 (
    echo [ERROR] No Django module apps were found under "%WORKSPACE_DIR%".
    popd
    exit /b 1
)

if "%~1"=="" (
    call :prompt_for_selection
) else (
    call :collect_from_args %*
)

if errorlevel 1 (
    popd
    exit /b 1
)

for /f "usebackq tokens=*" %%I in (`docker compose -f "%COMPOSE_FILE%" ps -q api 2^>nul`) do set "API_CONTAINER=%%I"

if defined MIGRATE_ALL (
    echo [INFO] Running makemigrations for all apps...
    call :run_manage makemigrations
    if errorlevel 1 goto :fail

    echo [INFO] Running migrate for all apps...
    call :run_manage migrate
    if errorlevel 1 goto :fail

    goto :success
)

echo [INFO] Selected apps: !SELECTED_APPS!
for %%A in (!SELECTED_APPS!) do (
    echo [INFO] Running makemigrations for %%A...
    call :run_manage makemigrations %%A
    if errorlevel 1 goto :fail
)

for %%A in (!SELECTED_APPS!) do (
    echo [INFO] Running migrate for %%A...
    call :run_manage migrate %%A
    if errorlevel 1 goto :fail
)

goto :success

:prompt_for_selection
echo Available apps for migrations:
for /l %%I in (1,1,!APP_COUNT!) do echo   %%I. !APP[%%I]!
echo   A. all
echo   Q. quit
set /p "USER_SELECTION=Choose app numbers or names separated by spaces or commas: "

if not defined USER_SELECTION (
    echo [ERROR] No selection provided.
    exit /b 1
)

if /i "%USER_SELECTION%"=="Q" (
    echo [INFO] Migration cancelled.
    exit /b 1
)

call :collect_tokens "%USER_SELECTION%"
exit /b %errorlevel%

:collect_from_args
set "ARG_SELECTION=%*"
call :collect_tokens "%ARG_SELECTION%"
exit /b %errorlevel%

:collect_tokens
set "TOKEN_LIST=%~1"
set "TOKEN_LIST=%TOKEN_LIST:,= %"

for %%T in (%TOKEN_LIST%) do (
    call :resolve_token "%%~T"
    if errorlevel 1 exit /b 1
)

if not defined MIGRATE_ALL if not defined SELECTED_APPS (
    echo [ERROR] No valid apps were selected.
    exit /b 1
)

exit /b 0

:resolve_token
set "TOKEN=%~1"
if not defined TOKEN exit /b 0

if /i "%TOKEN%"=="all" (
    set "MIGRATE_ALL=1"
    set "SELECTED_APPS="
    exit /b 0
)

if /i "%TOKEN%"=="a" (
    set "MIGRATE_ALL=1"
    set "SELECTED_APPS="
    exit /b 0
)

set "APP_NAME="
2>nul set /a TOKEN_NUM=%TOKEN%
if not errorlevel 1 if "%TOKEN_NUM%"=="%TOKEN%" (
    call set "APP_NAME=%%APP[%TOKEN_NUM%]%%"
)

if not defined APP_NAME (
    for /l %%I in (1,1,!APP_COUNT!) do (
        if /i "!APP[%%I]!"=="%TOKEN%" set "APP_NAME=!APP[%%I]!"
    )
)

if not defined APP_NAME (
    echo [ERROR] Unknown app selection: %TOKEN%
    exit /b 1
)

call :add_selected "%APP_NAME%"
exit /b 0

:add_selected
set "APP_NAME=%~1"
if defined MIGRATE_ALL exit /b 0

for %%A in (!SELECTED_APPS!) do (
    if /i "%%~A"=="%APP_NAME%" exit /b 0
)

if defined SELECTED_APPS (
    set "SELECTED_APPS=!SELECTED_APPS! %APP_NAME%"
) else (
    set "SELECTED_APPS=%APP_NAME%"
)
exit /b 0

:run_manage
if defined API_CONTAINER (
    docker compose -f "%COMPOSE_FILE%" exec -T api python manage.py %*
) else (
    docker compose -f "%COMPOSE_FILE%" run --rm api python manage.py %*
)
exit /b %errorlevel%

:fail
echo [ERROR] Migration command failed.
exit /b 1

:success
echo [SUCCESS] Migration commands completed.
exit /b 0
