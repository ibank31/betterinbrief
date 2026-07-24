#!/data/data/com.termux/files/usr/bin/bash
set -e
SLUG="$1"; WHEN="$2"
if [ -z "$SLUG" ]; then
  echo 'Pakai: bash ~/bin/binb-publish.sh <episode> ["YYYY-MM-DD HH:MM" waktu WIB, opsional]'
  exit 1
fi
REPO="ibank31/betterinbrief"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [ -n "$WHEN" ]; then
  NB=$(date -u -d "TZ=\"Asia/Jakarta\" $WHEN" +%Y-%m-%dT%H:%M:%SZ)
  printf '{"episode":"%s","platforms":["instagram"],"requestedBy":"iqbal-termux","at":"%s","notBefore":"%s","done":false}\n' "$SLUG" "$NOW" "$NB" > "$HOME/.binb-pub.json"
else
  printf '{"episode":"%s","platforms":["instagram"],"requestedBy":"iqbal-termux","at":"%s","done":false}\n' "$SLUG" "$NOW" > "$HOME/.binb-pub.json"
fi
CONTENT=$(base64 -w0 "$HOME/.binb-pub.json")
SHA=$(gh api "repos/$REPO/contents/trigger/publish-request.json" --jq .sha 2>/dev/null || echo "")
if [ -n "$SHA" ]; then
  gh api -X PUT "repos/$REPO/contents/trigger/publish-request.json" -f message="publish: $SLUG ($NOW)" -f content="$CONTENT" -f sha="$SHA" > /dev/null
else
  gh api -X PUT "repos/$REPO/contents/trigger/publish-request.json" -f message="publish: $SLUG ($NOW)" -f content="$CONTENT" > /dev/null
fi
if [ -n "$WHEN" ]; then
  echo "Antrean terkirim: $SLUG akan tayang otomatis setelah $WHEN WIB"
else
  echo "Trigger terkirim: $SLUG tayang SEKARANG"
fi
