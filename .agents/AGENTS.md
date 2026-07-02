
## GitHub Deploy Rule
If the user types the exact word 'GITHUB' (in all caps), you must execute the following sequence without asking: delete the local 'dist' folder, run 'npm run build' to recompile, then navigate to 'dist', delete its '.git' folder, re-initialize git, and force push the contents to the user's GitHub repository 'origin main' to overwrite the existing files.
