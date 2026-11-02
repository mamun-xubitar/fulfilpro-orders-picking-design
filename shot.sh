#!/usr/bin/env bash
# Render an artboard HTML to PNG with headless Chrome.
set -e
f="$1"; out="$2"; w="${3:-1280}"; h="${4:-800}"; scale="${5:-2}"
google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor="$scale" --window-size="$w,$h" \
  --screenshot="$out" --virtual-time-budget=2500 "file://$PWD/$f" >/dev/null 2>&1
