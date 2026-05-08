module.exports = {
  apps: [{
    name: 'knowledge-hub',
    script: 'server.js',
    env_file: '.env',
    watch: false,
    max_memory_restart: '300M',
  }]
};