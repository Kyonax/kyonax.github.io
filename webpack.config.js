/**
 * @file webpack.config.js - WebpackConfig
 *
 * This file contains the main Webpack configuration for bundling and optimizing
 * assets for the Kyo CV website. It handles everything from compiling JavaScript
 * and CSS, to optimizing images, fonts, and generating favicons. This setup ensures
 * that all assets are optimized for both development and production environments.
 *
 * node.js-v20.17.0
 *
 * @author Cristian Moreno (Kyonax)
 * @contact iamkyo@kyo.wtf
 * @date 2025-01-17
 *
 * Code Guidelines :: @CCSv0.1
 * More details: https://code-guidelines.cybercodesyndicate.org
 * - Tabs only—no spaces.
 * - Naming:
 *   - snake_case for variables/methods.
 *   - _private_method() for private methods (underscore prefix).
 *   - UPPER_SNAKE_CASE for constants (in constant files).
 *   - kebab-case for file names (e.g., file-example.js).
 * - Meaningful names—fetch_user_data() over doThing().
 *
 * Repository-URL
 * https://github.com/Kyonax/kyo-web-online
 *
 * @dependencies
 * - CleanWebpackPlugin from "clean-webpack-plugin"
 * - WebpackManifestPlugin from "webpack-manifest-plugin"
 * - HtmlWebpackPlugin from "html-webpack-plugin"
 * - ImageMinimizerPlugin from "image-minimizer-webpack-plugin"
 * - path from "path"
 * - fs from "fs"
 * - Constants from "./src/app/constants/Data"
 *
 * @usage
 * This Webpack configuration is executed via the following npm commands:
 * - `npm run build`: This command bundles and optimizes the assets for production, including JavaScript, CSS, and images.
 * - `npm run dev`: This command starts the development server with hot-reloading and live-reloading capabilities for a smooth development experience.
 * - `npm run build-all`: Runs the full build process, which includes bundling the assets and generating favicons and manifests.
 */
const TranslationWebpackPlugin = require("./translation-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const path = require("path");
const fs = require("fs");

const {
  AUTHOR_INFO,
  SEO,
  THEME_SETTINGS,
  FAVICON,
  SITE_URL,
  SITE_TITLE,
  APP_DESCRIPTION,
} = require("./src/app/constants/Data");

/**
 * Fetch Critical CSS
 *
 * Retrieves the critical CSS content for the HTML index file.
 * The critical CSS is intended to be used in the HTML <style> tag to improve
 * page load performance by initially loading only the essential CSS.
 *
 * @returns {string} The contents of the critical CSS file, or
 * an empty string if an error occurs while reading the file.
 *
 * @throws {Error} Throws an error if the critical CSS file cannot
 * be found or read.
 */
const fetch_critical_css = () => {
  const critical_css_path = path.resolve(__dirname, "src/app/critical.css");
  try {
    return fs.readFileSync(critical_css_path, "utf8");
  } catch (err) {
    console.error(
      `Failed to read critical CSS file at ${critical_css_path}:`,
      err,
    );
    return "";
  }
};

module.exports = {
  devServer: {
    compress: true,
    historyApiFallback: true,
    hot: true,
    liveReload: true,
    open: true,
    port: 9000,
    static: {
      directory: path.join(__dirname, "dist"),
    },
  },

  /**
   * Source maps
   *
   * Enables source maps for easier debugging during development.
   * Maps bundled code to original source files for error tracing.
   */
  devtool: "source-map",

  /**
   * Entry point for the application
   *
   * Specifies the main JavaScript file to start the bundling process.
   * Webpack will begin from this file and include any dependencies.
   */
  entry: "./src/app/index.js",

  /**
   * Build mode
   *
   * Defines the mode of the build process. Options are "development" or "production".
   * Development mode enables debugging features like source maps.
   */
  mode: "development",

  /**
   * Module rules
   *
   * Defines rules for handling various file types, including SCSS, JavaScript, and images.
   * Excludes SVG files from WebP conversion.
   */
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, "postcss.config.js"),
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|pdf)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
        use: [
          {
            loader: "image-webpack-loader",
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65,
              },
              pngquant: {
                quality: [0.65, 0.9],
                speed: 4,
              },
            },
          },
        ],
      },
      {
        test: /\.svg$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/svg/[name][ext]",
        },
        use: [
          {
            loader: "svgo-loader",
            options: {
              // In SVGO v2, everything is driven by "plugins" inside "svgoConfig".
              svgoConfig: {
                plugins: [
                  {
                    name: "preset-default",
                    params: {
                      overrides: {
                        // <-- keep viewBox in your final SVG
                        removeViewBox: false,
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            loader: "image-webpack-loader",
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65,
              },
              pngquant: {
                quality: [0.65, 0.9],
                speed: 4,
              },
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/fonts/[name][ext][query]",
        },
      },
    ],
  },

  /**
   * Optimization settings
   *
   * Configures optimization steps, including image compression for PNG, JPEG, and WebP formats
   * while excluding SVG files from being converted to WebP.
   */
  optimization: {
    minimizer: [
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: [
              ["imagemin-mozjpeg", { quality: 75 }],
              ["imagemin-pngquant", { quality: [0.65, 0.9] }],
              ["imagemin-webp", { quality: 75 }],
            ],
          },
        },
      }),
    ],
  },

  /**
   * Output configuration
   *
   * Defines the output location and filename format for the generated files.
   * Ensures clean builds and organizes assets in structured directories.
   */
  output: {
    assetModuleFilename: "assets/[name][ext]",
    filename: "app/js/bundle-[contenthash].js",
    path: path.resolve(__dirname, "dist"),
  },

  /**
   * Plugins
   *
   * Defines plugins to extend Webpack's functionality. Includes:
   * - HtmlWebpackPlugin: Injects the JavaScript bundle into the HTML template
   *   and uses dynamic metadata from constants.
   * - WebpackManifestPlugin: Generates a manifest for bundled assets.
   */
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/views/index.html",
      title: SITE_TITLE,
      description: APP_DESCRIPTION,
      keywords: SEO.keywords,
      author: AUTHOR_INFO.name,
      website_url: SITE_URL,
      website_banner: SEO.websiteBanner,
      og_title: SEO.ogTitle,
      twitter_title: SEO.twitterTitle,
      theme_color: THEME_SETTINGS.primaryColor,
      msapplication_tile_color: THEME_SETTINGS.msApplicationTileColor,
      filename: "index.html",
      criticalCSS: fetch_critical_css(),
    }),
    // Only apply CleanWebpackPlugin in production mode
    ...(process.env.NODE_ENV === "production"
      ? [
          new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ["**/*", "!favicons/**"],
            cleanAfterEveryBuildPatterns: [], // Prevent accidental cleaning
          }),
        ]
      : []),
    new WebpackManifestPlugin({
      publicPath: "/",

      // Filter out ANY file object where file.path is undefined
      filter: (file) => {
        if (!file.path) {
          console.warn(
            `Manifest filter: skipping undefined-path asset → ${file.name}`,
          );
          return false;
        }
        return true;
      },

      generate: (seed, files, entries) => {
        // (At this point, every file in “files” will have a defined file.path.)
        const manifest = files.reduce((acc, file) => {
          // file.path is guaranteed to be a string here
          acc[file.name] = file.path;
          return acc;
        }, seed);

        // Include any favicons in dist/favicons
        const faviconsPath = path.resolve(__dirname, "dist/favicons");
        if (fs.existsSync(faviconsPath)) {
          const favicons = fs.readdirSync(faviconsPath).map((filename) => ({
            src: `favicons/${filename}`,
            sizes: filename.match(/\d+x\d+/)?.[0] || "any",
            type: `image/${path.extname(filename).slice(1)}`,
          }));

          manifest.icons = favicons;
        }

        return manifest;
      },
    }),
    new TranslationWebpackPlugin({
      file: "index.html",
    }),
  ],

  /**
   * Resolve configuration
   *
   * Adds path aliases for cleaner imports.
   */
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app/"),
      "@components": path.resolve(__dirname, "src/app/components"),
      "@constants": path.resolve(__dirname, "src/app/constants"),
      "@fonts": path.resolve(__dirname, "src/app/fonts"),
      "@plugins": path.resolve(__dirname, "src/app/plugins"),
      "@styling": path.resolve(__dirname, "src/app/scss"),
      "@utils": path.resolve(__dirname, "src/app/utils"),
    },
    extensions: [".js", ".json"],
  },
};
