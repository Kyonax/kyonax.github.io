/**
 * @file load-images.util.js - LoadImages
 *
 * Manages the loading and caching of image assets from a predefined folder.
 * It supports loading WebP and fallback formats, and allows retrieval of
 * `<picture>` elements by their unique image IDs for efficient reuse across
 * the application.
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
 * - ERROR_MSG from "@constants/Error"
 *
 * @usage
 * Import and call `load_images()` to preload and cache images from the assets folder.
 * Use `get_image_by_id(id)` to retrieve a `<picture>` element by its unique image ID
 * after images are loaded.
 */
import { ERROR_MSG } from "@constants/Error";

// Cached images store
let images_cache = null;

/**
 * Load Images
 *
 * Loads images from the assets folder into memory and prepares `<picture>` elements.
 * Processes images in the specified folder, identifying WebP and fallback formats,
 * and creates an object keyed by image IDs for efficient access.
 *
 * @returns {Object} - A collection of image IDs mapped to their `<picture>` elements.
 */
const load_images = () => {
  if (images_cache) {
    console.log("ƛ :: IMAGE CACHE SUCCESSFULLY LOADED - ", images_cache);
    return images_cache;
  }

  const _images_context = require.context(
    "../../assets/app", // Path to the assets folder
    false,
    /\.(png|jpe?g|gif|webp)$/, // Supported image formats
  );

  const images = {}; // Store `<picture>` elements by ID
  const variants = {}; // Store image variants for responsive `srcset`
  const sorted_images = _images_context.keys().sort(); // Sort image paths for consistency

  sorted_images.forEach((image_path) => {
    const base_image_path = image_path.replace(/\.(png|jpe?g|gif|webp)$/, ""); // Remove extension
    const image_id = base_image_path.split("/").pop(); // Extract image ID
    const variant_match = image_path.match(/-\d+/g); // Detect variant numbering

    if (variant_match) {
      // Process variant images
      const original_id = image_id.replace(variant_match.join(","), ""); // Base ID without variant
      variants[original_id] = variants[original_id] || [];
      variants[original_id].push(image_path); // Store variant for later processing
      return; // Skip main processing for variants
    }

    // e.g. '/kyo-web-online/page.html' → ['kyo-web-online', 'page.html'] → base = '/kyo-web-online'
    const pathSegs = window.location.pathname.split('/').filter(Boolean);
    const baseRoute = pathSegs.length > 1 ? `/${pathSegs[0]}` : '';

    const webp_src_set = variants[image_id]
      ? variants[image_id]
          .map(
            (variant) =>
            `${baseRoute}/assets/${variant.replace(/\.(png|jpe?g|gif|webp)$/, "")}.webp ${variant.match(/\d+/g)}w`,
          )
          .join(", ")
      : `${baseRoute}/assets/${base_image_path}.webp`;

    const fallback_src = _images_context(image_path); // Fallback image path

    const picture_html = `
      <picture id="${image_id}">
        <source type="image/webp" srcset="${webp_src_set}">
        <img src="${fallback_src}" alt="${image_id}">
      </picture>
    `;

    const template = document.createElement("template");
    template.innerHTML = picture_html.trim();
    images[image_id] = template.content.firstChild; // Add `<picture>` to collection
  });

  images_cache = images; // Cache the loaded images
  return images;
};

/**
 * Get Image By ID
 *
 * Retrieves a `<picture>` element by its unique image ID.
 *
 * @description
 * Ensures images are loaded into memory and provides a method to fetch specific
 * `<picture>` elements using their IDs.
 *
 * @param {string} id - The unique ID of the image (filename without extension).
 * @returns {HTMLElement|null} - The corresponding `<picture>` element or `null` if not found.
 */
const get_image_by_id = (id) => {
  if (!images_cache) {
    console.warn(ERROR_MSG.IMGs_NOT_LOADED_YET);
    load_images(); // Load images if not already cached
  }
  return images_cache ? images_cache[id] : null;
};

export { load_images, get_image_by_id };
