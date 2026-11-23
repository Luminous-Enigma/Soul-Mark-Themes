# ArtCraft on Catalina

One script that builds the ArtCraft desktop app for an Intel Mac on macOS 10.15 Catalina, from
ArtCraft's own source at a release you pick. Unofficial; not from the ArtCraft team.

## What it does

1. Gets ArtCraft's source at one release tag and writes down the exact commit it built.
2. Builds for Intel only, asking for macOS 10.15 instead of 11. ArtCraft's files aren't edited;
   the setting is passed to the build on the command line.
3. Signs the app for your Mac only (ad hoc), so the first open is right-click › Open.
4. Checks the result: the macOS the app asks for, and any system framework your Mac lacks.

No `sudo`. Nothing is downloaded and run unpinned. It only deletes inside `~/artcraft-catalina`.

## Before you start

- Xcode command line tools: `xcode-select --install`
- Rust, from rustup.rs (installs in your home folder)
- Node.js, a version that still supports macOS 10.15
- About 10 GB free and 30 minutes or more. The build can go on another drive, such as an external
  SSD formatted APFS or Mac OS Extended (not exFAT). Rust itself still needs about 2 GB in your
  home folder.

## Use it

```bash
bash artcraft-catalina.sh tags
```

```bash
bash artcraft-catalina.sh build artcraft-v0.41.1
```

```bash
bash artcraft-catalina.sh scan
```

On an external drive, put the folder before the command (use your drive's name):

```bash
ARTCRAFT_CATALINA_WORK=/Volumes/SSD/artcraft-catalina bash artcraft-catalina.sh build artcraft-v0.41.1
```

`check` reads any built app, the official one included:

```bash
bash artcraft-catalina.sh check /Applications/ArtCraft.app
```

## Honest limits

- Not yet run on a real Mac. The first build will show what Catalina is missing.
- If the app uses a function only newer macOS has, it can still crash when that part is used.
  `scan` lists where those functions appear; each needs a small patch, added here as found.
- The app's own updates won't work. Build the next release with this script instead.
