console.log('Clearing module cache and restarting server...');

// Clear the module cache
Object.keys(require.cache).forEach(function(key) {
  delete require.cache[key];
});

// Start the server
require('./index');

console.log('Server restarted successfully!');
