module.exports = {
  apps: [{
    name: 'knowledge-hub',
    script: 'server.js',
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      GROQ_API_KEY: process.env.GROQ_API_KEY || require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8').match(/GROQ_API_KEY=(.+)/)?.[1]?.trim() || '',
    }
  }]
};