const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');
const { ProvidePlugin } = require('webpack');

const server = {
    entry: './src/server/app.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            common: path.resolve(__dirname, 'src/common'),
        }
    },
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'build/server'),
    },
    target: 'node',
    externals: [nodeExternals()],
    mode: 'development',
};

const client = {
    entry: './src/client/index.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            common: path.resolve(__dirname, 'src/common'),
        },
    },
    node: {
        global: true,
        __filename: true,
        __dirname: true,
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'build/client'),
    },
    target: 'web',
    mode: 'development',
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './src/client/index.html' },
            ],
        }),
        new ProvidePlugin({
            process: 'process/browser',
        }),
    ],
};

module.exports = [client, server];