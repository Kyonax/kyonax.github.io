/**
 * @file core-functionality.plugin.js - CV Buttons JS Functionality
 *
 * Imports and replace the href <a> tag parameter by the actual
 * CV files to be Downloaded on click.
 *
 * node.js-v20.18.1
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
 * @dependencies
 * - CV_BUTTON from "@constants/Data"
 * - CV_EN from "../../cv/cv_cristian_d_moreno_en.pdf"
 * - CV_ES from "../../cv/cv_cristian_d_moreno_es.pdf"
 */
import CV_EN from "../../cv/cv_cristian_d_moreno_en.pdf";
import CV_ES from "../../cv/cv_cristian_d_moreno_es.pdf";

import { CV_BUTTON } from "@constants/Data";

const init = () => {
  const link_en = document.getElementById(CV_BUTTON.EN_ID);
  const link_es = document.getElementById(CV_BUTTON.ES_ID);

  if (link_en && CV_EN) {
    link_en.href = CV_EN;
    console.log("ƛ :: CV FILE LOADED - " + _get_filename(CV_EN));
  } else {
    console.log("ƛ :: CV FILE LOAD FAILED - " + _get_filename(CV_EN));
  }

  if (link_es && CV_ES) {
    link_es.href = CV_ES;
    console.log("ƛ :: CV FILE LOADED - " + _get_filename(CV_ES));
  } else {
    console.log("ƛ :: CV FILE LOAD FAILED - " + _get_filename(CV_ES));
  }
};

const _get_filename = (path) => {
  return path.split("/").pop().toUpperCase();
};

export default { init };
