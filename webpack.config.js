const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
    },
    mode: 'production',
    experiments: {
        asyncWebAssembly: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'styles.css', // Outputs styles.css to public/
        }),
        new CopyPlugin({
            patterns: [
                { 
                    from: "assets",
                    to: "assets"
                },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
            publicPath: '/',
        },
        compress: true,
        port: 8080,
    },
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules')],
        extensions: ['.js', '.jsx', '.css'],
    },
};