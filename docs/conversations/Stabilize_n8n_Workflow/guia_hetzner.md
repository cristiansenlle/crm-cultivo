# 🚀 Plan Paso a Paso: Despliegue en Hetzner Cloud

Esta guía está diseñada para desplegar **toda tu infraestructura** (Frontend, Orquestador n8n y Bot de WhatsApp) en un único servidor de Hetzner Cloud por ~$5 USD/mes.

---

## FASE 1: Contratar y Preparar el Servidor en Hetzner

1. **Crear Cuenta:** Entrá a [hetzner.com/cloud](https://www.hetzner.com/cloud) y registrate. (Te pueden pedir validar identidad con DNI/Pasaporte o tarjeta de crédito).
2. **Crear Proyecto:** En el dashboard de Cloud, creá un proyecto nuevo (ej. "CRM Cannabis").
3. **Agregar Servidor (Add Server):**
   - **Location:** Ashburn, VA (Para mejor latencia con Latinoamérica).
   - **Image (OS):** Ubuntu 22.04 LTS o 24.04 LTS.
   - **Type:** Elegí la pestaña **ARM64**. El plan **CAX11** (Ampere Altra, 2 vCPU, 4GB RAM) cuesta unos €4.50/mes y es ideal. Si preferís la arquitectura estándar, andá a la pestaña **x86** y elegí **CX21** (2 vCPU, 4GB RAM por €5.35/mes). Cualquiera de los dos sirve perfecto.
   - **Networking:** IPv4 & IPv6 (dejá lo predeterminado).
   - **SSH Key:** Agregá tu clave pública SSH si sabés usarla, o recibí la contraseña por correo electrónico.
   - **Name:** `crm-server` (o como prefieras) y dale a **"Create & Buy Now"**.

---

## FASE 2: Conexión y Paquetes Base

Hetzner te enviará un email con la IP de tu servidor y tu contraseña root.

Abrí tu terminal o PowerShell y conectate:
```bash
ssh root@TU_IP_DE_HETZNER
# Te pedirá la contraseña del correo y luego te obligará a crear una nueva contraseña.
```

Una vez adentro, instalamos las bases (Node.js, Nginx, Git, PM2 y utilidades para el bot):
```bash
# 1. Actualizar el sistema
apt update && apt upgrade -y

# 2. Instalar dependencias esenciales para WhatsApp Web JS (Chromium)
apt install -y chromium-browser ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils wget nginx git

# 3. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Instalar PM2 (gestor de procesos) y n8n global
npm install -g pm2 n8n serve
```

---

## FASE 3: Subir tu Código al Servidor

Tenés que subir la carpeta `crm cannabis` (sin `node_modules` ni tu auth local) al VPS.

En tu PowerShell local (en tu PC), ejecutá:
```powershell
# Subir el ZIP del backup que hicimos antes, directamente a la carpeta root de Hetzner
scp "C:\Users\Cristian\.gemini\antigravity\crm_cannabis_backup_20260303_194203.zip" root@TU_IP_DE_HETZNER:/root/
```

Volvé a la terminal del servidor Hetzner:
```bash
# Descomprimir la app
apt install unzip -y
unzip crm_cannabis_backup_20260303_194203.zip -d /opt/crm-cannabis

# Instalar los paquetes del bot
cd /opt/crm-cannabis
npm install
```

---

## FASE 4: Configurar N8N en el Servidor (El Cerebro)

1. Crear un script de inicio para que N8N corra 24/7 en el puerto 5678:
```bash
# Variables de entorno para n8n (reemplazá la IP o Dominio y usuario/pass)
export N8N_HOST=TU_IP_DE_HETZNER
export WEBHOOK_URL=http://TU_IP_DE_HETZNER:5678/
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=admin
export N8N_BASIC_AUTH_PASSWORD=AdminSeguro123!

# Arrancar n8n en el fondo con PM2
pm2 start "n8n start" --name "n8n-service" --interpreter bash
```
2. Entrá desde el navegador en tu PC a: `http://TU_IP_DE_HETZNER:5678`
3. Ingresá con las credenciales que pusiste arriba.
4. Hacé click en **Import from File** y subí tu archivo `n8n-crm-cannabis-workflow.json` (asegurate de activar el switch superior del workflow).
5. **Dato vital:** Ahora que n8n esta en internet, la URL de tu Webhook Inbound cambia (por ejemplo `http://TU_IP_HETZNER:5678/webhook/whatsapp-inbound`). Copiala temporalmente, la necesitaremos para el bot.

---

## FASE 5: Configurar y Arrancar el Bot de WhatsApp

Dentro del servidor, en la carpeta `/opt/crm-cannabis`:

1. Edita el código o usá variables de entorno para apuntar al nuevo webhook de n8n.
Si en `bot-wa.js` tenés la URL *"http://localhost:5678/webhook/whatsapp-inbound"*, tenés que asegurarte de que ahora apunte al Webhook real del n8n que levantaste recién.
*(Como ambas cosas corren en Hetzner, podés dejar localhost si funciona, pero es más seguro poner `http://127.0.0.1:5678/webhook/123...`).*

2. Lanzá el bot por primera vez para Escanear el QR:
```bash
node bot-wa.js
```
3. **Escaneá el QR** que aparece en la terminal de Hetzner con tu celular como Dispositivo Vinculado.
4. Cuando veas que dice "Cliente listo", cancelalo apretando `Ctrl + C`.
5. Ahora sí, ponelo a correr de fondo para siempre con PM2:
```bash
pm2 start bot-wa.js --name "whatsapp-bot"
```

---

## FASE 6: Configurar el Frontend Web (El Panel CRM)

Todo el código HTML y JS de tu frontend ya está dentro de `/opt/crm-cannabis`.
Vamos a usar `serve` para mantenerlo vivo y PM2 para correrlo de fondo:

```bash
cd /opt/crm-cannabis
pm2 start "serve -s . -l 3000" --name "crm-frontend"
```

---

## FASE 7: NGINX para enrutar puertos 80 al dominio (Opcional pero Recomendado)

Tener todo en puertos 3000 y 5678 no es lindo ni seguro para clientes.
Si comprás un dominio web (ej. `mi-cannabis.com`):
Configurás los DNS tipo "A" para que apunten a la IP de Hetzner.

Luego en tu servidor Hetzner:
```bash
nano /etc/nginx/sites-available/crm
```
Pegá esto dentro:
```nginx
server {
    listen 80;
    server_name mi-cannabis.com;

    # El Frontend 
    location / {
        proxy_pass http://localhost:3000;
    }
}

server {
    listen 80;
    server_name api.mi-cannabis.com;

    # N8N Orquestador
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Apretás `Ctrl+O` y Enter para guardar, `Ctrl+X` para salir.

Habilitamos la ruta:
```bash
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## FASE 8: Guardar los Servicios

Para que ante cada reinicio de Hetzner (ejemplo: corte de luz en el data center) tus bots se prendan solos:
```bash
pm2 save
pm2 startup
# (ejecutá el comando exacto que te responda PM2 startup en pantalla)
```

## Resumen Final de lo que tendrás corriendo:
Tecleando `pm2 status` verás esto:
1. `n8n-service` (Motor de IA procesando).
2. `whatsapp-bot` (Escuchando todos los chats).
3. `crm-frontend` (Mostrando la página del CRM al público).

Todo alojado en **1 servidor, por 5 dólares, sincronizado con la base de datos de Supabase**, y con auto-reinicio si algo falla.
