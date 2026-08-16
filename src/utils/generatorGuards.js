/** Final safety pass for known generator invariants. */
export function applyGeneratorGuards(xml, config) {
  let result = xml;
  // DISKPART must format the data volume before shrinking it, and must expose D:.
  result = result.replace(
    'CREATE PARTITION PRIMARY\\nSHRINK MINIMUM=1000\\nFORMAT QUICK FS=NTFS LABEL="Adatok"',
    'CREATE PARTITION PRIMARY\\nFORMAT QUICK FS=NTFS LABEL="Adatok"\\nASSIGN LETTER=D\\nSHRINK MINIMUM=1000'
  );
  // Never hide wireless setup when the selected flow still needs a manual network step.
  if (config?.wifi?.mode === 'manual') {
    result = result.replace('<HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>', '<HideWirelessSetupInOOBE>false</HideWirelessSetupInOOBE>');
  }
  return result;
}
