#!/bin/bash

# =============================================================================
# QuickText AI - Chrome Build Script
# =============================================================================

set -e

echo "🌐 Building QuickText AI for Chrome..."

# Configuration
DIST_DIR="dist"
CHROME_DIR="$DIST_DIR/chrome"
OUTPUT_FILE="$DIST_DIR/quicktext-ai-chrome.zip"

# Clean previous build
rm -rf "$CHROME_DIR"
mkdir -p "$CHROME_DIR"

# Copy extension files
echo "📁 Copying extension files..."
cp -r extension/* "$CHROME_DIR/"

# Remove Firefox-specific files
rm -f "$CHROME_DIR/manifest.firefox.json" 2>/dev/null || true

# Remove development files
echo "🧹 Cleaning up..."
find "$CHROME_DIR" -name "*.DS_Store" -delete 2>/dev/null || true
find "$CHROME_DIR" -name "*.map" -delete 2>/dev/null || true
rm -rf "$CHROME_DIR/.git" 2>/dev/null || true
rm -rf "$CHROME_DIR/test" 2>/dev/null || true
rm -rf "$CHROME_DIR/tests" 2>/dev/null || true

# Validate manifest
echo "✔️  Validating manifest.json..."
if ! python3 -c "import json; json.load(open('$CHROME_DIR/manifest.json'))" 2>/dev/null; then
  if ! node -e "require('./$CHROME_DIR/manifest.json')" 2>/dev/null; then
    echo "⚠️  Could not validate manifest.json (Python/Node not available)"
  fi
fi

# Create ZIP package
echo "📦 Creating ZIP package..."
rm -f "$OUTPUT_FILE"
cd "$CHROME_DIR"
zip -r "../../$OUTPUT_FILE" . -x "*.DS_Store"
cd ../..

# Verify package
if [ -f "$OUTPUT_FILE" ]; then
  SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo ""
  echo "✅ Chrome package created successfully!"
  echo "   📦 File: $OUTPUT_FILE"
  echo "   📊 Size: $SIZE"
  echo ""
  echo "Next steps:"
  echo "  1. Go to https://chrome.google.com/webstore/devconsole"
  echo "  2. Click 'New Item'"
  echo "  3. Upload $OUTPUT_FILE"
else
  echo "❌ Failed to create Chrome package"
  exit 1
fi
