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

import "@components/blast-image.component";
import "@components/class-scheduler.component";

import cv_en from './cv/cv_cristian_d_moreno_en.pdf';
import cv_es from './cv/cv_cristian_d_moreno_es.pdf';

const link_en = document.getElementById('download-en');
const link_es = document.getElementById('download-es');

link_en.href = cv_en;
link_es.href = cv_es;

import { load_images } from "@utils/load-images.util";

load_images();
