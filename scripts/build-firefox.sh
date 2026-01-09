#!/bin/bash

# =============================================================================
# QuickText AI - Firefox Build Script
# =============================================================================

set -e

echo "🦊 Building QuickText AI for Firefox..."

# Configuration
DIST_DIR="dist"
FIREFOX_DIR="$DIST_DIR/firefox"
OUTPUT_FILE="$DIST_DIR/quicktext-ai-firefox.zip"

# Clean previous build
rm -rf "$FIREFOX_DIR"
mkdir -p "$FIREFOX_DIR"

# Copy extension files
echo "📁 Copying extension files..."
cp -r extension/* "$FIREFOX_DIR/"

# Check if Firefox manifest exists
if [ -f "$FIREFOX_DIR/manifest.firefox.json" ]; then
  echo "📝 Using Firefox-specific manifest..."
  mv "$FIREFOX_DIR/manifest.firefox.json" "$FIREFOX_DIR/manifest.json"
else
  echo "⚠️  No manifest.firefox.json found, creating Firefox manifest..."
  
  # Create Firefox-compatible manifest
  cat > "$FIREFOX_DIR/manifest.json" << 'EOF'
{
  "manifest_version": 2,
  "name": "QuickText AI",
  "version": "1.0.0",
  "description": "AI-powered text generation assistant - Rewrite, polish, and transform any text instantly.",
  
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
      "id": "quicktext@quicktext.ai",
      "strict_min_version": "109.0"
    }
  }
}
EOF
fi

# Remove Chrome-specific files
rm -f "$FIREFOX_DIR/manifest.chrome.json" 2>/dev/null || true

# Remove development files
echo "🧹 Cleaning up..."
find "$FIREFOX_DIR" -name "*.DS_Store" -delete 2>/dev/null || true
find "$FIREFOX_DIR" -name "*.map" -delete 2>/dev/null || true
rm -rf "$FIREFOX_DIR/.git" 2>/dev/null || true
rm -rf "$FIREFOX_DIR/test" 2>/dev/null || true
rm -rf "$FIREFOX_DIR/tests" 2>/dev/null || true

# Create ZIP package
echo "📦 Creating ZIP package..."
rm -f "$OUTPUT_FILE"
cd "$FIREFOX_DIR"
zip -r "../../$OUTPUT_FILE" . -x "*.DS_Store"
cd ../..

# Verify package
if [ -f "$OUTPUT_FILE" ]; then
  SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo ""
  echo "✅ Firefox package created successfully!"
  echo "   📦 File: $OUTPUT_FILE"
  echo "   📊 Size: $SIZE"
  echo ""
  echo "Next steps:"
  echo "  1. Go to https://addons.mozilla.org/developers/"
  echo "  2. Click 'Submit a New Add-on'"
  echo "  3. Upload $OUTPUT_FILE"
else
  echo "❌ Failed to create Firefox package"
  exit 1
fi
