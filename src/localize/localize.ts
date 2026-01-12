import * as en from './languages/en.json';
import * as nb from './languages/nb.json';
import * as sk from './languages/sk.json';

const languages: any = {
  en: en,
  nb: nb,
  sk: sk,
};

export function localize(string: string, search: string = '', replace = '') {

  const lang = (localStorage.getItem('selectedLanguage') || 'en').replace(/['"]+/g, '').replace('-', '_');

  let translated: string;

  try {
    translated = string.split('.').reduce((o, i) => o[i], languages[lang]);
  } catch (e) {
    translated = string.split('.').reduce((o, i) => o[i], languages['en']);
  }

  if (translated === undefined) translated = string.split('.').reduce((o, i) => o[i], languages['en']);

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
}
