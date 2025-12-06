#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Production Deployment Script for Digital Ocean${NC}"
echo "=================================================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name required${NC}"
    echo "Usage: ./deploy.sh your-domain.com your-email@example.com"
    exit 1
fi

if [ -z "$2" ]; then
    echo -e "${RED}Error: Email required for Let's Encrypt${NC}"
    echo "Usage: ./deploy.sh your-domain.com your-email@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo -e "${YELLOW}Domain: $DOMAIN${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"
echo ""

# Update .env.production
echo -e "${GREEN}📝 Updating environment configuration...${NC}"
sed -i "s/your-domain.com/$DOMAIN/g" .env.production
sed -i "s/your-domain.com/$DOMAIN/g" python-server/.env.example

# Update nginx config
echo -e "${GREEN}📝 Updating nginx configuration...${NC}"
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/app.conf

# Create required directories
echo -e "${GREEN}📁 Creating required directories...${NC}"
mkdir -p certbot/conf certbot/www

# Check if .env file exists in python-server
if [ ! -f "python-server/.env" ]; then
    echo -e "${YELLOW}⚠️  python-server/.env not found. Creating from example...${NC}"
    cp python-server/.env.example python-server/.env
    echo -e "${RED}⚠️  IMPORTANT: Edit python-server/.env and add your OPENAI_API_KEY${NC}"
    read -p "Press enter to continue after updating the .env file..."
fi

# Temporarily comment out SSL in nginx config for initial setup
echo -e "${GREEN}🔧 Preparing nginx for initial SSL certificate request...${NC}"
sed -i 's/ssl_certificate /#ssl_certificate /g' nginx/conf.d/app.conf
sed -i 's/ssl_certificate_key /#ssl_certificate_key /g' nginx/conf.d/app.conf
sed -i 's/listen 443 ssl/listen 443/g' nginx/conf.d/app.conf

# Build and start services
echo -e "${GREEN}🏗️  Building Docker images...${NC}"
export DOMAIN=$DOMAIN
docker compose -f docker-compose.prod.yml build

echo -e "${GREEN}🚀 Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d nginx certbot

# Wait for nginx to be ready
echo -e "${YELLOW}⏳ Waiting for nginx to start...${NC}"
sleep 5

# Request SSL certificate
echo -e "${GREEN}🔒 Requesting SSL certificate from Let's Encrypt...${NC}"
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo -e "${YELLOW}Make sure your domain points to this server's IP address${NC}"
    exit 1
fi

# Restore SSL configuration
echo -e "${GREEN}🔧 Enabling SSL in nginx configuration...${NC}"
sed -i 's/#ssl_certificate /ssl_certificate /g' nginx/conf.d/app.conf
sed -i 's/listen 443$/listen 443 ssl http2/g' nginx/conf.d/app.conf

# Restart nginx with SSL enabled
echo -e "${GREEN}🔄 Restarting nginx with SSL...${NC}"
docker compose -f docker-compose.prod.yml restart nginx

# Start all services
echo -e "${GREEN}🚀 Starting all services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}📱 Your application is now available at:${NC}"
echo -e "  🌐 Frontend: https://$DOMAIN"
echo -e "  🔧 API: https://$DOMAIN/api"
echo -e "  🖥️  Steel UI: https://$DOMAIN/steel-ui"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Stop services: docker compose -f docker-compose.prod.yml down"
echo "  - Restart services: docker compose -f docker-compose.prod.yml restart"
echo "  - Update app: git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  1. Configure your firewall to allow ports 80 and 443"
echo "  2. Point your domain DNS A record to this server's IP"
echo "  3. Update python-server/.env with your API keys"
echo ""

