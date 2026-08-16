/** Final safety pass for known generator invariants. */
export function applyGeneratorGuards(xml, config) {
  let result = xml;

  // AutoCD must format and explicitly assign the data volume before shrinking it.
  // The previous guard looked for an ASSIGN D command that the generator never emitted.
  if (config?.partitioning?.mode === 'autocd') {
    const oldSequence = [
      'CREATE PARTITION PRIMARY',
      'SHRINK MINIMUM=1000',
      'FORMAT QUICK FS=NTFS LABEL="Adatok"',
      'CREATE PARTITION PRIMARY',
      'FORMAT QUICK FS=NTFS LABEL="Recovery"',
      'SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"',
      'GPT ATTRIBUTES=0x8000000000000001',
    ].join('\\n');
    const safeSequence = [
      'CREATE PARTITION PRIMARY',
      'FORMAT QUICK FS=NTFS LABEL="Adatok"',
      'ASSIGN LETTER=D',
      'SHRINK MINIMUM=1000',
      'CREATE PARTITION PRIMARY SIZE=1000',
      'FORMAT QUICK FS=NTFS LABEL="Recovery"',
      'ASSIGN LETTER=R',
      'SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"',
      'GPT ATTRIBUTES=0x8000000000000001',
    ].join('\\n');
    result = result.replace(oldSequence, safeSequence);
  }

  // Manual Wi-Fi means the user must be able to reach the network picker in OOBE.
  if (config?.wifi?.mode === 'manual') {
    result = result.replace(
      '<HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>',
      '<HideWirelessSetupInOOBE>false</HideWirelessSetupInOOBE>',
    );
  }

  return result;
}
