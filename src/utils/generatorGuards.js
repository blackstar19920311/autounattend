/** Final safety pass for known generator invariants. */
export function applyGeneratorGuards(xml, config) {
  let result = xml;

  // AutoCD is emitted as one RunSynchronousCommand per DISKPART line. The old
  // guard searched for a newline-joined script, so it never matched the output.
  // Normalize the actual emitted command nodes instead.
  if (config?.partitioning?.mode === 'autocd') {
    const oldLines = [
      'CREATE PARTITION PRIMARY',
      'SHRINK MINIMUM=1000',
      'FORMAT QUICK FS=NTFS LABEL="Adatok"',
      'CREATE PARTITION PRIMARY',
      'FORMAT QUICK FS=NTFS LABEL="Recovery"',
      'SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"',
      'GPT ATTRIBUTES=0x8000000000000001',
    ];
    const safeLines = [
      'CREATE PARTITION PRIMARY',
      'FORMAT QUICK FS=NTFS LABEL="Adatok"',
      'ASSIGN LETTER=D',
      'SHRINK MINIMUM=1000',
      'CREATE PARTITION PRIMARY SIZE=1000',
      'FORMAT QUICK FS=NTFS LABEL="Recovery"',
      'SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"',
    ];
    const pathPattern = /(<Path>cmd \/c (?:&gt;|&gt;&gt;)X:\\diskpart\.txt echo )([^<]*)(<\/Path>)/g;
    let candidateIndex = 0;
    result = result.replace(pathPattern, (full, prefix, encodedLine, suffix) => {
      const line = encodedLine.replace(/&quot;/g, '"');
      if (candidateIndex === 0) {
        if (line !== oldLines[0]) return full;
      } else if (line !== oldLines[candidateIndex]) {
        candidateIndex = 0;
        return full;
      }
      const replacement = safeLines[candidateIndex].replace(/"/g, '&quot;');
      candidateIndex += 1;
      if (candidateIndex === oldLines.length) candidateIndex = 0;
      return `${prefix}${replacement}${suffix}`;
    });
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
