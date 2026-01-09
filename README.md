# QuickText AI - Free & Unlimited Text Assistant

<p align="center">
  <img src="extension/icons/icon128.png" alt="QuickText AI Logo" width="128" height="128">
</p>

<p align="center">
  <strong>AI-powered text generation browser extension</strong><br>
  Rewrite, polish, and transform any text instantly - completely free!
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#languages">Languages</a> •
  <a href="#development">Development</a>
</p>

---

## ✨ Features

- **🆓 Completely Free** - No subscriptions, no limits, no sign-up required
- **🔄 Rewrite** - Rephrase text while keeping the meaning
- **🎩 Make Polite** - Transform casual text into polite, professional language
- **💼 Make Professional** - Upgrade text for business communication
- **📝 Make Shorter** - Condense text while preserving key points
- **🌍 Multilingual** - Supports English, French, Spanish, Portuguese, and Hindi
- **🖱️ Context Menu** - Right-click to transform selected text
- **📋 Quick Copy** - One-click copy to clipboard
- **🔒 Privacy-First** - Text processed securely, never stored

## 🚀 Installation

### Chrome / Edge / Brave

1. Download or clone this repository
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `extension/` folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file in the `extension/` folder

## 💡 Usage

### Option 1: Popup Interface

1. Click the QuickText AI icon in your browser toolbar
2. Enter or paste your text
3. Choose an action (Rewrite, Polite, Professional, Short)
4. Copy the result!

### Option 2: Context Menu

1. Select any text on a webpage
2. Right-click → **QuickText AI**
3. Choose your transformation
4. Result is copied automatically!

### Option 3: Keyboard Shortcut

- **Alt+Q** (Windows/Linux) or **Option+Q** (Mac) - Open popup

## 🌍 Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | en | ✅ Full support |
| French | fr | ✅ Full support |
| Spanish | es | ✅ Full support |
| Portuguese | pt | ✅ Full support |
| Hindi | hi | ✅ Full support |

The interface adapts to your selected language, and AI responses are generated in that language.

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm 9+
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Charlythegreat/QuickText-AI.git
cd QuickText-AI/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your GROQ_API_KEY

# Start development server
npm run dev
```

### Extension Development

1. Load the extension in developer mode (see Installation)
2. Make changes to files in `extension/`
3. Reload the extension to see changes

### Project Structure

```
QuickText-AI/
├── extension/           # Browser extension
│   ├── manifest.json   # Extension configuration
│   ├── popup.html      # Popup UI
│   ├── popup.js        # Popup logic
│   ├── popup.css       # Popup styles
│   ├── background.js   # Service worker
│   ├── content.js      # Content script
│   ├── api.js          # API client
│   ├── config.js       # Configuration
│   ├── i18n/           # Translations
│   └── icons/          # Extension icons
├── backend/            # Node.js API server
│   ├── server.js       # Express server
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   └── config/         # Configuration
├── DEPLOYMENT.md       # Deployment guide
└── SUBMISSION_CHECKLIST.md  # Store submission checklist
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Required
GROQ_API_KEY=gsk_your_api_key_here

# Optional
NODE_ENV=development
PORT=3000
LLM_MODEL=llama3-70b-8192
RATE_LIMIT_MAX=30
```

### Extension Configuration

Edit `extension/config.js` to change the API endpoint:

```javascript
api: {
  baseUrl: 'http://localhost:3000/api/v1',  // Development
  // baseUrl: 'https://api.yoursite.com/api/v1',  // Production
}
```

## 🤖 AI Model

QuickText AI uses **Groq** with the **Llama 3 70B** model for fast, high-quality text generation.

- **Speed**: ~200+ tokens/second
- **Quality**: State-of-the-art open source model
- **Cost**: Free tier available (generous limits)

## 📜 License

MIT License - feel free to use, modify, and distribute!

## 🙏 Credits

- [Groq](https://groq.com) - Ultra-fast AI inference
- [Llama 3](https://ai.meta.com/llama/) - Open source language model by Meta

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Charlythegreat">Charlythegreat</a>
</p>
