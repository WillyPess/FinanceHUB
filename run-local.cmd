@echo off
setlocal

for %%P in (3001 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    taskkill /PID %%I /F >nul 2>&1
  )
)

call npm.cmd run dev
