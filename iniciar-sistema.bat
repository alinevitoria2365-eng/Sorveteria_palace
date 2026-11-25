@echo off
chcp 65001 >nul
title Sorveteria Palace - PDV
cd /d "%~dp0"

echo ============================================
echo   Sorveteria Palace - Iniciando Sistema
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado no PATH.
    echo Instale o Node.js antes de iniciar o sistema.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [AVISO] Arquivo .env criado a partir de .env.example.
        echo         Confira a configuracao do PostgreSQL no .env se necessario.
        echo.
    )
)

echo [INFO] Iniciando backend (porta 3001) e frontend (porta 5173)...
echo [INFO] Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "for ($i=0; $i -lt 30; $i++) { try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1', 3001); $c.Close(); break } catch { Start-Sleep -Milliseconds 500 } }; Start-Process 'http://localhost:5173'"
call npm run dev

if errorlevel 1 (
    echo.
    echo [ERRO] O sistema foi encerrado com erro. Verifique as mensagens acima.
    pause
    exit /b 1
)
