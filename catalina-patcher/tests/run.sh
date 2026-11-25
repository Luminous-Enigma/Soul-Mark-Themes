#!/usr/bin/env bash
# Tests for artcraft-catalina.sh, run anywhere: stand-in versions of the Mac tools are put first
# on PATH, so each command's path through the script is checked without a Mac.
#   bash tests/run.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../artcraft-catalina.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FAKE="$TMP/bin"; mkdir -p "$FAKE"
pass=0; fail=0
REAL_PATH="$PATH"

fake() { printf '#!/usr/bin/env bash\n%s\n' "$2" > "$FAKE/$1"; chmod +x "$FAKE/$1"; }

# Stand-ins. Each reads FAKE_* settings so a test can change the Mac it pretends to be.
fake uname        'case "$1" in -s) echo "${FAKE_OS:-Darwin}";; -m) echo "${FAKE_ARCH:-x86_64}";; *) echo Darwin;; esac'
fake sw_vers      'echo "${FAKE_MACOS:-10.15.7}"'
fake xcode-select '[[ -n "${FAKE_NO_CLT:-}" ]] && exit 2; echo /Library/Developer/CommandLineTools'
fake pkgutil      '[[ -n "${FAKE_NO_RECEIPT:-}" ]] && exit 1; echo "version: 12.4.0.0.1.1610135815"'
fake git          'case "$1" in
  --version) echo "git version 2.24.3";;
  ls-remote) printf "a\trefs/tags/artcraft-v0.9.0\nb\trefs/tags/artcraft-windows-v0.5.0\nc\trefs/tags/artcraft-v0.41.1\nd\trefs/tags/artcraft-v0.41.0\ne\trefs/tags/superalpha1\n";;
  *) exit 0;; esac'
fake rustc        '[[ -n "${FAKE_NO_RUST:-}" ]] && exit 127; echo "rustc 1.91.0 (abc 2026-10-30)"'
fake cargo        '[[ -n "${FAKE_NO_RUST:-}" ]] && exit 127; echo cargo'
fake rustup       'echo "x86_64-apple-darwin"'
fake node         'echo v20.18.0'
fake npm          'echo 10.8.2'
fake diskutil     'if [[ -n "${FAKE_DISK_IMAGE:-}" ]]; then
  case "$2" in disk5s1) echo "   Protocol:                  Disk Image";; *) echo "   APFS Physical Store:       disk5s1";; esac
else echo "   Protocol:                  USB"; fi'
fake cmake        '[[ -n "${FAKE_NO_CMAKE:-}" ]] && exit 127; echo "cmake version 3.31.6"'
fake df           'if [[ "$1" == -g ]]; then printf "Filesystem 1G-blocks Used Available\n/dev/disk2s1 500 100 %s\n" "${FAKE_FREE:-200}"; else printf "Filesystem 512-blocks Used Available\n/dev/disk2s1 1 1 1\n"; fi'
fake mount        'echo "/dev/disk2s1 on /Volumes/SSD (${FAKE_FS:-apfs}, local, journaled)"'
fake lipo         'echo x86_64 arm64'
fake otool        'if [[ " $* " == *" -L "* ]]; then printf "%s:\n\t/System/Library/Frameworks/CoreGraphics.framework/Versions/A/CoreGraphics (x)\n\t/usr/lib/libSystem.B.dylib (x)\n\t/System/Library/Frameworks/NoSuchKit.framework/NoSuchKit (x)\n" "${@: -1}";
  else printf "x (architecture x86_64):\nLoad command 9\n      cmd LC_BUILD_VERSION\n    minos 11.0\nx (architecture arm64):\n      cmd LC_BUILD_VERSION\n    minos 11.0\n"; fi'
fake nm           'printf "                 (undefined) external _CGMainDisplayID (from CoreGraphics)\n                 (undefined) external _malloc (from libSystem)\n"
  [[ -n "${FAKE_NEWER:-}" ]] && printf "                 (undefined) external _CGPreflightScreenCaptureAccess (from CoreGraphics)\n"; true'
fake codesign     'printf "%s\n" "$*" >> "${FAKE_SIGNED:-/dev/null}"'
fake PlistBuddy   'case "$2" in *LSMinimumSystemVersion*) echo "11.0";; *CFBundleExecutable*) echo "artcraft";; esac'
# Only frameworks the stand-in Mac "has" count as present: make AppKit exist under a fake root.
export PATH="$FAKE:/usr/bin:/bin"
export ARTCRAFT_PLISTBUDDY="$FAKE/PlistBuddy"
export ARTCRAFT_CATALINA_WORK="$TMP/work"

run() { OUT="$(bash "$SCRIPT" "$@" 2>&1)"; CODE=$?; }
ok()  { if eval "$2"; then pass=$((pass + 1)); printf 'ok    %s\n' "$1"; else fail=$((fail + 1)); printf 'FAIL  %s\n      code=%s\n%s\n' "$1" "$CODE" "$(printf '%s' "$OUT" | sed 's/^/      /' | head -12)"; fi; }
json() { printf '%s' "$OUT" | python3 -c 'import json,sys; json.load(sys.stdin)' 2>/dev/null; }

run;                       ok "no command: usage, exit 2"            '[[ $CODE -eq 2 && "$OUT" == *"doctor"* ]]'
run frobnicate;            ok "unknown command: exit 2"              '[[ $CODE -eq 2 ]]'
run check;                 ok "check without a path: exit 2"         '[[ $CODE -eq 2 ]]'
run patches;               ok "patches without a tag: exit 2"        '[[ $CODE -eq 2 ]]'
run build --nope v1;       ok "build with an unknown flag: exit 2"   '[[ $CODE -eq 2 ]]'

run doctor;                ok "doctor on a ready Catalina Mac: exit 0" '[[ $CODE -eq 0 && "$OUT" == *"Ready to build."* ]]'
run --json doctor;         ok "doctor --json is valid JSON, ok true" '[[ $CODE -eq 0 ]] && json && [[ "$OUT" == *"\"ok\":true"* ]]'
FAKE_NO_RUST=1 run doctor; ok "doctor without Rust: exit 1, names it" '[[ $CODE -eq 1 && "$OUT" == *"missing  Rust"* ]]'
FAKE_FS=exfat run doctor;  ok "doctor on an exFAT drive: exit 1"     '[[ $CODE -eq 1 && "$OUT" == *"exfat"* ]]'
FAKE_FREE=4 run doctor;    ok "doctor with 4 GB free: exit 1"        '[[ $CODE -eq 1 && "$OUT" == *"4 GB"* ]]'
FAKE_ARCH=arm64 run doctor; ok "doctor on Apple silicon: exit 1"     '[[ $CODE -eq 1 && "$OUT" == *"Intel"* ]]'
FAKE_NO_CLT=1 run doctor;  ok "doctor without Xcode tools: exit 1"   '[[ $CODE -eq 1 && "$OUT" == *"xcode-select --install"* ]]'
FAKE_DISK_IMAGE=1 run doctor; ok "doctor in a disk image on Catalina: exit 1, says why" '[[ $CODE -eq 1 && "$OUT" == *"missing  Not a disk image"* && "$OUT" == *"crash the whole Mac"* ]]'
FAKE_DISK_IMAGE=1 FAKE_MACOS=12.6 run doctor; ok "doctor in a disk image on macOS 12: fine" '[[ $CODE -eq 0 && "$OUT" == *"ok       Not a disk image"* ]]'
FAKE_DISK_IMAGE=1 run build artcraft-v0.41.1; ok "build in a disk image on Catalina: stops before starting" '[[ $CODE -eq 1 && "$OUT" == *"inside a disk image"* ]]'
FAKE_NO_CMAKE=1 run doctor; ok "doctor without CMake: exit 1, says where to get it" '[[ $CODE -eq 1 && "$OUT" == *"missing  CMake"* && "$OUT" == *"cmake.org"* ]]'
FAKE_NO_RECEIPT=1 run doctor; ok "doctor with Xcode tools but no install receipt: still ready" '[[ $CODE -eq 0 && "$OUT" == *"Ready to build."* ]]'
FAKE_MACOS=12.6 run doctor; ok "doctor on macOS 12: warns, still ready" '[[ $CODE -eq 0 && "$OUT" == *"warn"* ]]'
FAKE_OS=Linux run --json doctor; ok "doctor off a Mac: exit 1, valid JSON" '[[ $CODE -eq 1 ]] && json'

run tags;                  ok "tags: ArtCraft releases only, newest last" '[[ $CODE -eq 0 && "$OUT" == *"artcraft-v0.41.1" && "$OUT" != *windows* && "$OUT" != *superalpha* ]]'
run --json tags;           ok "tags --json is valid JSON"            '[[ $CODE -eq 0 ]] && json'

run patches artcraft-v0.41.1; ok "patches: none yet, said plainly"   '[[ $CODE -eq 0 && "$OUT" == *"No patches"* ]]'
cp -r "$HERE/../patches" "$TMP/patches"; export ARTCRAFT_PATCHES="$TMP/patches"
printf 'fix-a.patch\tartcraft-v0\\.41\\..*\tthe screen color check\nfix-b.patch\tartcraft-v0\\.40\\.0\tonly for 0.40.0\n' >> "$TMP/patches/manifest.tsv"
run patches artcraft-v0.41.1; ok "patches: picks only those that fit the release" '[[ "$OUT" == *fix-a.patch* && "$OUT" != *fix-b.patch* ]]'
run --json patches artcraft-v0.41.1; ok "patches --json is valid JSON" 'json && [[ "$OUT" == *fix-a.patch* ]]'
run build artcraft-v0.41.1 --dry-run; ok "build --dry-run: changes nothing, counts 1 patch" '[[ $CODE -eq 0 && "$OUT" == *"apply 1 patch"* && ! -d "$TMP/work/src" ]]'
unset ARTCRAFT_PATCHES

run build;                 ok "build without a tag: exit 1, says how to list them" '[[ $CODE -eq 1 && "$OUT" == *"tags"* ]]'
run build 'v1;rm -rf /';   ok "build refuses a tag that isn't a tag"  '[[ $CODE -eq 1 && "$OUT" == *"doesn"* ]]'
FAKE_OS=Linux run build artcraft-v0.41.1; ok "build off a Mac: exit 1" '[[ $CODE -eq 1 && "$OUT" == *"runs on a Mac"* ]]'
FAKE_ARCH=arm64 run build artcraft-v0.41.1; ok "build on Apple silicon: exit 1" '[[ $CODE -eq 1 && "$OUT" == *"Intel"* ]]'
FAKE_FS=exfat run build artcraft-v0.41.1; ok "build on exFAT: stops before getting source" '[[ $CODE -eq 1 && "$OUT" == *"exfat"* && ! -d "$TMP/work/src" ]]'

APP="$TMP/ArtCraft.app"; mkdir -p "$APP/Contents/MacOS"; touch "$APP/Contents/Info.plist" "$APP/Contents/MacOS/artcraft"
run check "$APP";          ok "check: reads what the app asks for"    '[[ $CODE -eq 0 && "$OUT" == *"11.0"* && "$OUT" == *"x86_64 arm64"* ]]'
ok "check: lists a framework this Mac lacks" '[[ "$OUT" == *"MISSING /System/Library/Frameworks/NoSuchKit"* ]]'
FAKE_MACOS=15.1 run check "$APP"; ok "check on macOS 11+: says it can't tell, no false alarms" '[[ $CODE -eq 0 && "$OUT" == *"can"*"tell"* && "$OUT" != *MISSING* ]]'
run --json check "$APP";   ok "check --json is valid JSON"            '[[ $CODE -eq 0 ]] && json && [[ "$OUT" == *"\"asks_for\":\"11.0\""* ]]'
run check "$TMP";          ok "check on a folder that isn't an app: exit 1" '[[ $CODE -eq 1 ]]'

export ARTCRAFT_SDK="$HERE/sdk"
FAKE_NEWER='' run audit "$APP"; ok "audit: an app 10.15 can open passes, exit 0" '[[ $CODE -eq 0 && "$OUT" == *"Nothing missing."* ]]'
FAKE_NEWER=1 run audit "$APP"; ok "audit: a macOS 11 function is caught, exit 1" '[[ $CODE -eq 1 && "$OUT" == *"_CGPreflightScreenCaptureAccess"* ]]'
FAKE_NEWER=1 run --json audit "$APP"; ok "audit --json is valid JSON, ok false" 'json && [[ "$OUT" == *"\"ok\": false"* ]]'
run audit;                 ok "audit without a path: exit 2" '[[ $CODE -eq 2 ]]'
unset ARTCRAFT_SDK

run scan;                  ok "scan before any source: exit 1, says what to run" '[[ $CODE -eq 1 && "$OUT" == *"build"* ]]'
mkdir -p "$TMP/work/src/.git" "$TMP/work/src/crates/x"
printf 'fn f() { CGPreflightScreenCaptureAccess(); }\n' > "$TMP/work/src/crates/x/a.rs"
printf 'fn g() {}\n' > "$TMP/work/src/crates/x/b.rs"
run --json scan;           ok "scan finds the file naming a macOS 11+ function" 'json && [[ "$OUT" == *a.rs* && "$OUT" != *b.rs* ]]'

# install-steps.js: a made-up frontend whose esbuild 0.25.12 and ordinary package each leave a
# marker when their install step runs. Only the ordinary one may run.
FE="$TMP/frontend"; mkdir -p "$FE/node_modules/esbuild" "$FE/node_modules/plain" "$FE/node_modules/vite/node_modules/esbuild"
mk() { printf '{"name":"%s","version":"%s","scripts":{"postinstall":"node -e \\"require(\x27fs\x27).writeFileSync(\x27ran\x27,\x27\x27)\\""}}' "$2" "$3" > "$FE/$1/package.json"; }
mk node_modules/plain plain 1.0.0; mk node_modules/esbuild esbuild 0.21.5; mk node_modules/vite/node_modules/esbuild esbuild 0.25.12
printf '{"lockfileVersion":3,"packages":{"":{},"node_modules/plain":{"hasInstallScript":true},"node_modules/esbuild":{"hasInstallScript":true},"node_modules/vite/node_modules/esbuild":{"hasInstallScript":true},"node_modules/other-platform":{"hasInstallScript":true}}}' > "$FE/package-lock.json"
OUT="$(PATH="$REAL_PATH" node "$HERE/../install-steps.js" "$FE" 2>&1)"; CODE=$?
ok "install steps: ordinary packages run, exit 0" '[[ $CODE -eq 0 && -f "$FE/node_modules/plain/ran" && -f "$FE/node_modules/esbuild/ran" ]]'
ok "install steps: esbuild 0.25 is skipped and said"  '[[ ! -f "$FE/node_modules/vite/node_modules/esbuild/ran" && "$OUT" == *"skipped"*"0.25.12"*"macOS 11"* ]]'
ok "install steps: a package for another platform is passed over" '[[ "$OUT" == *"2 run, 1 skipped"* ]]'
printf '{"name":"broken","version":"1.0.0","scripts":{"postinstall":"node -e \\"process.exit(3)\\""}}' > "$FE/node_modules/plain/package.json"
OUT="$(PATH="$REAL_PATH" node "$HERE/../install-steps.js" "$FE" 2>&1)"; CODE=$?
ok "install steps: any other failure stops it" '[[ $CODE -ne 0 ]]'

run build artcraft-v0.41.1 --soul-mark --dry-run
ok "build --soul-mark --dry-run says it adds Soul Mark, changes nothing" '[[ $CODE -eq 0 && "$OUT" == *"Soul Mark patch"* && "$OUT" == *"nothing is changed"* ]]'
ok "the Soul Mark patch for 0.41.1 is there" '[[ -s "$HERE/../patches/soul-mark/artcraft-v0.41.1.patch" ]]'
run build artcraft-v0.41.1 --soul-mak
ok "build with an unknown option: exit 2" '[[ $CODE -eq 2 ]]'

# The launcher: the real program moves to .bin, a script takes its place, and on macOS 10.x it
# starts the program with Safari's staged WebKit when that exists.
APP="$TMP/Fake.app"; mkdir -p "$APP/Contents/MacOS"; : > "$APP/Contents/Info.plist"
printf '#!/bin/sh\necho "DYLD=${DYLD_FRAMEWORK_PATH:-none} ARGS=$*"\n' > "$APP/Contents/MacOS/artcraft"; chmod 755 "$APP/Contents/MacOS/artcraft"
FAKE_SIGNED="$TMP/signed" run launcher "$APP"
ok "launcher: moves the program to .bin, writes the script, re-signs" '[[ $CODE -eq 0 && -x "$APP/Contents/MacOS/artcraft.bin" && -x "$APP/Contents/MacOS/artcraft" && $(grep -c StagedFrameworks "$APP/Contents/MacOS/artcraft") -ge 1 && -s "$TMP/signed" ]]'
run launcher "$APP"
ok "launcher: a second run keeps the real program" '[[ $CODE -eq 0 && $(grep -c "DYLD=" "$APP/Contents/MacOS/artcraft.bin") -eq 1 ]]'
OUT="$("$APP/Contents/MacOS/artcraft" one two 2>&1)"
ok "launcher: starts the real program with its arguments" '[[ "$OUT" == *"ARGS=one two"* ]]'
ok "launcher: leaves the engine alone where Safari's staged one is missing" '[[ "$OUT" == *"DYLD=none"* ]]'
run check "$APP"
ok "check still works on an app with the launcher" '[[ $CODE -eq 0 ]]'
run launcher "$TMP/nope.app"
ok "launcher: refuses what isn't an app" '[[ $CODE -eq 1 ]]'

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[[ $fail -eq 0 ]]
