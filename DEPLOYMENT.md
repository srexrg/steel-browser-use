# Production Deployment Guide - Digital Ocean

This guide walks you through deploying your Next.js app, Python FastAPI server, and self-hosted Steel Browser to Digital Ocean with Nginx and HTTPS.

## 📋 Prerequisites

1. **Digital Ocean Account**
2. **Domain name** pointing to your server's IP
3. **API Keys**:
   - OpenAI API Key
   - (Optional) Steel Cloud API Key if using cloud instead of self-hosted

## 🚀 Quick Start

### Step 1: Create Digital Ocean Droplet

1. Go to [Digital Ocean](https://www.digitalocean.com/)
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic
   - **CPU Options**: Regular (4GB RAM minimum recommended)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or Password
   - **Hostname**: your-app-name

3. Note your droplet's IP address

### Step 2: Configure DNS

Point your domain to your Digital Ocean droplet:

1. Go to your domain registrar
2. Add an A record:
   - **Type**: A
   - **Name**: @ (or subdomain)
   - **Value**: Your droplet's IP address
   - **TTL**: 300 (or default)

Wait for DNS propagation (usually 5-30 minutes).

### Step 3: Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 4: Install Docker and Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 5: Clone Your Repository

```bash
# Install git if not present
apt install git -y

# Clone your repository
git clone https://github.com/yourusername/dodge.git
cd dodge
```

Or upload your code:

```bash
# From your local machine
scp -r /path/to/dodge root@YOUR_DROPLET_IP:/root/
```

### Step 6: Configure Environment Variables

```bash
# Copy and edit Python server environment
cd python-server
cp .env.example .env
nano .env
```

Add your API keys:
```env
OPENAI_API_KEY=your_actual_openai_key_here
STEEL_BASE_URL=http://steel-browser:3000
STEEL_UI_URL=https://your-domain.com/steel-ui
ALLOWED_ORIGINS=https://your-domain.com
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 7: Run Deployment Script

```bash
cd /root/dodge
chmod +x deploy.sh
./deploy.sh your-domain.com your-email@example.com
```

The script will:
- ✅ Configure environment files
- ✅ Update nginx configuration
- ✅ Build Docker images
- ✅ Request SSL certificate from Let's Encrypt
- ✅ Start all services

### Step 8: Verify Deployment

Check service status:
```bash
docker compose -f docker-compose.prod.yml ps
```

All services should show "Up" status.

View logs:
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f python-server
docker compose -f docker-compose.prod.yml logs -f nextjs
docker compose -f docker-compose.prod.yml logs -f steel-browser
```

## 🌐 Access Your Application

- **Frontend**: `https://your-domain.com`
- **API**: `https://your-domain.com/api`
- **Steel UI**: `https://your-domain.com/steel-ui`
- **API Health**: `https://your-domain.com/api/health`

## 🔒 Firewall Configuration (Important!)

```bash
# Install UFW if not present
apt install ufw -y

# Allow SSH (IMPORTANT - do this first!)
ufw allow OpenSSH

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## 🛠️ Common Management Tasks

### Update Application

```bash
cd /root/dodge
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Restart Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart python-server
docker compose -f docker-compose.prod.yml restart nextjs
docker compose -f docker-compose.prod.yml restart steel-browser
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### View Resource Usage

```bash
docker stats
```

### Clean Up Docker Resources

```bash
# Remove unused containers and images
docker system prune -a

# Remove unused volumes (careful!)
docker volume prune
```

## 📊 Monitoring

### Check Service Health

```bash
# Python API
curl https://your-domain.com/api/health

# Nginx status
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### View Logs

```bash
# Live logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Specific service
docker compose -f docker-compose.prod.yml logs -f python-server
```

## 🔧 Troubleshooting

### SSL Certificate Issues

If certificate request fails:

1. Verify DNS is pointing to your server:
   ```bash
   nslookup your-domain.com
   ```

2. Check if port 80 is accessible:
   ```bash
   curl http://your-domain.com/.well-known/acme-challenge/test
   ```

3. Manually request certificate:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot certonly \
       --webroot \
       --webroot-path=/var/www/certbot \
       --email your-email@example.com \
       --agree-tos \
       --no-eff-email \
       -d your-domain.com
   ```

### Services Not Starting

Check logs:
```bash
docker compose -f docker-compose.prod.yml logs
```

Check if ports are already in use:
```bash
netstat -tulpn | grep -E ':(80|443|3000|3001|8000|9223)'
```

### Out of Memory

If services crash due to memory:

1. Check available memory:
   ```bash
   free -h
   ```

2. Add swap space:
   ```bash
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

3. Reduce Steel Browser memory limit in `docker-compose.prod.yml`

### Steel Browser Not Working

1. Check if Steel container is running:
   ```bash
   docker compose -f docker-compose.prod.yml ps steel-browser
   ```

2. Check Steel logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs steel-browser
   ```

3. Verify connection from Python server:
   ```bash
   docker compose -f docker-compose.prod.yml exec python-server curl http://steel-browser:3000
   ```

## 🔄 SSL Certificate Renewal

Certificates auto-renew via Certbot container. To manually renew:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

## 📈 Scaling Considerations

### For Production at Scale

1. **Separate Database**: Add PostgreSQL/MongoDB for persistent storage
2. **Redis Cache**: Add Redis for session management
3. **Load Balancer**: Use DO Load Balancer for multiple droplets
4. **Object Storage**: Use DO Spaces for file storage
5. **Monitoring**: Add Prometheus + Grafana
6. **Logs**: Centralize with ELK stack or DO Monitoring

### Resource Limits

Current setup (4GB droplet):
- Steel Browser: 2GB RAM
- Python Server: 1GB RAM
- Next.js: 1GB RAM
- Nginx + Certbot: ~200MB RAM

For better performance, consider 8GB droplet.

## 🔐 Security Best Practices

1. **Change default SSH port**:
   ```bash
   nano /etc/ssh/sshd_config
   # Change Port 22 to Port 2222
   systemctl restart sshd
   ufw allow 2222/tcp
   ```

2. **Disable root login**:
   ```bash
   adduser youruser
   usermod -aG sudo youruser
   # Edit /etc/ssh/sshd_config
   # Set PermitRootLogin no
   ```

3. **Use SSH keys only** (disable password auth)

4. **Keep system updated**:
   ```bash
   apt update && apt upgrade -y
   ```

5. **Regular backups**:
   ```bash
   # Backup command
   docker compose -f docker-compose.prod.yml exec python-server tar -czf /tmp/backup.tar.gz /app
   ```

## 📞 Support

For issues specific to:
- **Steel Browser**: [Steel Discord](https://docs.steel.dev) (#help channel)
- **Next.js**: [Next.js Docs](https://nextjs.org/docs)
- **FastAPI**: [FastAPI Docs](https://fastapi.tiangolo.com/)
- **Digital Ocean**: [DO Community](https://www.digitalocean.com/community)

## 📝 Architecture Overview

```
                    [Internet]
                        |
                     [Port 80/443]
                        |
                    [Nginx Reverse Proxy]
                        |
        +---------------+------------------+
        |               |                  |
    [Next.js:3001] [Python:8000]  [Steel:3000/9223]
        |               |                  |
        +---------------+------------------+
                        |
                [Docker Network: app-network]
```

## 🎯 Testing Checklist

After deployment, test:

- [ ] Frontend loads at `https://your-domain.com`
- [ ] HTTP redirects to HTTPS
- [ ] API health check: `https://your-domain.com/api/health`
- [ ] Steel UI accessible: `https://your-domain.com/steel-ui`
- [ ] Scraping functionality works
- [ ] SSL certificate is valid
- [ ] All logs show no errors
- [ ] Resource usage is acceptable

## 🎓 For Assignment Purposes

This setup demonstrates:
- ✅ Containerization with Docker
- ✅ Reverse proxy with Nginx
- ✅ HTTPS/SSL with Let's Encrypt
- ✅ Self-hosted browser automation
- ✅ Microservices architecture
- ✅ Production deployment practices
- ✅ Security best practices

---

**Good luck with your deployment! 🚀**

