const path = require("path");
const webpack = require("webpack");
const uglifyPlugin = require("uglifyjs-webpack-plugin");

const BUILD_DIR = path.resolve(__dirname, "build");
const SRC_DIR = path.resolve(__dirname, "src");
const ENTRY_PATH = path.resolve(SRC_DIR, "dispatchInterceptor.js");


module.exports = {
  mode: "production",
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: "production",
      DEBUG: false,
    }),
  ],
  entry: {
    index: ENTRY_PATH,
  },
  output: {
    path: BUILD_DIR,
    filename: "redux-dispatch-interceptor.js",
    libraryTarget: "commonjs2",
  },
  module: {
    rules: [
      {
        test: /\.js/,
        include: [SRC_DIR],
        use: ["babel-loader", "eslint-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  optimization: {
    minimize: true,
    minimizer: [new uglifyPlugin({include: /\.js/})],
  },
};
