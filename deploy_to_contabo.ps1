$vps_ip = "109.199.99.126"
$vps_user = "root"
$dest_base = "/opt/crm-cannabis-next"

Write-Host "Copiando archivos del Frontend a Contabo..." -ForegroundColor Cyan

# Copiar page.tsx y BroadlinkPanel.tsx
scp ".\next-app\src\app\iot\devices\page.tsx" "${vps_user}@${vps_ip}:${dest_base}/src/app/iot/devices/page.tsx"
scp ".\next-app\src\app\iot\devices\BroadlinkPanel.tsx" "${vps_user}@${vps_ip}:${dest_base}/src/app/iot/devices/BroadlinkPanel.tsx"

# Crear carpeta de API y copiar route.ts
ssh "${vps_user}@${vps_ip}" "mkdir -p ${dest_base}/src/app/api/iot/mqtt_publish"
scp ".\next-app\src\app\api\iot\mqtt_publish\route.ts" "${vps_user}@${vps_ip}:${dest_base}/src/app/api/iot/mqtt_publish/route.ts"

Write-Host "Reconstruyendo la App en Contabo (esto puede tardar unos minutos)..." -ForegroundColor Cyan
ssh "${vps_user}@${vps_ip}" "cd ${dest_base} && npm run build && pm2 restart crm-frontend"

Write-Host "¡Despliegue a Producción Completado!" -ForegroundColor Green
