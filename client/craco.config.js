const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix for Excalidraw's roughjs module resolution issues
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'roughjs/bin/rough': path.resolve(__dirname, 'node_modules/roughjs/bin/rough.js'),
        'roughjs/bin/generator': path.resolve(__dirname, 'node_modules/roughjs/bin/generator.js'),
        'roughjs/bin/math': path.resolve(__dirname, 'node_modules/roughjs/bin/math.js'),
      };
      
      return webpackConfig;
    },
  },
};
