#!/usr/bin/env bash
# ArtCraft desktop for macOS 10.15 Catalina (Intel), built from ArtCraft's own source.
#
#   bash artcraft-catalina.sh doctor                  check this Mac is ready (changes nothing)
#   bash artcraft-catalina.sh tags                    list ArtCraft releases to pick from
#   bash artcraft-catalina.sh build <tag>             build that release for Catalina
#   bash artcraft-catalina.sh build <tag> --dry-run   show every step without doing any
#   bash artcraft-catalina.sh scan                    look for macOS 11+ functions in the source
#   bash artcraft-catalina.sh patches <tag>           list the patches that apply to a release
#   bash artcraft-catalina.sh check <path to .app>    what macOS a built app asks for
#   bash artcraft-catalina.sh audit <path to .app>    will it open on 10.15? (every system symbol)
#
# Add --json before the command for machine-readable output.
# Exit codes: 0 done, 1 stopped (the message says why), 2 the command was typed wrong.
#
# Safe by design: no sudo, nothing downloaded and run unpinned, every change checked,
# and it only ever deletes inside its own work folder.
#
# To build on another drive (an external SSD, say), put this before the command:
#   ARTCRAFT_CATALINA_WORK=/Volumes/<drive name>/artcraft-catalina
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL="${ARTCRAFT_REPO_URL:-https://github.com/storytold/artcraft.git}"
WORK="${ARTCRAFT_CATALINA_WORK:-$HOME/artcraft-catalina}"
SRC="$WORK/src"
APP_DIR_REL="crates/desktop/artcraft"
TARGET="x86_64-apple-darwin"
MIN_MACOS="10.15"
NEED_GB=10
# The Tauri build tool, pinned to the same 2.11 line as ArtCraft's own Tauri (2.11.2).
TAURI_CLI_VERSION="2.11.5"
PATCHES="${ARTCRAFT_PATCHES:-$HERE/patches}"
PLISTBUDDY="${ARTCRAFT_PLISTBUDDY:-/usr/libexec/PlistBuddy}"

# System functions and frameworks that Catalina doesn't have (macOS 11 and later).
NEWER_APIS=(
  ScreenCaptureKit SCShareableContent SCStream
  CGPreflightScreenCaptureAccess CGRequestScreenCaptureAccess
  AVFAudio AudioHardwareCreateProcessTap AudioHardwareDestroyProcessTap
  UniformTypeIdentifiers UTType
  UserNotifications UNUserNotificationCenter
  NSWindowToolbarStyle setToolbarStyle
)

JSON=0

# ---- output ---------------------------------------------------------------------------------

say()  { [[ $JSON -eq 1 ]] || printf '%s\n' "$*"; }
stop() {
  if [[ $JSON -eq 1 ]]; then printf '{"ok":false,"stopped":%s}\n' "$(jstr "$*")"
  else printf 'Stopped: %s\n' "$*" >&2; fi
  exit 1
}
usage() { sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

# A JSON string, escaped.
jstr() {
  local s="$1"
  s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; s="${s//$'\n'/\\n}"; s="${s//$'\t'/\\t}"
  printf '"%s"' "$s"
}

need() { command -v "$1" >/dev/null 2>&1 || stop "$1 is missing. $2"; }

# ---- doctor: is this Mac ready? -------------------------------------------------------------

DOCTOR_ROWS=()
DOCTOR_BAD=0
row() { # name, state (ok | warn | missing), detail
  DOCTOR_ROWS+=("$1"$'\t'"$2"$'\t'"$3")
  [[ "$2" == missing ]] && DOCTOR_BAD=1
  return 0
}

cmd_doctor() {
  local os arch ver
  os="$(uname -s)"; arch="$(uname -m)"
  if [[ "$os" != Darwin ]]; then row "macOS" missing "this is $os; run it on the Mac"
  else
    ver="$(sw_vers -productVersion 2>/dev/null || echo unknown)"
    case "$ver" in
      10.15*) row "macOS" ok "$ver (Catalina)" ;;
      *) row "macOS" warn "$ver: built for 10.15 Catalina, but it should run here too" ;;
    esac
  fi
  if [[ "$arch" == x86_64 ]]; then row "Processor" ok "Intel ($arch)"
  else row "Processor" missing "$arch: this is for Intel Macs; Apple silicon Macs run newer macOS"; fi

  if xcode-select -p >/dev/null 2>&1; then
    local clt
    clt="$(pkgutil --pkg-info=com.apple.pkg.CLTools_Executables 2>/dev/null | awk '/^version/ {print $2}')"
    row "Xcode command line tools" ok "${clt:-installed}"
  else row "Xcode command line tools" missing "run: xcode-select --install"; fi

  if command -v git >/dev/null 2>&1; then row "git" ok "$(git --version | awk '{print $3}')"
  else row "git" missing "comes with the Xcode command line tools"; fi

  local rv=""
  rv="$(rustc -V 2>/dev/null | awk '{print $2}')" || rv=""
  if [[ -n "$rv" ]] && cargo --version >/dev/null 2>&1; then
    row "Rust" ok "$rv"
    if command -v rustup >/dev/null 2>&1; then
      if rustup target list --installed 2>/dev/null | grep -qx "$TARGET"; then row "Rust Intel target" ok "$TARGET"
      else row "Rust Intel target" warn "build adds it: rustup target add $TARGET"; fi
    else row "rustup" missing "install Rust from rustup.rs (home folder, no sudo)"; fi
  elif command -v rustc >/dev/null 2>&1; then row "Rust" missing "installed but won't start; reinstall from rustup.rs"
  else row "Rust" missing "install from rustup.rs (it installs into your home folder, no sudo)"; fi

  if command -v node >/dev/null 2>&1 && node -v >/dev/null 2>&1; then
    local nv; nv="$(node -v)"
    row "Node.js" ok "$nv"
    command -v npm >/dev/null 2>&1 && row "npm" ok "$(npm -v)" || row "npm" missing "comes with Node.js"
  else row "Node.js" missing "install an LTS version that starts on this Mac (Node 20 if a newer one won't)"; fi

  if mkdir -p "$WORK" 2>/dev/null; then
    local free fs
    free="$(df -g "$WORK" | awk 'NR==2 {print $4}')"
    fs="$(drive_format "$WORK")"
    if [[ "$fs" == apfs || "$fs" == hfs ]]; then row "Drive format" ok "$fs ($WORK)"
    else row "Drive format" missing "'$fs' at $WORK: needs APFS or Mac OS Extended (exFAT and FAT break builds)"; fi
    if (( free >= NEED_GB )); then row "Free space" ok "${free} GB at $WORK"
    else row "Free space" missing "${free} GB at $WORK; needs about $NEED_GB GB. Pick another drive with ARTCRAFT_CATALINA_WORK"; fi
  else row "Work folder" missing "can't make $WORK. Is the drive plugged in?"; fi

  if [[ $JSON -eq 1 ]]; then
    local out="" r name state detail
    for r in "${DOCTOR_ROWS[@]}"; do
      IFS=$'\t' read -r name state detail <<<"$r"
      out+="${out:+,}{\"check\":$(jstr "$name"),\"state\":$(jstr "$state"),\"detail\":$(jstr "$detail")}"
    done
    printf '{"ok":%s,"work":%s,"checks":[%s]}\n' "$([[ $DOCTOR_BAD -eq 0 ]] && echo true || echo false)" "$(jstr "$WORK")" "$out"
  else
    local r name state detail
    for r in "${DOCTOR_ROWS[@]}"; do
      IFS=$'\t' read -r name state detail <<<"$r"
      printf '%-8s %-26s %s\n' "$state" "$name" "$detail"
    done
    if [[ $DOCTOR_BAD -eq 0 ]]; then say ""; say "Ready to build."; else say ""; say "Fix the 'missing' rows above, then run doctor again."; fi
  fi
  [[ $DOCTOR_BAD -eq 0 ]] || exit 1
}

# The file system of the drive a folder is on (apfs, hfs, exfat, msdos ...).
drive_format() {
  local device
  device="$(df "$1" | awk 'NR==2 {print $1}')"
  mount | awk -v d="$device" '$1 == d {print $0}' | sed -n 's/.*(\([a-z]*\).*/\1/p' | head -1
}

# ---- tags: list releases to pin to ----------------------------------------------------------

cmd_tags() {
  need git "Install the Xcode command line tools: xcode-select --install"
  local tags
  tags="$(git ls-remote --tags --refs "$REPO_URL" | awk '{sub("refs/tags/","",$2); print $2}' | grep '^artcraft-v' | sort -V | tail -20)" \
    || stop "couldn't reach $REPO_URL"
  if [[ $JSON -eq 1 ]]; then
    local out="" t; for t in $tags; do out+="${out:+,}$(jstr "$t")"; done
    printf '{"ok":true,"tags":[%s]}\n' "$out"
  else printf '%s\n' "$tags"; fi
}

# ---- patches: which apply to a release ------------------------------------------------------
# patches/manifest.tsv: one line per patch: <file> TAB <release tags it fits, a regex> TAB <why>.
# A patch is applied only to the releases it was written and checked against.

patches_for() {
  local tag="$1" file fits why
  [[ -f "$PATCHES/manifest.tsv" ]] || return 0
  while IFS=$'\t' read -r file fits why; do
    [[ -z "$file" || "$file" == \#* ]] && continue
    [[ "$tag" =~ ^($fits)$ ]] && printf '%s\t%s\n' "$file" "$why"
  done < "$PATCHES/manifest.tsv"
  return 0
}

cmd_patches() {
  local tag="${1:-}"; [[ -n "$tag" ]] || usage
  local list; list="$(patches_for "$tag")"
  if [[ $JSON -eq 1 ]]; then
    local out="" file why
    while IFS=$'\t' read -r file why; do [[ -n "$file" ]] && out+="${out:+,}{\"file\":$(jstr "$file"),\"why\":$(jstr "$why")}"; done <<<"$list"
    printf '{"ok":true,"tag":%s,"patches":[%s]}\n' "$(jstr "$tag")" "$out"
  elif [[ -z "$list" ]]; then say "No patches for $tag yet."
  else
    local file why; while IFS=$'\t' read -r file why; do printf '%s\n  %s\n' "$file" "$why"; done <<<"$list"
  fi
}

apply_patches() {
  local tag="$1" file why n=0
  while IFS=$'\t' read -r file why; do
    [[ -z "$file" ]] && continue
    [[ -f "$PATCHES/$file" ]] || stop "patch $file is listed but missing from $PATCHES"
    git -C "$SRC" apply --check "$PATCHES/$file" 2>/dev/null \
      || stop "patch $file no longer fits $tag (ArtCraft changed those lines). It needs updating."
    git -C "$SRC" apply "$PATCHES/$file"
    git -C "$SRC" apply --reverse --check "$PATCHES/$file" 2>/dev/null || stop "patch $file didn't take"
    say "  patched: $file ($why)"
    n=$((n + 1))
  done < <(patches_for "$tag")
  say "Patches applied: $n"
}

# ---- scan: search the pinned source and its Rust dependencies for newer macOS functions ----

cmd_scan() {
  [[ -d "$SRC/.git" ]] || stop "no source yet. Run: bash $0 build <tag>"
  local pattern where=("$SRC") hits
  pattern="$(IFS='|'; echo "${NEWER_APIS[*]}")"
  [[ -d "${CARGO_HOME:-$HOME/.cargo}/registry/src" ]] && where+=("${CARGO_HOME:-$HOME/.cargo}/registry/src")
  hits="$(grep -rIlE --include='*.rs' --include='*.m' --include='*.mm' --include='*.swift' --include='*.c' "$pattern" "${where[@]}" 2>/dev/null | sort | head -200 || true)"
  if [[ $JSON -eq 1 ]]; then
    local out="" h; while read -r h; do [[ -n "$h" ]] && out+="${out:+,}$(jstr "$h")"; done <<<"$hits"
    printf '{"ok":true,"files":[%s]}\n' "$out"
  else
    say "Files in ArtCraft's source and its Rust dependencies that name a macOS 11+ function:"
    [[ -n "$hits" ]] && printf '%s\n' "$hits" | sed "s#^$HOME#~#" || say "  none"
    say "Each may need a patch, or may only use the function when it exists. Check them."
  fi
}

# ---- check: read what a built app asks for --------------------------------------------------

cmd_check() {
  local app="${1:-}"
  [[ -n "$app" ]] || usage
  [[ -d "$app" && "$app" == *.app ]] || stop "give the path to an .app, for example /Volumes/ArtCraft/ArtCraft.app"
  local plist="$app/Contents/Info.plist"
  [[ -f "$plist" ]] || stop "no Info.plist in $app"
  local asks exe archs minos missing=()
  asks="$("$PLISTBUDDY" -c 'Print :LSMinimumSystemVersion' "$plist" 2>/dev/null || echo 'not set')"
  exe="$app/Contents/MacOS/$("$PLISTBUDDY" -c 'Print :CFBundleExecutable' "$plist")"
  archs="$(lipo -archs "$exe" 2>/dev/null || echo unknown)"
  minos="$(otool -arch all -l "$exe" 2>/dev/null | awk '/\(architecture/ {a=$NF; gsub(/[():]/,"",a)} /LC_BUILD_VERSION/ {f=1} f && /minos/ {print (a ? a : "single") " " $2; f=0}' || true)"
  # Only macOS 10.x keeps system frameworks as files; from 11 on they live in a shared cache, so
  # a file check there would call every framework missing. The audit covers that case instead.
  local fw on_disk=0
  [[ "$(sw_vers -productVersion 2>/dev/null)" == 10.* ]] && on_disk=1
  if [[ $on_disk -eq 1 ]]; then
    while read -r fw; do
      [[ "$fw" == /System/* && ! -e "$fw" ]] && missing+=("$fw")
    done < <(otool -L "$exe" 2>/dev/null | awk 'NR>1 {print $1}')
  fi
  if [[ $JSON -eq 1 ]]; then
    local m="" mo="" x
    for x in "${missing[@]+"${missing[@]}"}"; do m+="${m:+,}$(jstr "$x")"; done
    while read -r x; do [[ -n "$x" ]] && mo+="${mo:+,}$(jstr "$x")"; done <<<"$minos"
    printf '{"ok":true,"app":%s,"asks_for":%s,"archs":%s,"minos":[%s],"frameworks_checked":%s,"missing_frameworks":[%s]}\n' \
      "$(jstr "$app")" "$(jstr "$asks")" "$(jstr "$archs")" "$mo" "$([[ $on_disk -eq 1 ]] && echo true || echo false)" "$m"
  else
    say "App:                $app"
    say "Asks for at least:  $asks"
    say "Built for:          $archs"
    say "Lowest macOS per part (minos):"
    [[ -n "$minos" ]] && printf '  %s\n' "$minos" || say "  unknown"
    say "System frameworks it needs that this Mac lacks:"
    if [[ $on_disk -eq 0 ]]; then say "  can't tell on macOS 11 or later (frameworks live in a shared cache); see audit"
    elif [[ ${#missing[@]} -eq 0 ]]; then say "  none"; else printf '  MISSING %s\n' "${missing[@]}"; fi
  fi
}

# ---- audit: will the app open on 10.15? -----------------------------------------------------
# Every system function and class the app links to, checked against the macOS 10.15 SDK's lists
# (audit.py). A required one 10.15 lacks stops the app at launch with "Symbol not found".

cmd_audit() {
  local app="${1:-}"
  [[ -n "$app" ]] || usage
  [[ -d "$app" && "$app" == *.app ]] || stop "give the path to an .app, for example $WORK/ArtCraft-<tag>-catalina.app"
  need python3 "It comes with the Xcode command line tools."
  local exe sdk_args=()
  exe="$app/Contents/MacOS/$("$PLISTBUDDY" -c 'Print :CFBundleExecutable' "$app/Contents/Info.plist")"
  [[ -n "${ARTCRAFT_SDK:-}" ]] && sdk_args=(--sdk "$ARTCRAFT_SDK")
  if [[ $JSON -eq 1 ]]; then python3 "$HERE/audit.py" "$exe" "${sdk_args[@]+"${sdk_args[@]}"}" --json
  else python3 "$HERE/audit.py" "$exe" "${sdk_args[@]+"${sdk_args[@]}"}"; fi
}

# ---- build: pinned clone, patches, Intel only, minimum 10.15, ad-hoc signed ----------------

cmd_build() {
  local tag="" dry=0 a
  for a in "$@"; do case "$a" in --dry-run) dry=1 ;; -*) usage ;; *) tag="$a" ;; esac; done
  [[ -n "$tag" ]] || stop "pick a version. See them with: bash $0 tags"
  [[ "$tag" =~ ^[A-Za-z0-9._-]+$ ]] || stop "'$tag' doesn't look like a release tag"

  if [[ $dry -eq 1 ]]; then
    say "Dry run: nothing is changed. The build would:"
    say "  1. check this Mac (doctor)"
    say "  2. get ArtCraft's source at $tag into $SRC and record the exact commit"
    local list; list="$(patches_for "$tag")"
    say "  3. apply $(printf '%s' "$list" | grep -c . || true) patch(es) listed for $tag, checking each fits and took"
    say "  4. add the Rust Intel target ($TARGET) and the Tauri build tool $TAURI_CLI_VERSION (in the work folder)"
    say "  5. build the frontend the way ArtCraft's Mac release does (npm ci, then nx run artcraft:build),"
    say "     running packages' install steps except esbuild 0.24+, which is built for macOS 11"
    say "  6. build the app with MACOSX_DEPLOYMENT_TARGET=$MIN_MACOS, SQLX_OFFLINE=true and"
    say "     bundle.macOS.minimumSystemVersion $MIN_MACOS (on the command line; ArtCraft's files aren't edited)"
    say "  7. sign it for this Mac only (ad hoc), copy it to $WORK/ArtCraft-$tag-catalina.app"
    say "  8. check the app asks for $MIN_MACOS, and that every system function it needs is on $MIN_MACOS (audit)"
    return 0
  fi

  [[ "$(uname -s)" == Darwin ]] || stop "this runs on a Mac"
  [[ "$(uname -m)" == x86_64 ]] || stop "this is for Intel Macs; Apple silicon Macs run newer macOS"
  need git   "Install the Xcode command line tools: xcode-select --install"
  need cargo "Install Rust from https://rustup.rs (it installs into your home folder, no sudo)"
  need node  "Install Node.js (an LTS version that starts on this Mac)"
  need npm   "npm comes with Node.js"

  mkdir -p "$WORK" || stop "can't make $WORK. Is the drive plugged in?"
  local free_gb fs
  free_gb=$(df -g "$WORK" | awk 'NR==2 {print $4}')
  (( free_gb >= NEED_GB )) || stop "only ${free_gb} GB free on the drive with $WORK; the build needs about $NEED_GB GB. Pick another drive with ARTCRAFT_CATALINA_WORK"
  fs="$(drive_format "$WORK")"
  [[ "$fs" == apfs || "$fs" == hfs ]] || stop "the drive with $WORK is formatted as '$fs'. Builds need APFS or Mac OS Extended (exFAT and FAT break them)"
  say "Working in $WORK (${free_gb} GB free, $fs)"

  # Keep the big downloads on the same drive as the build.
  export CARGO_TARGET_DIR="$WORK/target"
  export npm_config_cache="$WORK/npm-cache"

  if [[ ! -d "$SRC/.git" ]]; then
    say "Getting ArtCraft's source at $tag..."
    git clone --branch "$tag" --depth 1 "$REPO_URL" "$SRC"
  else
    say "Switching the source to $tag (local changes from earlier patches are dropped)..."
    git -C "$SRC" fetch --depth 1 origin "refs/tags/$tag:refs/tags/$tag"
    git -C "$SRC" checkout --force "refs/tags/$tag"
    git -C "$SRC" clean -fdq -e node_modules
  fi
  local commit
  commit="$(git -C "$SRC" rev-parse HEAD)"
  say "Pinned: $tag at commit $commit"

  local app_dir="$SRC/$APP_DIR_REL"
  [[ -f "$app_dir/tauri.conf.json" ]] || stop "ArtCraft moved its app; $APP_DIR_REL/tauri.conf.json is gone. Update APP_DIR_REL."

  apply_patches "$tag"
  rustup target add "$TARGET" >/dev/null

  # The Tauri build tool, pinned and kept in the work folder (not the home folder).
  local tauri="$WORK/tools/bin/cargo-tauri"
  if ! "$tauri" --version 2>/dev/null | grep -q " $TAURI_CLI_VERSION\$"; then
    say "Installing the Tauri build tool $TAURI_CLI_VERSION (once, about 5 minutes)..."
    cargo install tauri-cli --version "=$TAURI_CLI_VERSION" --locked --root "$WORK/tools"
  fi

  # The same recipe as ArtCraft's own Mac release: the frontend is built first, then Tauri
  # builds the app with its own frontend step turned off. The extra settings go on the command
  # line, so ArtCraft's files stay untouched.
  local override
  override="{\"build\":{\"beforeBuildCommand\":\"\"},\"bundle\":{\"macOS\":{\"minimumSystemVersion\":\"$MIN_MACOS\"}}}"

  say "Building (30 minutes or more)..."
  set +e
  (
    set -e
    export MACOSX_DEPLOYMENT_TARGET="$MIN_MACOS"
    export SQLX_OFFLINE=true
    cd "$SRC/frontend"
    # Install steps run by install-steps.js, which skips the one Catalina can't run (esbuild 0.24+).
    npm ci --no-audit --no-fund --ignore-scripts
    node "$HERE/install-steps.js" .
    NODE_OPTIONS="--max-old-space-size=${ARTCRAFT_NODE_MEMORY_MB:-8192}" npx --no-install nx run artcraft:build
    cd "$app_dir"
    "$tauri" build --target "$TARGET" --bundles app --config "$override"
  ) 2>&1 | tee "$WORK/build.log"
  local status=${PIPESTATUS[0]}
  set -e
  [[ $status -eq 0 ]] || stop "the build failed; the last lines of $WORK/build.log say why. Send them over."

  local app
  app="$(find "$WORK/target" "$SRC" -maxdepth 8 -type d -path "*/$TARGET/release/bundle/macos/*.app" 2>/dev/null | head -1)"
  [[ -n "$app" ]] || stop "the build finished but no .app was found"

  say "Signing for this Mac only (ad hoc)..."
  codesign --force --deep --sign - "$app"

  local out="$WORK/ArtCraft-$tag-catalina.app"
  [[ "$out" == "$WORK"/*.app ]] || stop "unsafe output path"
  rm -rf "${out:?}"
  cp -R "$app" "$out"
  printf '%s %s\n' "$tag" "$commit" > "$WORK/BUILT_FROM.txt"

  say ""
  cmd_check "$out"
  local asks
  asks="$("$PLISTBUDDY" -c 'Print :LSMinimumSystemVersion' "$out/Contents/Info.plist" 2>/dev/null || true)"
  [[ "$asks" == "$MIN_MACOS" ]] || stop "the app still asks for macOS $asks, not $MIN_MACOS"

  say ""
  say "Checking every system function the app needs is on macOS $MIN_MACOS..."
  cmd_audit "$out" || stop "the app needs something macOS $MIN_MACOS lacks (listed above). Send the list over; it becomes a patch."

  say ""
  say "Done: $out"
  say "First open: right-click it, then Open (it isn't notarized)."
  say "If it closes at once, run it from Terminal to see why:"
  say "  \"$out/Contents/MacOS/$("$PLISTBUDDY" -c 'Print :CFBundleExecutable' "$out/Contents/Info.plist")\""
}

# ---- main -----------------------------------------------------------------------------------

[[ "${1:-}" == --json ]] && { JSON=1; shift; }
case "${1:-}" in
  doctor)  cmd_doctor ;;
  tags)    cmd_tags ;;
  scan)    cmd_scan ;;
  patches) shift; cmd_patches "$@" ;;
  check)   shift; cmd_check "$@" ;;
  audit)   shift; cmd_audit "$@" ;;
  build)   shift; cmd_build "$@" ;;
  *) usage ;;
esac
