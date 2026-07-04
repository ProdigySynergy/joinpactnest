module.exports = {
  apps: [
    {
      name: "vowbird-api",
      script: "apps/api/dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        API_PORT: 4000,
      },
    },
    {
      name: "vowbird-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: `${__dirname}/apps/web`,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
