#!/bin/bash

# =============================================================================
# QuickText AI - Build All Platforms
# =============================================================================

set -e

echo "🚀 Building QuickText AI for all platforms..."
echo ""

# Create dist directory
mkdir -p dist

# Build for each platform
./scripts/build-chrome.sh
echo ""
./scripts/build-firefox.sh
echo ""
./scripts/build-edge.sh

echo ""
echo "=============================================="
echo "✅ All builds completed successfully!"
echo "=============================================="
echo ""
echo "📦 Packages created:"
ls -lh dist/*.zip
echo ""
echo "Ready for submission to:"
echo "  🌐 Chrome Web Store"
echo "  🦊 Firefox Add-ons"
echo "  🔷 Microsoft Edge Add-ons"
