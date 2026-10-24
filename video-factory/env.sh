# source video-factory/env.sh  → ffmpeg do Remotion no PATH e Brave como navegador do HyperFrames
VF="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$VF/bin:$VF/node_modules/.bin:$PATH"
export HYPERFRAMES_BROWSER_PATH="${HYPERFRAMES_BROWSER_PATH:-/Applications/Brave Browser.app/Contents/MacOS/Brave Browser}"
