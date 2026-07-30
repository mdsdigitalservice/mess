@echo off
setlocal
cd /d "%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=4321"
echo.
echo   Rogerio Mess DJ - servidor local
echo   http://localhost:%PORT%/
echo   (feche esta janela ou Ctrl+C para parar)
echo.
node serve.mjs %PORT%
echo.
echo   Servidor encerrado.
pause
