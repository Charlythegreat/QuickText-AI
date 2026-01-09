#!/bin/bash

# =============================================================================
# QuickText AI - Edge Build Script
# =============================================================================

set -e

echo "🔷 Building QuickText AI for Microsoft Edge..."

# Configuration
DIST_DIR="dist"
EDGE_DIR="$DIST_DIR/edge"
OUTPUT_FILE="$DIST_DIR/quicktext-ai-edge.zip"

# Clean previous build
rm -rf "$EDGE_DIR"
mkdir -p "$EDGE_DIR"

# Copy extension files
echo "📁 Copying extension files..."
cp -r extension/* "$EDGE_DIR/"

# Remove Firefox-specific files
rm -f "$EDGE_DIR/manifest.firefox.json" 2>/dev/null || true

# Edge-specific manifest adjustments (if needed)
# Edge supports Manifest V3, same as Chrome

# Remove development files
echo "🧹 Cleaning up..."
find "$EDGE_DIR" -name "*.DS_Store" -delete 2>/dev/null || true
find "$EDGE_DIR" -name "*.map" -delete 2>/dev/null || true
rm -rf "$EDGE_DIR/.git" 2>/dev/null || true
rm -rf "$EDGE_DIR/test" 2>/dev/null || true
rm -rf "$EDGE_DIR/tests" 2>/dev/null || true

# Create ZIP package
echo "📦 Creating ZIP package..."
rm -f "$OUTPUT_FILE"
cd "$EDGE_DIR"
zip -r "../../$OUTPUT_FILE" . -x "*.DS_Store"
cd ../..

# Verify package
if [ -f "$OUTPUT_FILE" ]; then
  SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo ""
  echo "✅ Edge package created successfully!"
  echo "   📦 File: $OUTPUT_FILE"
  echo "   📊 Size: $SIZE"
  echo ""
  echo "Next steps:"
  echo "  1. Go to https://partner.microsoft.com/dashboard/microsoftedge/overview"
  echo "  2. Click 'Create new extension'"
  echo "  3. Upload $OUTPUT_FILE"
else
  echo "❌ Failed to create Edge package"
  exit 1
fi
