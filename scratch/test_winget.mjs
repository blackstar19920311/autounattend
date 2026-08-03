import fs from 'fs';
import { generateXml } from '../src/utils/generateXml.js';

const config = {
  usePresets: false,
  installLanguage: 'hu',
  architecture: 'amd64',
  addEnglishKeyboard: false,
  partitioning: { enabled: true, mode: 'auto' }, // <--- AUTO MODE
  customScripts: {
    wingetApps: 'custom',
    wingetCustomApps: [
      { id: 'CodecGuide.K-LiteCodecPack.Standard', location: 'D:\\Apps\\K-LiteCodecPack' }
    ]
  }
};

const xml = generateXml(config);
fs.writeFileSync('scratch/test_out.xml', xml, 'utf8');
console.log('XML generated.');
