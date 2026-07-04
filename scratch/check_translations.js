import fs from 'fs';
import { translations } from '../src/i18n/translations.js';

const huKeys = Object.keys(translations.hu);
const enKeys = Object.keys(translations.en);

const missingInEn = huKeys.filter(k => !enKeys.includes(k));
const missingInHu = enKeys.filter(k => !huKeys.includes(k));

const emptyInHu = huKeys.filter(k => !translations.hu[k] || translations.hu[k].trim() === '');
const emptyInEn = enKeys.filter(k => !translations.en[k] || translations.en[k].trim() === '');

console.log('--- Missing in English ---');
console.log(missingInEn);
console.log('--- Missing in Hungarian ---');
console.log(missingInHu);
console.log('--- Empty in English ---');
console.log(emptyInEn);
console.log('--- Empty in Hungarian ---');
console.log(emptyInHu);
