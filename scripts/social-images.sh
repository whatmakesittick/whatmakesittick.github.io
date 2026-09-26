#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

background='#0b0d10'
favicon=public/favicon.svg
icons=public/icons

card_output() {
  if [ "$1" = site ]; then
    echo public/social/og-image.png
  else
    echo "explainers/$1/public/social/og-image.png"
  fi
}

mkdir -p "$icons"
rsvg-convert --width 180 --height 180 --background-color "$background" \
  --output "$icons/apple-touch-icon.png" "$favicon"
for size in 192 512; do
  rsvg-convert --width "$size" --height "$size" --output "$icons/icon-$size.png" "$favicon"
done
oxipng --opt 4 --strip safe "$icons"/*.png

for template in scripts/cards/*.html; do
  name=$(basename "$template" .html)
  if [ $# -gt 0 ] && [ "$1" != "$name" ]; then
    continue
  fi
  card=$(card_output "$name")
  mkdir -p "$(dirname "$card")"
  npx --yes playwright screenshot --viewport-size '1200, 630' \
    --wait-for-selector 'body[data-ready]' "file://$PWD/$template" "$card"
  pngquant --force --quality 70-90 --output "$card" "$card"
  oxipng --opt 4 --strip safe "$card"
done
