module.exports = {
  apps: [
    /**
    * PRODUCTION PROCESS
    */
    {
      name: "konverthr-API",
      script: "index.js",

      env: {
        NODE_ENV: "production",
        ENV_FILE: "/etc/node-env/api.konverthr.env"
      }
    },

    /**
    * STAGING PROCESS
    */
    {
      name: "konverthr-staging",
      script: "index.js",

      env: {
        NODE_ENV: "staging",
        ENV_FILE: "/etc/node-env/staging.konverthr.env"
      }
    }
  ]
};