# Windows 11 25H2 Start menu and Office deployment

This branch isolates the first diagnostic hardening step for the Office/Start menu issue.

The check script records the Windows build, required XAML manifests, per-user AppX registration for the Start dependencies, service state, and recent AppX deployment events. Run it in the affected local or domain user session before and after Office deployment.

The Microsoft-documented dependency manifests are:

- `MicrosoftWindows.Client.CBS_cw5n1h2txyewy`
- `Microsoft.UI.Xaml.CBS_8weky3d8bbwe`
- `MicrosoftWindows.Client.Core_cw5n1h2txyewy`

This does not delete Start state, stop `StartMenuExperienceHost`, or modify the user profile. It is intentionally safe to run while diagnosing Windows 11 25H2 provisioning issues.
