// 引入路径模块
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
// const {CleanWebpackPlugin} = require("clean-webpack-plugin");

module.exports = {
  optimization:{
    minimize: false // 关闭代码压缩，可选
  },

  devtool: "inline-source-map",
  // 从哪里开始编译
  entry: "./index.ts",
  // 编译到哪里
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "bundle.js"
  },
  // 配置模块规则
  module: {
    rules: [
      {
        test: /\.tsx?$/,    // .ts或者tsx后缀的文件，就是typescript文件
        use: "ts-loader",   // 就是上面安装的ts-loader
        exclude: "/node-modules/" // 排除node-modules目录
      },
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      }
    ]
  },
  // 模式
  mode: "development",

  resolve: {
    extensions: [".ts"], // 配置ts文件可以作为模块加载
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html"
    }),

    // new CopyPlugin({
    //   patterns: [{
    //       from: path.resolve(__dirname, 'jquery.min.js'), to: path.resolve(__dirname, 'dist/jquery.min.js')
    //   }]
    // }),

    // new CleanWebpackPlugin()
  ]
}


// const path = require("path");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
// const { CleanWebpackPlugin } = require("clean-webpack-plugin");
//
// module.exports = {
//   optimization:{
//     minimize: false // 关闭代码压缩，可选
//   },
//
//   entry: "./src/index.ts",
//
//   devtool: "inline-source-map",
//
//   devServer: {
//     contentBase: './dist'
//   },
//
//   output: {
//     path: path.resolve(__dirname, "dist"),
//     filename: "bundle.js",
//     environment: {
//       arrowFunction: false // 关闭webpack的箭头函数，可选
//     }
//   },
//
//   resolve: {
//     extensions: [".ts", ".js"]
//   },
//
//   module: {
//     rules: [
//       {
//         test: /\.ts$/,
//         use: {
//           loader: "ts-loader"
//         },
//         exclude: /node_modules/
//       }
//     ]
//   },
//
//   plugins: [
//     new CleanWebpackPlugin(),
//     new HtmlWebpackPlugin({
//       title:'TS测试'
//     }),
//   ]
//
// }
