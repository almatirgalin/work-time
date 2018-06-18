const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    entry: './js/application.js',
    output: {
        path: 'dist',
        filename: 'app.js'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'uglifyjs-webpack-plugin'
            }
        ]
    },
    plugins: [
        new UglifyJsPlugin()
    ]
};

module.exports.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
        compress: {
            // don't show unreachable variables etc
            warnings:     false,
            drop_console: true,
            unsafe:       true
        }
    })
);