#!/bin/bash

# Start Cloudflare Tunnel for MiniApp testing
# No registration required! Free and works from any IP.
# Prerequisites: Make sure the main stack is running: docker-compose up -d

set -e

cd "$(dirname "$0")/.."

# Stop old container if exists
docker rm -f ppb-tunnel ppb-ngrok 2>/dev/null || true

# Start cloudflared
echo "🚀 Starting Cloudflare Tunnel..."
docker-compose -f docker-compose.ngrok.yml up -d

# Wait for tunnel to start and get URL
echo ""
echo "📋 Getting tunnel URL (wait 5 sec)..."
sleep 5

# Get URL from logs
TUNNEL_URL=$(docker logs ppb-tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⏳ Waiting a bit more..."
    sleep 3
    TUNNEL_URL=$(docker logs ppb-tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
fi

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to get tunnel URL. Check logs:"
    docker logs ppb-tunnel 2>&1 | tail -20
    exit 1
fi

echo ""
echo "✅ Cloudflare Tunnel is running!"
echo ""
echo "🌐 Your MiniApp URL: $TUNNEL_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update .env: MINIAPP_URL=$TUNNEL_URL"
echo "2. Restart main-bot: docker-compose restart main-bot"
echo "3. Test MiniApp in Telegram!"
echo ""
echo "⚠️  URL changes on each restart!"
