@echo off
REM start-easy.bat - Wrapper para execução rápida no Windows (duplo clique)
setlocal
cd /d %~dp0
REM Passa todos argumentos para o script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-easy.ps1 %*
if errorlevel 1 (
  echo.
  echo (Aviso) Execucao retornou codigo %errorlevel%.
  pause
) else (
  echo.
  echo Ambiente iniciado (ver janelas abertas / logs). Feche esta janela se desejar.
  timeout /t 3 >nul
)
