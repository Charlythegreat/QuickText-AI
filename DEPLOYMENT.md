# QuickText AI - Production Deployment Guide

Complete guide for deploying QuickText AI from development to production.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Backend Deployment](#2-backend-deployment)
3. [Chrome Web Store Publication](#3-chrome-web-store-publication)
4. [Firefox Add-ons Publication](#4-firefox-add-ons-publication)
5. [Edge Add-ons Publication](#5-edge-add-ons-publication)
6. [Common Rejection Pitfalls](#6-common-rejection-pitfalls)

---

## 1. Local Development Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Git**
- **Groq API Key** (free at [console.groq.com](https://console.groq.com))

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Charlythegreat/QuickText-AI.git
cd QuickText-AI

# Install backend dependencies
cd backend
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
NODE_ENV=development
PORT=3000

# Groq API (REQUIRED)
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama3-70b-8192

# LLM Settings
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.7

# CORS (comma-separated origins)
CORS_ORIGINS=chrome-extension://your-extension-id,http://localhost:3000

# Rate Limiting (requests per minute per IP)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
```

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Note the **Extension ID** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### Update CORS Settings

Add your extension ID to the backend `.env`:

```env
CORS_ORIGINS=chrome-extension://abcdefghijklmnopqrstuvwxyz123456
```

### Update Extension API URL

Edit `extension/config.js` for local development:

```javascript
api: {
  baseUrl: 'http://localhost:3000/api/v1',
  // ...
}
```

### Testing the Integration

1. Start the backend: `cd backend && npm run dev`
2. Reload the extension in Chrome
3. Select text on any webpage
4. Right-click → QuickText AI → Choose an action
5. Or click the extension icon and use the popup

---

## 2. Backend Deployment

### Option A: Docker Deployment (Recommended)

#### Build and Run

```bash
# Build the image
docker build -t quicktext-api ./backend

# Run the container
docker run -d \
  --name quicktext-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e GROQ_API_KEY=gsk_your_key \
  quicktext-api
```

#### Docker Compose

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  quicktext-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GROQ_API_KEY=${GROQ_API_KEY}
      - LLM_MODEL=llama3-70b-8192
      - RATE_LIMIT_MAX=30
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Redis for distributed rate limiting
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

Run with Docker Compose:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f quicktext-api

# Stop services
docker-compose down
```

### Option B: Node.js Deployment (VPS/Cloud)

#### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Navigate to backend
cd backend

# Install production dependencies
npm ci --only=production

# Start with PM2
pm2 start server.js --name "quicktext-api" -i max

# Save PM2 process list
pm2 save

# Setup startup script
pm2 startup
```

#### PM2 Ecosystem File

Create `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'quicktext-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100
  }]
};
```

Run with: `pm2 start ecosystem.config.js --env production`

### Cloud Platform Deployments

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Deploy
railway up

# Set environment variables
railway variables set GROQ_API_KEY=gsk_...
railway variables set NODE_ENV=production
```

#### Render

1. Connect GitHub repository
2. Create new **Web Service**
3. Set **Build Command**: `npm ci`
4. Set **Start Command**: `node server.js`
5. Add environment variables in dashboard

#### DigitalOcean App Platform

1. Create new App from GitHub
2. Select the `backend/` folder as source
3. Set **Run Command**: `node server.js`
4. Configure environment variables
5. Deploy

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGINS` with production extension IDs
- [ ] Enable HTTPS (use reverse proxy like Nginx/Caddy)
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting for production load
- [ ] Enable health check endpoint monitoring

### Nginx Reverse Proxy (HTTPS)

```nginx
server {
    listen 80;
    server_name api.quicktext.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.quicktext.ai;

    ssl_certificate /etc/letsencrypt/live/api.quicktext.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.quicktext.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. Chrome Web Store Publication

### Prepare for Submission

#### Update manifest.json for Production

```json
{
  "name": "QuickText AI - Smart Text Assistant",
  "version": "1.0.0",
  "description": "Free AI-powered text generation. Rewrite, polish, and transform any text instantly."
}
```

#### Create Store Assets

| Asset | Dimensions | Format |
|-------|------------|--------|
| Icon | 128x128 | PNG |
| Small Promo Tile | 440x280 | PNG/JPEG |
| Marquee Promo Tile | 1400x560 | PNG/JPEG |
| Screenshots | 1280x800 or 640x400 | PNG/JPEG |

**Screenshots should show:**
1. Extension popup with text input
2. Generated output example
3. Context menu integration
4. Language selection feature

#### Create Privacy Policy

Host a privacy policy page including:
- Data collected (text for processing)
- How data is used (sent to AI API for processing)
- Data retention policy (text is not stored)
- Third-party services (Groq AI)
- Contact information

Example URL: `https://quicktext.ai/privacy`

#### Package the Extension

```bash
cd extension

# Remove development files
rm -rf .git .gitignore *.log

# Create ZIP
zip -r ../quicktext-ai-chrome.zip . \
  -x "*.DS_Store" \
  -x "*.map" \
  -x "test/*"
```

### Submit to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer fee
3. Click **New Item** → Upload ZIP
4. Fill in store listing:
   - **Title**: QuickText AI - Free Text Assistant
   - **Summary**: Free AI-powered text rewriting and transformation
   - **Description**: Full feature description (up to 16,000 chars)
   - **Category**: Productivity
   - **Language**: English (add translations)
5. Upload promotional images
6. Set **Visibility**: Public
7. Add **Privacy Policy URL**
8. Submit for review

### Review Timeline

- **Initial Review**: 1-3 business days
- **Updates**: Usually faster (hours to 1 day)
- **Rejection**: You'll receive feedback to address

---

## 4. Firefox Add-ons Publication

### Manifest Compatibility

Firefox requires Manifest V2 modifications. Create `manifest.firefox.json`:

```json
{
  "manifest_version": 2,
  "name": "QuickText AI",
  "version": "1.0.0",
  "description": "Free AI-powered text generation assistant",
  
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "clipboardWrite"
  ],
  
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "browser_specific_settings": {
    "gecko": {
      "id": "quicktext@yourdomain.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### Build Script for Firefox

Create `scripts/build-firefox.sh`:

```bash
#!/bin/bash

# Create Firefox build directory
rm -rf dist/firefox
mkdir -p dist/firefox

# Copy extension files
cp -r extension/* dist/firefox/

# Replace manifest
cp dist/firefox/manifest.firefox.json dist/firefox/manifest.json
rm dist/firefox/manifest.firefox.json

# Package
cd dist/firefox
zip -r ../quicktext-ai-firefox.zip . -x "*.DS_Store"

echo "Firefox package created: dist/quicktext-ai-firefox.zip"
```

### Submit to Firefox Add-ons

1. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Click **Submit a New Add-on**
3. Upload the ZIP file
4. Choose distribution:
   - **On this site**: Listed on addons.mozilla.org
   - **On your own**: Self-distributed (signed only)
5. Fill in listing details
6. Submit for review

### Firefox-Specific Requirements

- **Source Code**: If minified/bundled, provide source
- **Add-on ID**: Must be unique email-style or UUID
- **Permissions Justification**: Explain each permission use

---

## 5. Edge Add-ons Publication

### Edge Compatibility

Edge uses Chromium, so Manifest V3 works directly. Minor adjustments:

Update `manifest.json`:

```json
{
  // ... existing config
  "author": "Your Name or Company"
}
```

### Package for Edge

```bash
cd extension
zip -r ../quicktext-ai-edge.zip . \
  -x "*.DS_Store" \
  -x "manifest.firefox.json"
```

### Submit to Microsoft Edge Add-ons

1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
2. Register as a developer (free)
3. Click **Create new extension**
4. Upload the ZIP file
5. Fill in store listing:
   - Product name
   - Short description (up to 132 chars)
   - Description (up to 10,000 chars)
   - Screenshots (1280x800 recommended)
   - Privacy policy URL
6. Submit for certification

### Edge-Specific Checklist

- [ ] Tested in Microsoft Edge browser
- [ ] Screenshots show Edge browser
- [ ] No Chrome-specific branding
- [ ] Privacy policy accessible

---

## 6. Common Rejection Pitfalls

### Chrome Web Store Rejections

#### 1. **Excessive Permissions**

❌ **Problem**: Requesting more permissions than needed

```json
// DON'T
"permissions": ["<all_urls>", "tabs", "webNavigation", "history"]
```

✅ **Solution**: Request minimum required permissions

```json
// DO
"permissions": ["activeTab", "storage", "contextMenus"]
"host_permissions": ["https://api.yourdomain.com/*"]
```

#### 2. **Missing Privacy Policy**

❌ **Problem**: No privacy policy or inadequate policy

✅ **Solution**: Create comprehensive privacy policy covering:
- What data is collected
- How it's processed (sent to AI API)
- Data retention (not stored permanently)
- User rights

#### 3. **Misleading Description**

❌ **Problem**: Claims not matching functionality

✅ **Solution**: 
- Only claim features that work
- Be specific about AI capabilities
- "Free & Unlimited" is accurate - no hidden limits

#### 4. **Remote Code Execution**

❌ **Problem**: Loading JavaScript from external servers

```javascript
// DON'T
const script = document.createElement('script');
script.src = 'https://external.com/code.js';
```

✅ **Solution**: Bundle all code locally

#### 5. **Obfuscated Code**

❌ **Problem**: Minified/obfuscated code without source

✅ **Solution**: 
- Provide source code link if minified
- Use readable code when possible
- Comment complex sections

#### 6. **Single-Purpose Violation**

❌ **Problem**: Extension does too many unrelated things

✅ **Solution**: Focus on one clear purpose (text generation)

### Firefox Add-ons Rejections

#### 1. **Security Issues**

❌ **Problem**: Using innerHTML with user content

```javascript
// DON'T
element.innerHTML = userContent;
```

✅ **Solution**: Use textContent or sanitize HTML

```javascript
// DO
element.textContent = userContent;
```

#### 2. **Missing Source Code**

❌ **Problem**: Bundled code without build instructions

✅ **Solution**: Provide:
- Full source code
- Build instructions (README)
- Package.json with dependencies

### Edge Add-ons Rejections

#### 1. **Branding Issues**

❌ **Problem**: Chrome logos or references in Edge submission

✅ **Solution**: 
- Use generic browser screenshots
- Remove "Chrome" from descriptions
- Test and screenshot in Edge

#### 2. **Functionality Failures**

❌ **Problem**: Extension doesn't work in Edge

✅ **Solution**: Test thoroughly in Edge

### Pre-Submission Checklist

- [ ] All features work correctly
- [ ] Permissions are minimal and justified
- [ ] Privacy policy is complete and accessible
- [ ] No external code loading
- [ ] No obfuscated code (or source provided)
- [ ] Screenshots are accurate and clear
- [ ] Description matches functionality
- [ ] Tested in target browser
- [ ] Version number is correct
- [ ] Icons are all sizes (16, 48, 128)
- [ ] No console errors

---

## Quick Reference

### Production URLs

| Service | URL |
|---------|-----|
| API | `https://api.quicktext.ai/api/v1` |
| Extension (Chrome) | `chrome-extension://[ID]` |
| Privacy Policy | `https://quicktext.ai/privacy` |
| Terms of Service | `https://quicktext.ai/terms` |

### Environment Variables Summary

```env
# Required
NODE_ENV=production
GROQ_API_KEY=gsk_...

# Optional
LLM_MODEL=llama3-70b-8192
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.7
RATE_LIMIT_MAX=30

# CORS (include all published extension IDs)
CORS_ORIGINS=chrome-extension://xxx,moz-extension://xxx,extension://xxx
```

### Support Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Firefox Add-on Docs](https://extensionworkshop.com/)
- [Edge Extension Docs](https://docs.microsoft.com/microsoft-edge/extensions-chromium/)
- [Groq API Docs](https://console.groq.com/docs)

---

## Troubleshooting

### Extension not connecting to API

1. Check CORS origins include extension ID
2. Verify API URL in config.js
3. Check browser console for errors
4. Ensure backend is running and accessible

### Rate limiting issues

1. Default limit is 30 requests per minute per IP
2. Adjust `RATE_LIMIT_MAX` in `.env` if needed
3. For heavy users, consider increasing the limit

### Store review taking too long

1. Ensure complete submission (all fields filled)
2. Respond quickly to any reviewer questions
3. For Chrome: expect 1-3 days, up to 2 weeks for new developers
4. For Firefox: usually 1-2 days
5. For Edge: usually 2-4 days

---

*Last updated: January 2026*
