# Windows 11 25H2 Unattend Generator

This branch deliberately generates a **minimal, hardened answer file** for Windows 11 25H2. It does not bypass TPM, Secure Boot, RAM or CPU requirements, and it does not embed PowerShell, domain credentials, Wi-Fi keys, Office keys or software-install commands.

Partitioning, WinRE sizing, BitLocker, drivers, Wi-Fi, Entra ID, Intune enrollment, domain join and application deployment must be performed by Windows Setup, Microsoft Intune, Windows Autopilot, Configuration Manager or another managed deployment system. The generated file does not wipe disks or select a partition automatically. That is intentional: a browser cannot safely inspect the target device or guarantee a supported 25H2 recovery layout.

Password values use Microsoft's documented unattend obfuscation format (`PlainText=false`), which is not encryption. Treat generated files as secrets, use one-time credentials, and delete the answer file and copied Panther artifacts after deployment.

## Local verification

```sh
npm install --ignore-scripts
npm test
npm run build
```

The CI workflow runs the regression suite, production build and a forbidden-primitive scan on pull requests before deployment.
