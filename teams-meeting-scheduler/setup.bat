@echo off
echo ================================================
echo Teams Meeting Scheduler - Quick Setup
echo ================================================
echo.

echo [1/3] Installing meeting-joiner dependencies...
cd meeting-joiner
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install meeting-joiner dependencies
    pause
    exit /b 1
)

cd ..
echo [2/3] Installing Firebase functions dependencies...
cd functions
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install functions dependencies
    pause
    exit /b 1
)

cd ..
echo [3/3] Creating required directories...
if not exist "meeting-joiner\logs" mkdir "meeting-joiner\logs"

echo.
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Configure Firebase in web-dashboard/script.js
echo 2. Update CONFIG in meeting-joiner/local-joiner.js
echo 3. Open web-dashboard/index.html to start scheduling
echo.
echo For detailed instructions, see README.md
echo.
pause