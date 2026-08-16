import { validateGeneratedXml } from './generateXml.js';

// This module is an assertion boundary only. It never rewrites generated XML.
export function applyGeneratorGuards(xml) { return validateGeneratedXml(xml); }
export function assertGeneratorInvariants(xml) { return validateGeneratedXml(xml); }
