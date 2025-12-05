@echo off
REM Script para ejecutar la aplicación con ngrok en Windows

echo 🚀 Iniciando Avatar con Ngrok...
echo.

REM Verificar que las variables de entorno estén configuradas
if "%DID_API_KEY%"=="" (
  echo ⚠️  ADVERTENCIA: DID_API_KEY no está configurada
  echo    Configúrala con: set DID_API_KEY=tu_email@ejemplo.com:tu_api_key
)

if "%OPENROUTER_API_KEY%"=="" (
  echo ⚠️  ADVERTENCIA: OPENROUTER_API_KEY no está configurada
  echo    Configúrala con: set OPENROUTER_API_KEY=sk-or-v1-tu_api_key
)

if "%NGROK_AUTHTOKEN%"=="" (
  echo ⚠️  ADVERTENCIA: NGROK_AUTHTOKEN no está configurada
  echo    Configúrala con: set NGROK_AUTHTOKEN=tu_ngrok_token
)

echo.
echo 🔧 Construyendo imagen Docker...
docker-compose build

echo.
echo 🚀 Iniciando contenedor...
docker-compose up -d

echo.
echo ⏳ Esperando a que el contenedor esté listo...
timeout /t 10 /nobreak >nul

echo.
echo 📋 Logs del contenedor (últimas 30 líneas):
docker-compose logs --tail 30

echo.
echo ✅ Aplicación iniciada!
echo.
echo 📊 Para ver los logs en tiempo real:
echo    docker-compose logs -f
echo.
echo 🌐 Para ver la URL de ngrok:
echo    docker-compose logs ^| findstr "Ngrok URL"
echo.
echo 🛑 Para detener:
echo    docker-compose down

pause

