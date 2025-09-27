@echo off
echo ================================================================
echo 🤖 Teams Meeting Automation Scheduler
echo ================================================================
echo Starting background automation...
echo.
cd /d "%~dp0"
if not exist "user-credentials.json" (
    echo ❌ ERROR: user-credentials.json not found!
    echo Please make sure you've downloaded and placed the credentials file in this folder.
    echo.
    pause
    exit
)
echo ✅ Credentials file found
echo ⏰ Monitoring scheduled meetings every 30 seconds
echo 🎯 Will automatically join meetings at their scheduled time
echo.
echo Press Ctrl+C to stop the automation
echo ================================================================
node local-joiner.js schedule
echo.
echo Automation stopped.
pause