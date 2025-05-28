const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');
const { TRANSLATIONS } = require('./src/app/constants/Snippets');

class TranslationWebpackPlugin {
  constructor(options) {
    this.options = options || {};
    this.language = 'en';
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('TranslationWebpackPlugin', (compilation, callback) => {
      const htmlFile = this.options.file || 'index.html';
      const asset = compilation.assets[htmlFile];

      if (!asset) {
        console.warn(`ƛ :: FILE NOT FOUND - ${htmlFile}`);
        return callback();
      }

      const rawHtml = asset.source();
      const $ = cheerio.load(rawHtml);

      $('[trans]').each((_, element) => {
        const el = $(element);
        const transKey = el.attr('trans');
        const translatedHTML = this._getTranslation(transKey);

        if (translatedHTML) {
          el.html(translatedHTML);
          console.log(`ƛ :: TRANSLATED - ${transKey.toUpperCase()} -> ${translatedHTML}`);
        } else {
          console.warn(`ƛ :: MISSING TRANSLATION - ${transKey.toUpperCase()} [EN]`);
        }
      });

      const updatedHtml = $.html();

      compilation.assets[htmlFile] = {
        source: () => updatedHtml,
        size: () => updatedHtml.length
      };

      console.log(`ƛ :: HTML INJECTION COMPLETE - LANGUAGE SET TO [${this.language.toUpperCase()}]`);
      callback();
    });
  }

  _getTranslation(pathKey) {
    const pathParts = pathKey.split('.');
    let result = TRANSLATIONS[this.language];

    for (const part of pathParts) {
      if (result && result.hasOwnProperty(part)) {
        result = result[part];
      } else {
        return null;
      }
    }

    return typeof result === 'string' ? result : null;
  }
}

module.exports = TranslationWebpackPlugin;
