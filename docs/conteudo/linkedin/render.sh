#!/bin/zsh
# Renderiza capa (2256x382) e logo (800x800) da Company Page com o Brave headless.
cd "$(dirname "$0")"
B="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
"$B" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=6000 --window-size=1128,191 --screenshot="$PWD/capa.png" "file://$PWD/capa.html" >/dev/null 2>&1
"$B" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=4000 --window-size=400,400 --screenshot="$PWD/logo.png" "file://$PWD/logo.html" >/dev/null 2>&1
