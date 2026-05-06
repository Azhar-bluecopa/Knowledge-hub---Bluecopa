module.exports = {
  apps: [
    {
      name: 'knowledge-server',
      script: 'server.js',
      cwd: 'C:\\Users\\azhar\\OneDrive\\Desktop\\knowledge-hub',
      watch: false,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 50,
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'knowledge-tunnel',
      script: 'C:\\Users\\azhar\\AppData\\Local\\Microsoft\\WinGet\\Packages\\ngrok.ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\\ngrok.exe',
      args: 'http 3000 --domain=come-outage-helium.ngrok-free.dev --log=stdout --request-header-add "ngrok-skip-browser-warning:true"',
      cwd: 'C:\\Users\\azhar\\OneDrive\\Desktop\\knowledge-hub',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 50
    }
  ]
};
