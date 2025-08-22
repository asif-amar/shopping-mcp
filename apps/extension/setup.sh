#!/bin/bash

echo "🚀 Setting up shopAI Chrome Extension..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew is already installed"
fi

# Install Node.js
echo "📦 Installing Node.js..."
brew install node

# Verify installation
echo "🔍 Verifying Node.js installation..."
node --version
npm --version

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Create placeholder icons
echo "🎨 Creating placeholder icons..."
mkdir -p public/icons

# Create a simple SVG icon and convert to PNG (placeholder)
cat > public/icons/icon.svg << 'EOF'
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" fill="url(#grad)"/>
  <text x="64" y="80" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">AI</text>
</svg>
EOF

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Build the extension: npm run build"
echo "2. Load the extension in Chrome:"
echo "   - Open chrome://extensions/"
echo "   - Enable Developer mode"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'dist' folder"
echo ""
echo "🔧 For development:"
echo "   - Run 'npm run dev' for watch mode"
echo "   - Run 'npm run typecheck' for type checking"
echo "   - Run 'npm run lint' for linting" 