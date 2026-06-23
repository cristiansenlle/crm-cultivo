# 🚀 Plan Paso a Paso: Despliegue en Contabo (Cloud VPS 1)

Esta guía te llevará paso a paso para desplegar **toda tu infraestructura** (Frontend, Orquestador n8n y Bot de WhatsApp) en un servidor de Contabo (Plan Cloud VPS 1 por ~$5.50 USD/mes).

## ¿Soporta la app las especificaciones de Contabo?
**SÍ, TOTALMENTE Y SOBRADO.**
Tu app requiere principalmente memoria RAM debido a Chromium (para el bot de WhatsApp) y n8n.
- Requisito mínimo sugerido: 2GB a 3GB RAM.
- **Contabo Cloud VPS 1 ofrece: 6GB RAM y 4 vCPU.**
Te sobra el 50% de la máquina. Vas a poder correr el CRM de forma súper fluida y meterle 10 automatizaciones más si quisieras.

---

## FASE 1: Contratar el Servidor en Contabo

1. **Entrar a Contabo:** Ve a [contabo.com/en/vps/](https://contabo.com/en/vps/)
2. **Seleccionar el Plan:** Busca **"Cloud VPS 1"** y haz clic en "Select".
3. **Configurar las opciones:**
   - **Term Length (Duración):** Si eliges 1 mes, te cobrarán un "Setup Fee" (Cargo de instalación) por única vez de ~$6. Si eliges 12 meses, el Setup Fee es gratis.
   - **Region:** European Union (Gratis) o US East/Central (Cobran un extra de ~$1.5, pero hay menos latencia con Argentina). Elige según tu presupuesto.
   - **Storage Type:** **400 GB NVMe** (Recomendado porque es extremadamente más rápido que el SSD estándar).
   - **Image (OS):** Ubuntu 22.04 LTS o 24.04 LTS.
   - **Networking:** Deja lo predeterminado.
   - **Authentication:** Crea una contraseña fuerte para el usuario `root` y anotala.
4. **Comprar:** Completa tus datos y paga (Aceptan PayPal o Tarjeta de crédito, el proceso es mucho más simple que en Hetzner).

*Nota: Contabo a veces tarda algunas horas en mandarte el email de "Tu servidor está listo" porque arman y asignan la máquina de forma manual en horas pico. Tené paciencia.*

---

## FASE 2: Conectar y Preparar Paquetes

Una vez que te llega el email con la **IP de tu servidor**...

Abrí tu PowerShell local en Windows y conectate:
```powershell
ssh root@TU_IP_DE_CONTABO
# Ingresá la contraseña que elegiste en el paso 3.
```

Una vez adentro, copiá y pegá esto para instalar los motores de Chromium, Node y PM2:
```bash
# 1. Actualizar el sistema e instalar utilidades
apt update && apt upgrade -y
apt install -y chromium-browser ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils wget nginx git unzip tmux

# 2. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Instalar PM2, N8N y Serve globalmente
npm install -g pm2 n8n serve
```

---

## FASE 3: Subir tu Código al Servidor

En tu misma PowerShell local (abrí otra pestaña en tu PC, no en el servidor), ejecutá:
```powershell
scp "C:\Users\Cristian\.gemini\antigravity\crm_cannabis_backup_20260303_194203.zip" root@TU_IP_DE_CONTABO:/root/
```

Volvé a la terminal del servidor Contabo:
```bash
# Descomprimir la app
unzip /root/crm_cannabis_backup_20260303_194203.zip -d /opt/crm-cannabis

# Instalar los paquetes (Librerías del Bot)
cd /opt/crm-cannabis
npm install
```

---

## FASE 4: Iniciar N8N 24/7

En Contabo:
```bash
# Variables para que N8N pida usuario/contraseña
export N8N_HOST=TU_IP_DE_CONTABO
export WEBHOOK_URL=http://TU_IP_DE_CONTABO:5678/
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=admin
export N8N_BASIC_AUTH_PASSWORD=AdminSeguro123!

# Arrancar n8n
pm2 start "n8n start" --name "n8n-service" --interpreter bash
```
1. Desde tu navegador en la PC entrá a `http://TU_IP_DE_CONTABO:5678`.
2. Hacé **Import from File** y subí tu `n8n-crm-cannabis-workflow.json`.
3. Revisá las conexiones de credenciales (que groq, openai y openrouter estén conectadas).
4. Chequeá el nuevo **Production URL** del Webhook webhook-whatsappInbound.

---

## FASE 5: Arrancar el Bot de Wsp

Seguimos en Contabo `cd /opt/crm-cannabis`:

1. Editá el webhook interno, para que apunte a N8N:
   Buscá en `bot-wa.js` si tenías el `N8N_WEBHOOK_URL` local, ahora debés apuntar al de la IP nueva.
2. Iniciar el bot y Escanear QR:
```bash
node bot-wa.js
```
3. Escaneá con tu teléfono el QR de la consolta. Cuando se conecte, cerralo con `Ctrl + C`.
4. Dejalo definitivo en segundo plano:
```bash
pm2 start bot-wa.js --name "whatsapp-bot"
```

---

## FASE 6: Iniciar el Panel Web y Guardar Autoreinicio

En la misma carpeta para levantar el Frontend que programaste y consuma tu nueva base de Supabase:
```bash
pm2 start "serve -s . -l 3000" --name "crm-frontend"
```

**Guardar PM2 para que sobreviva a los reinicios del servidor:**
```bash
pm2 save
pm2 startup
# Te devolverá un comando gigante. ¡Copiá ese comando que te tira en pantalla, pegalo en la terminal y dale enter!
```

Escribiendo `pm2 status` verás la gloria: `n8n-service`, `whatsapp-bot` y `crm-frontend` todos diciendo **"online"**.
