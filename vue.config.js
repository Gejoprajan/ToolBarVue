const webpack = require('webpack');

module.exports = {
  configureWebpack: {
    resolve: {
      fallback: {
        "util": require.resolve("util/"),
        "stream": require.resolve("stream-browserify"),
        "events": require.resolve("events/"),
        "assert": require.resolve("assert/"),
      }
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ]
  },
  transpileDependencies: [
    'twilio-client',
    'backoff',
    'precond'
  ]
};