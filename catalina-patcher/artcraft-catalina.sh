#!/usr/bin/env bash
# ArtCraft desktop for macOS 10.15 Catalina (Intel), built from ArtCraft's own source.
#
#   bash artcraft-catalina.sh check <path to ArtCraft.app>   what macOS a built app asks for
#   bash artcraft-catalina.sh tags                           list release tags to pick from
#   bash artcraft-catalina.sh build <tag>                    build that tag for Catalina
#   bash artcraft-catalina.sh scan                           look for macOS 11+ functions
#
# Safe by design: no sudo, nothing downloaded and run unpinned, every change checked,
# and it only ever deletes inside its own work folder.
set -euo pipefail

REPO_URL="https://github.com/storytold/artcraft.git"
WORK="${ARTCRAFT_CATALINA_WORK:-$HOME/artcraft-catalina}"
SRC="$WORK/src"
APP_DIR_REL="crates/desktop/artcraft"
TARGET="x86_64-apple-darwin"
MIN_MACOS="10.15"

# Names of system functions and frameworks that Catalina doesn't have (macOS 11 and later).
NEWER_APIS=(
  ScreenCaptureKit SCShareableContent SCStream
  CGPreflightScreenCaptureAccess CGRequestScreenCaptureAccess
  AVFAudio AudioHardwareCreateProcessTap AudioHardwareDestroyProcessTap
  UniformTypeIdentifiers UTType
  UserNotifications UNUserNotificationCenter
  NSWindowToolbarStyle setToolbarStyle
)

say()  { printf '%s\n' "$*"; }
stop() { printf 'Stopped: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || stop "$1 is missing. $2"
}

# ---- check: read what a built app asks for --------------------------------------------------
cmd_check() {
  local app="${1:-}"
  [[ -d "$app" && "$app" == *.app ]] || stop "give the path to an .app, for example /Applications/ArtCraft.app"
  local plist="$app/Contents/Info.plist"
  [[ -f "$plist" ]] || stop "no Info.plist in $app"
  say "App:                $app"
  say "Asks for at least:  $(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$plist" 2>/dev/null || echo 'not set')"
  local exe
  exe="$app/Contents/MacOS/$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$plist")"
  say "Built for:          $(lipo -archs "$exe" 2>/dev/null || echo unknown)"
  say "Lowest macOS per part (minos):"
  otool -arch all -l "$exe" | awk '/^.*\(architecture/ {arch=$0} /LC_BUILD_VERSION/ {f=1} f && /minos/ {print "  " arch " " $0; f=0}'
  say "System frameworks it needs that this Mac lacks:"
  local missing=0 fw
  while read -r fw; do
    if [[ "$fw" == /System/* && ! -e "$fw" ]]; then say "  MISSING $fw"; missing=1; fi
  done < <(otool -L "$exe" | awk 'NR>1 {print $1}')
  [[ $missing -eq 0 ]] && say "  none"
  return 0
}

# ---- tags: list releases to pin to ----------------------------------------------------------
cmd_tags() {
  need git "Install the Xcode command line tools: xcode-select --install"
  git ls-remote --tags --refs "$REPO_URL" | awk '{sub("refs/tags/","",$2); print $2}' | grep '^artcraft-v' | sort -V | tail -20
}

# ---- scan: search the pinned source and its Rust dependencies for newer macOS functions ----
cmd_scan() {
  [[ -d "$SRC/.git" ]] || stop "no source yet. Run: bash $0 build <tag>"
  say "Searching ArtCraft's source and its Rust dependencies for macOS 11+ functions..."
  local pattern
  pattern="$(IFS='|'; echo "${NEWER_APIS[*]}")"
  local where=("$SRC")
  [[ -d "$HOME/.cargo/registry/src" ]] && where+=("$HOME/.cargo/registry/src")
  grep -rIlE --include='*.rs' --include='*.m' --include='*.swift' --include='*.c' "$pattern" "${where[@]}" 2>/dev/null \
    | sed "s#^$HOME#~#" | sort | head -100 || true
  say "Each file above may need a patch, or may only use the function when it exists. Check them."
}

# ---- build: pinned clone, Intel only, minimum 10.15, ad-hoc signed --------------------------
cmd_build() {
  local tag="${1:-}"
  [[ -n "$tag" ]] || stop "pick a version. See them with: bash $0 tags"
  [[ "$(uname -s)" == Darwin ]] || stop "this runs on a Mac"
  [[ "$(uname -m)" == x86_64 ]] || stop "this is for Intel Macs; Apple silicon Macs run newer macOS"
  need git   "Install the Xcode command line tools: xcode-select --install"
  need cargo "Install Rust from https://rustup.rs (it installs into your home folder, no sudo)"
  need node  "Install Node.js (an LTS version that supports macOS 10.15)"
  need npm   "npm comes with Node.js"

  local free_gb
  free_gb=$(df -g "$HOME" | awk 'NR==2 {print $4}')
  (( free_gb >= 10 )) || stop "only ${free_gb} GB free; the build needs about 10 GB"

  mkdir -p "$WORK"
  if [[ ! -d "$SRC/.git" ]]; then
    say "Getting ArtCraft's source at $tag..."
    git clone --branch "$tag" --depth 1 "$REPO_URL" "$SRC"
  else
    say "Switching the source to $tag..."
    git -C "$SRC" fetch --depth 1 origin "refs/tags/$tag:refs/tags/$tag"
    git -C "$SRC" checkout --force "refs/tags/$tag"
  fi
  local commit
  commit="$(git -C "$SRC" rev-parse HEAD)"
  say "Pinned: $tag at commit $commit"

  local app_dir="$SRC/$APP_DIR_REL"
  [[ -f "$app_dir/tauri.conf.json" ]] || stop "ArtCraft moved its app; $APP_DIR_REL/tauri.conf.json is gone. Update APP_DIR_REL."

  rustup target add "$TARGET" >/dev/null

  # Tauri 2 can take extra settings on the command line, so ArtCraft's files stay untouched.
  local override
  override="{\"bundle\":{\"macOS\":{\"minimumSystemVersion\":\"$MIN_MACOS\"}}}"

  say "Building (30 minutes or more)..."
  (
    cd "$app_dir"
    export MACOSX_DEPLOYMENT_TARGET="$MIN_MACOS"
    if [[ -f package.json ]] && grep -q '"@tauri-apps/cli"' package.json; then
      npm install
      npx tauri build --target "$TARGET" --bundles app --config "$override"
    else
      command -v cargo-tauri >/dev/null 2>&1 || cargo install tauri-cli --version '^2' --locked
      cargo tauri build --target "$TARGET" --bundles app --config "$override"
    fi
  ) 2>&1 | tee "$WORK/build.log"
  [[ ${PIPESTATUS[0]} -eq 0 ]] || stop "the build failed; the last lines of $WORK/build.log say why"

  local app
  app="$(find "$SRC" -path "*/$TARGET/release/bundle/macos/*.app" -maxdepth 8 -type d | head -1)"
  [[ -n "$app" ]] || stop "the build finished but no .app was found"

  say "Signing for this Mac only (ad hoc)..."
  codesign --force --deep --sign - "$app"

  local out="$WORK/ArtCraft-$tag-catalina.app"
  [[ "$out" == "$WORK"/* ]] || stop "unsafe output path"
  rm -rf "${out:?}"
  cp -R "$app" "$out"
  printf '%s %s\n' "$tag" "$commit" > "$WORK/BUILT_FROM.txt"

  say ""
  cmd_check "$out"
  local asks
  asks="$(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$out/Contents/Info.plist" 2>/dev/null || true)"
  [[ "$asks" == "$MIN_MACOS" ]] || stop "the app still asks for macOS $asks, not $MIN_MACOS"

  say ""
  say "Done: $out"
  say "First open: right-click it, then Open (it isn't notarized)."
  say "If it closes at once, run it from Terminal to see why:"
  say "  \"$out/Contents/MacOS/$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$out/Contents/Info.plist")\""
}

case "${1:-}" in
  check) shift; cmd_check "$@" ;;
  tags)  cmd_tags ;;
  scan)  cmd_scan ;;
  build) shift; cmd_build "$@" ;;
  *) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
