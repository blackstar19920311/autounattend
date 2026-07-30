#!/usr/bin/env bash
#
# A `new_decoded/`, `schneegans_decoded/` és `teszt_decoded/` mappák generált
# debug artefaktumokat tartalmaznak (összesen ~310 fájl). Ezeket a .gitignore
# már kizárja, de korábban be lettek commitolva, ezért egyszer ki kell venni
# őket a verziókezelőből.
#
# Ez EGYETLEN committal megteszi. (Fájlonkénti törlés a GitHub API-n keresztül
# 300+ külön commitot jelentene, ezért ez a helyes út.)
#
# Futtatás a repó gyökeréből:
#   bash scripts/cleanup-repo.sh

set -euo pipefail

if [ ! -d .git ]; then
  echo "Ezt a szkriptet a repó gyökeréből kell futtatni." >&2
  exit 1
fi

DIRS=(new_decoded schneegans_decoded teszt_decoded)
REMOVED=0

for dir in "${DIRS[@]}"; do
  if git ls-files --error-unmatch "$dir" >/dev/null 2>&1; then
    echo "Eltávolítás a verziókezelőből: $dir"
    git rm -r --quiet --cached "$dir"
    rm -rf "$dir"
    REMOVED=$((REMOVED + 1))
  else
    echo "Kihagyva (nincs verziókezelve): $dir"
  fi
done

if [ "$REMOVED" -eq 0 ]; then
  echo "Nincs mit takarítani."
  exit 0
fi

git commit -m "chore: generalt debug artefaktumok eltavolitasa a verziokezelesbol"
echo
echo "Kesz. Ellenorizd a 'git log -1 --stat' kimenetet, majd pushold."
