# Telegram MiniApp Setup Guide

Telegram MiniApps require HTTPS URLs to work. This guide covers two approaches:
1. **Free/Testing** - Using ngrok (no domain, no SSL purchase needed)
2. **Production** - Using a real domain with SSL

---

## Option 1: Free Testing with ngrok (Recommended for Development)

### What you need:
- ngrok account (free tier works)
- Docker running locally

### Steps:

#### 1. Install ngrok
```bash
# macOS
brew install ngrok

# or download from https://ngrok.com/download
```

#### 2. Sign up and authenticate
```bash
# Create free account at https://ngrok.com
# Then authenticate:
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### 3. Start the MiniApp service
```bash
docker-compose up -d frontend-miniapp
```

#### 4. Create ngrok tunnel
```bash
# The frontend-miniapp runs on port 3000 by default
ngrok http 3000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

#### 5. Update .env file
```env
MINIAPP_URL=https://abc123.ngrok-free.app
```

#### 6. Restart main-bot to apply changes
```bash
docker-compose restart main-bot
```

#### 7. Configure BotFather
1. Open @BotFather in Telegram
2. Send `/mybots` → Select your bot → `Bot Settings` → `Menu Button`
3. Or use `/setmenubutton` and set the URL to your ngrok URL

### ⚠️ ngrok Limitations:
- Free tier: URL changes every restart (need to update .env each time)
- Paid tier ($8/month): Get a static subdomain like `yourbot.ngrok.io`

---

## Option 2: Production Setup with Real Domain

### What you need:
- Domain name (~$10-15/year from Namecheap, Cloudflare, etc.)
- VPS/Server with public IP (or use Cloudflare Tunnel for free)
- SSL certificate (free with Let's Encrypt)

### Option 2A: VPS + Let's Encrypt (Cheapest Production)

#### 1. Get a domain
- Namecheap: ~$10/year for .com
- Cloudflare Registrar: at-cost pricing
- Freenom: Free .tk/.ml domains (less reliable)

#### 2. Point domain to your server
Add an A record:
```
Type: A
Name: miniapp (or @ for root)
Value: YOUR_SERVER_IP
TTL: Auto
```

#### 3. Install Certbot and get free SSL
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d miniapp.yourdomain.com
```

#### 4. Configure nginx
```nginx
server {
    listen 443 ssl;
    server_name miniapp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/miniapp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/miniapp.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. Update .env
```env
MINIAPP_URL=https://miniapp.yourdomain.com
```

### Option 2B: Cloudflare Tunnel (Free, No VPS Needed)

If you're running locally but want a permanent URL:

#### 1. Install cloudflared
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
```

#### 2. Login and create tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create miniapp-bot
```

#### 3. Configure tunnel
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: miniapp.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

#### 4. Add DNS record
```bash
cloudflared tunnel route dns miniapp-bot miniapp.yourdomain.com
```

#### 5. Run tunnel
```bash
cloudflared tunnel run miniapp-bot
```

---

## Quick Comparison

| Feature | ngrok (Free) | ngrok (Paid) | Domain + Let's Encrypt | Cloudflare Tunnel |
|---------|--------------|--------------|------------------------|-------------------|
| Cost | $0 | $8/month | ~$10/year (domain) | $0 (need domain) |
| Static URL | ❌ | ✅ | ✅ | ✅ |
| Setup Time | 5 min | 5 min | 30 min | 15 min |
| Reliability | Good | Great | Great | Great |
| Best For | Quick testing | Ongoing dev | Production | Production (local) |

---

## Troubleshooting

### MiniApp button doesn't respond
1. Check that MINIAPP_URL in .env starts with `https://`
2. Restart main-bot after changing URL
3. Verify the URL is accessible in browser

### "Bot domain invalid" error in Telegram
1. The domain must be publicly accessible
2. SSL certificate must be valid (not self-signed for production)
3. Check BotFather settings match your domain

### MiniApp loads but shows blank
1. Check browser console for errors
2. Verify frontend-miniapp container is running
3. Check CORS settings if using different domains

---

## Testing Your Setup

1. Open your bot in Telegram
2. Click the MiniApp button or use the menu
3. The MiniApp should load and show training posts
4. Check browser console (in Telegram Desktop) for any errors

For ngrok, you can also test the URL directly in browser:
```
https://your-ngrok-url.ngrok-free.app
```
