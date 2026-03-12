@echo off
setlocal
call npm.cmd install
if errorlevel 1 exit /b %errorlevel%
pushd client
call npm.cmd install
set ERR=%errorlevel%
popd
exit /b %ERR%
