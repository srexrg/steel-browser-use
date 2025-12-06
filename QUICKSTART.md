# 🚀 Quick Deployment Guide - Digital Ocean

## Overview

This project includes:
- **Next.js** frontend (port 3001)
- **Python FastAPI** backend (port 8000)
- **Steel Browser** self-hosted (ports 3000, 9223)
- **Nginx** reverse proxy with HTTPS
- **Let's Encrypt** SSL certificates

## 🎯 One-Command Deployment

After setting up your Digital Ocean droplet and configuring DNS:

```bash
./deploy.sh your-domain.com your-email@example.com
```

## 📋 Pre-Deployment Checklist

### 1. Digital Ocean Setup
- [ ] Create Ubuntu 22.04 droplet (4GB RAM minimum)
- [ ] Note the droplet's IP address
- [ ] SSH access configured

### 2. Domain Configuration
- [ ] Domain A record points to droplet IP
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Verify: `nslookup your-domain.com`

### 3. Required API Keys
- [ ] OpenAI API key (required)
- [ ] Email for Let's Encrypt

## 🔧 Step-by-Step Deployment

### On Your Digital Ocean Droplet:

```bash
# 1. Update system and install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin git -y

# 2. Clone or upload your code
git clone <your-repo-url> /root/dodge
# OR upload via SCP:
# scp -r ./dodge root@YOUR_IP:/root/

# 3. Configure environment
cd /root/dodge/python-server
cp .env.example .env
nano .env
# Add your OPENAI_API_KEY and update domains

# 4. Run deployment
cd /root/dodge
./deploy.sh your-domain.com your-email@example.com

# 5. Configure firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## ✅ Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Test endpoints
curl https://your-domain.com
curl https://your-domain.com/api/health
curl https://your-domain.com/steel-ui

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## 🌐 Service URLs

- **Frontend**: `https://your-domain.com`
- **API**: `https://your-domain.com/api`
- **Steel UI**: `https://your-domain.com/steel-ui`
- **Health Check**: `https://your-domain.com/api/health`

## 📊 Management Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f [service-name]

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop all services
docker compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
docker compose -f docker-compose.prod.yml up -d --build

# View resource usage
docker stats
```

## 🔍 Troubleshooting

### Services won't start
```bash
docker compose -f docker-compose.prod.yml logs
```

### SSL certificate failed
- Verify DNS: `nslookup your-domain.com`
- Check port 80: `curl http://your-domain.com`
- Retry: `docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email your@email.com --agree-tos -d your-domain.com`

### Out of memory
```bash
# Add swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 📖 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive guide.

## 🏗️ Architecture

```
Internet → Nginx (80/443) → [Next.js (3001) | Python API (8000) | Steel (3000)]
                                                    ↓
                                            Steel Browser CDP (9223)
```

## 🔐 Security Notes

- All traffic encrypted with HTTPS
- SSL auto-renewal via Certbot
- Steel Browser ports not exposed directly
- Configure firewall (UFW)
- Use SSH keys instead of passwords

## 💡 Tips

1. **For assignments**: This shows Docker, Nginx, HTTPS, microservices
2. **Minimum specs**: 4GB RAM droplet recommended
3. **Cost**: ~$24/month for 4GB Digital Ocean droplet
4. **DNS**: Wait 5-30 min after configuring before deploying
5. **Logs**: Always check logs if something doesn't work

---

Need help? Check the [Steel Browser docs](https://docs.steel.dev/overview/self-hosting/docker)

