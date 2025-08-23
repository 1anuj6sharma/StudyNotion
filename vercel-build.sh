#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Vercel build process..."

# Install dependencies with legacy peer deps
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
echo "🔨 Building the application..."
npm run build

# Create a static export if needed
echo "📦 Creating static export..."
if [ -d "out" ]; then
  rm -rf out
fi

mkdir -p out
cp -r build/* out/

echo "✅ Build completed successfully!"

exit 0
# Exit with success
exit 0
