const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
    },
    mode: 'development',
    experiments: {
        asyncWebAssembly: true,
    },
    devServer: {
        static: [
            {
                directory: path.join(__dirname, 'public'),
                publicPath: '/'
            },
            {
                directory: path.join(__dirname),
                publicPath: '/'
            }
        ],
        compress: true,
        port: 8080,
    },
};