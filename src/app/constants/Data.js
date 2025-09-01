/**
 * @file Data.js - Data
 *
 * This file contains all the global constants used throughout the application.
 * These constants are critical for SEO, social media, and
 * general configuration of the website.
 *
 * node.js-v20.17.0
 *
 * @author Cristian Moreno (Kyonax)
 * @contact iamkyo@kyo.wtf
 * @date 2025-05-27
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
 * @usage
 * This file should be called on this way:
 * - const { CONSTANTs } = require('path-to-this-file.constant.js')
 */
module.exports = {
  // General Application Info
  APP_NAME: "Kyo's Personal Website", // The name of the application
  APP_VERSION: "1.0.0", // Current version of the application
  DEFAULT_LANGUAGE: "en", // Default language for the application
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // Max upload size in bytes (10MB)
  SUPPORTED_LANGUAGES: ["en", "es", "fr"], // Supported languages for the application

  // Author Information (includes email)
  AUTHOR_INFO: {
    name: "Cristian Moreno (Kyonax)", // Author of the website
    email: "support@kyo.wtf", // Support email for the application
  },

  // SEO and Social Media Metadata
  SEO: {
    description:
      "Kyonax, con +7 años de experiencia, crea sitios únicos y futuristas. Transforma tu idea en una experiencia digital impactante. ¡Da click ahora y lleva tu marca al siguiente nivel!", // Main description for SEO
    keywords: ["KYO-T", "kyo", "kyonax", "kyonax_on_tech", "kyo-wtf", "京"], // SEO keywords
    ogTitle: "¡70% de descuento en todas las páginas web!", // Open Graph title for social media
    twitterTitle: "¡70% de descuento en todas las páginas web!", // Twitter card title
    title: "I'm Kyo", // Website title
    websiteBanner: "assets/seo_banner.webp", // Website banner image
    websiteUrl: "https://kyonax.github.io/kyo-web-online/", // Website URL
  },

  // Theme Settings
  THEME_SETTINGS: {
    color: "#ffffff", // Theme color for the application
    msApplicationTileColor: "#ffffff", // MS Tile color for Windows
    primaryColor: "#ff5733", // Primary color for UI
    secondaryColor: "#4a90e2", // Secondary color for UI
    backgroundColor: "#f4f4f4", // Background color for the website
  },

  // Favicon and Site Configuration
  FAVICON: {
    path: "src/assets/favicon.png", // Path to the favicon image
    dest: "dist/favicons",
    grunt: {
      path: "/",
      appName: "Kyo Web Online", // Name of your app
      appShortName: "Kyo", // Short name of your app
      appDescription: "Cristian Moreno (Kyonax)", // Description of your app
      developerName: "Cristian Moreno", // Developer name
      developerURL: "https://kyonax.github.io/kyo-web-online/", // Developer URL
      dir: "auto",
      url: "https://kyonax.github.io/kyo-web-online/", // URL for your site
      display: "standalone", // How the app should be displayed
      orientation: "any", // Orientation of the icons
      start_url: "/?homescreen=1", // Start URL of the app
      version: 1.0, // Version of the favicons
      logging: false,
      icons: {
        android: true, // Create Android homescreen icon. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        appleIcon: true, // Create Apple touch icons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        appleStartup: false, // Create Apple startup images. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        coast: false, // Create Opera Coast icon. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        favicons: true, // Create regular favicons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        firefox: true, // Create Firefox OS icons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        windows: true, // Create Windows 8 tile icons. `boolean` or `{ offset, background, mask, overlayGlow, overlayShadow }`
        yandex: false,
      },
    },
  },

  // Application URL and Metadata
  SITE_URL: "https://kyonax.github.io/kyo-web-online/", // Main URL of the website
  SITE_TITLE: "I'm Kyo", // The site's title (from SEO object)
  APP_DESCRIPTION:
    "Kyonax, con +7 años de experiencia, crea sitios únicos y futuristas. Transforma tu idea en una experiencia digital impactante. ¡Da click ahora y lleva tu marca al siguiente nivel!", // The app description (from SEO object)

  // Components Information
  CUSTOM_COMPONENT: {
    BLAST_IMG: {
      name: "blast-image",
    },
    CLASS_SCHEDULER_COMPONENT: {
      name: "class-scheduler",
    },
  },

  // CV-BUTTONs Plugin Data
  CV_BUTTON: {
    EN_ID: "download-en",
    ES_ID: "download-es",
  },

  // Add this technologies array (example items)
  // Replace your existing TECHNOLOGIES array in Data.js with this:

  TECHNOLOGIES: [
    {
      id: "html",
      name: { en: "HTML5", es: "HTML5" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "css",
      name: { en: "CSS / SASS", es: "CSS / SASS" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "js",
      name: { en: "JavaScript", es: "JavaScript" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "ts",
      name: { en: "TypeScript", es: "TypeScript" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "react",
      name: { en: "React", es: "React" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "next",
      name: { en: "Next.js", es: "Next.js" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "vue",
      name: { en: "Vue.js", es: "Vue.js" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "symfony",
      name: { en: "Symfony (PHP)", es: "Symfony (PHP)" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "node",
      name: { en: "Node.js", es: "Node.js" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "express",
      name: { en: "Express.js", es: "Express.js" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "docker",
      name: { en: "Docker", es: "Docker" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "git",
      name: { en: "Git", es: "Git" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "aws",
      name: { en: "AWS (Cloud)", es: "AWS (Nube)" },
      iconGlyph: "",
      iconClass: "",
    },
    {
      id: "jest",
      name: { en: "Jest (Testing)", es: "Jest (Pruebas)" },
      iconGlyph: "",
      iconClass: "",
    },
  ],
};
