module.exports = {
  apps : [{
    name   : "discord-music-bot",
    script : "./dist/server.js",
    max_memory_restart: "1G",
    max_restarts: 10,
    restart_delay: 5000,
    env_production: {
       NODE_ENV: "production"
    },
    env_development: {
       NODE_ENV: "development"
    }
  }]
}
