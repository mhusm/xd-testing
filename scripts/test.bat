bash scripts/test.sh
REM store return code
set return=%errorlevel%
call scripts\kill_applications.bat > kill.log
exit /B %return%
