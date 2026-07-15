import { XMLValidator } from 'fast-xml-parser';
import { generateXml } from './src/utils/generateXml.js';
import { getDefaultConfig } from './src/data/defaultConfig.js';

async function validate() {
  const baseConfig = getDefaultConfig();
  let errors = [];

  const configsToTest = [
    { name: 'Default', config: baseConfig },
    // Mindent kikapcsolva
    { name: 'Minden_Kikapcsolva', config: { ...baseConfig, disableDefender: false, disableTelemetry: false, bypassRequirements: false, removeBloatware: false, installEdge: true, autoLogin: false } },
    // Mindent bekapcsolva
    { name: 'Minden_Bekapcsolva', config: { ...baseConfig, disableDefender: true, disableTelemetry: true, bypassRequirements: true, removeBloatware: true, disableUpdates: true, removeCopilot: true, optimizePerformance: true, removeOneDrive: true, applyTweaks: true } },
    // Érdekes esetek
    { name: 'Egyedi_Jelszo', config: { ...baseConfig, autoLogin: true, username: 'TestUser', password: 'TestPassword123' } },
  ];

  for (const testCase of configsToTest) {
    try {
      const xmlString = generateXml(testCase.config);
      
      // Syntax ellenőrzés
      const result = XMLValidator.validate(xmlString, {
        allowBooleanAttributes: true
      });
      
      if (result !== true) {
        errors.push(`[${testCase.name}] Érvénytelen XML formátum! Hiba: ${result.err.msg} a sorban: ${result.err.line}`);
      }
      
      // Speciális tartalmi ellenőrzések
      if (!xmlString.includes('<unattend')) {
         errors.push(`[${testCase.name}] Hiányzik a gyökér <unattend> elem.`);
      }
      if (xmlString.includes('undefined')) {
         errors.push(`[${testCase.name}] 'undefined' szó szerepel a kimenetben, ami változó feloldási hibára utalhat.`);
      }
      if (xmlString.includes('null')) {
         // Some nulls might be okay, but usually in XML tags it's a bug
         if (xmlString.match(/<[^>]*null[^>]*>/)) {
           errors.push(`[${testCase.name}] 'null' szerepel egy XML tagen belül.`);
         }
      }
      
    } catch (e) {
      errors.push(`[${testCase.name}] JavaScript futási hiba a generálás során: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    console.log("=== TALÁLT HIBÁK ===");
    errors.forEach(e => console.log(e));
  } else {
    console.log("Minden XML generálási teszt sikeres! Formátumilag az összes vizsgált XML helyes.");
  }
}

validate();
