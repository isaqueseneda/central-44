@echo off
chcp 65001 >nul
title Central 44 - Atualizar
color 1F

cd /d "%~dp0.."

echo.
echo   =========================================================
echo      CENTRAL 44 - ATUALIZACAO AUTOMATICA
echo   =========================================================
echo.
echo   Este processo vai baixar as novidades mais recentes
echo   e preparar o Central 44 para rodar.
echo.
echo   Pode demorar alguns minutos. E normal.
echo   Nao feche esta janela ate ver a mensagem de sucesso.
echo.
echo   =========================================================
echo.
timeout /t 3 /nobreak >nul

:: --- Check Git ---
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [ X ] O Git nao esta instalado neste computador.
    echo         Sem ele nao da pra buscar as atualizacoes.
    echo         Chame o Isaque para instalar.
    echo.
    pause
    exit /b 1
)

:: --- Step 1/5: stop the server if running ---
echo   [1 de 5] Desligando o Central 44 (caso esteja aberto)...
echo           Isso evita conflitos enquanto atualizamos.
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo           Pronto.
echo.

:: --- Step 2/5: backup ---
echo   [2 de 5] Fazendo um backup do banco de dados...
echo           Assim, se algo der errado, nada se perde.
call launcher\backup.bat
echo           Backup salvo em backups\.
echo.

:: --- Step 3/5: pull from GitHub ---
echo   [3 de 5] Baixando as novidades do GitHub...
echo           Qualquer alteracao local e descartada para
echo           garantir que o app fique igual ao do Isaque.
git checkout -- . >nul 2>&1
git clean -fd >nul 2>&1
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo   [ X ] Nao consegui baixar as atualizacoes.
    echo         Verifique se a internet esta funcionando
    echo         e tente de novo. Se continuar errando,
    echo         chame o Isaque.
    echo.
    pause
    exit /b 1
)
echo           Codigo atualizado.
echo.

:: --- Step 4/5: dependencies + database client ---
echo   [4 de 5] Instalando/atualizando as pecas necessarias...
echo           (dependencias do Node e cliente do banco)
echo           Isso pode demorar um pouco na primeira vez.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo   [ X ] Falha ao instalar as dependencias.
    echo         Chame o Isaque para ajudar.
    echo.
    pause
    exit /b 1
)
call npx prisma generate >nul 2>&1
echo           Pecas atualizadas.
echo.

:: --- Step 5/5: rebuild ---
echo   [5 de 5] Montando a nova versao do Central 44...
echo           Essa e a parte mais lenta. Respira fundo.
if exist ".next" rmdir /s /q ".next"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo   [ X ] Falha ao montar a nova versao.
    echo         A atualizacao nao foi concluida.
    echo         Chame o Isaque para ajudar.
    echo.
    pause
    exit /b 1
)
echo           Versao nova montada com sucesso.
echo.

echo   =========================================================
echo      ATUALIZACAO CONCLUIDA COM SUCESSO!
echo   =========================================================
echo.
echo   Tudo certo. Agora e so fechar esta janela e clicar em
echo   "Central 44" na area de trabalho para abrir o sistema.
echo.
echo   (Dica: a atualizacao NAO liga o sistema sozinha.
echo    Isso e de proposito, para voce escolher quando abrir.)
echo.
echo   =========================================================
echo.
pause
