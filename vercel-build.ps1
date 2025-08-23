# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Vercel build process..."

# Install dependencies with legacy peer deps
Write-Host "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
Write-Host "🔨 Building the application..."
npm run build

# Create a static export if needed
Write-Host "📦 Creating static export..."
if (Test-Path "out") {
    Remove-Item -Path "out" -Recurse -Force
}

New-Item -ItemType Directory -Path "out" -Force | Out-Null
Copy-Item -Path "build\*" -Destination "out\" -Recurse -Force

Write-Host "✅ Build completed successfully!"

# Exit with success
exit 0
