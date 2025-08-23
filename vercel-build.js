const { execSync } = require('child_process');

console.log('Starting Vercel build process...');

// Install dependencies
console.log('Installing dependencies...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  
  // Build the application
  console.log('Building the application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
