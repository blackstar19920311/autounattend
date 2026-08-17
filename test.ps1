reg load "HKU\TestHive" "C:\Users\Default\NTUSER.DAT"
reg add "HKU\TestHive\Software\test" /v {20D04FE0-3AEA-1069-A2D8-08002B30309D} /t REG_DWORD /d 0 /f
reg unload "HKU\TestHive"
