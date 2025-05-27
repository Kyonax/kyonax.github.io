/**
 * @file index.js - AppIndex
 *
 * This file serves as the main entry point for the application. It initializes
 * global styles, registers custom web components, and preloads image assets into
 * memory to optimize site performance.
 *
 * node.js-v20.18.1
 *
 * @author Cristian Moreno (Kyonax)
 * @contact iamkyo@kyo.wtf
 * @date 2025-01-19
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
 * - load_images from "@utils/load-images.util"
 *
 * @usage
 * Include this file as the entry point in the Webpack configuration to
 * ensure the application is properly initialized during build and runtime.
 */
import "@styling/main.scss";

// Initialize all the Custom Components
const comp_context = require.context("@components", false, /\.component\.js$/);
comp_context.keys().forEach((component_path) => {
  comp_context(component_path);
});

// Intitialize all the Utils and Core Methods
import { load_images } from "@utils/load-images.util";
load_images();

// Initializing all the Plugins for the Web App
const plugins_context = require.context("@plugins", true, /\.plugin\.js$/);
plugins_context.keys().forEach((plugin_path) => {
  const plugin_module = plugins_context(plugin_path);
  const plugin_name = plugin_path
    .split("/")
    .slice(-2, -1)[0]
    .replace(/-/g, "_")
    .toUpperCase();

  if (plugin_module?.default?.init) {
    plugin_module.default.init();
    console.log("ƛ :: PLUGIN INITIALIZED - " + plugin_name);
  } else {
    console.log("ƛ :: PLUGIN LOAD FAILED - " + plugin_name);
  }
});
