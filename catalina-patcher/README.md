# ArtCraft on Catalina

One script that builds the ArtCraft desktop app for an Intel Mac on macOS 10.15 Catalina, from
ArtCraft's own source at a release you pick. Unofficial; not from the ArtCraft team.

## What it does

1. Gets ArtCraft's source at one release tag and writes down the exact commit it built.
2. Applies the patches written for that release (`patches/`), checking each one fits and took.
3. Builds it the way ArtCraft's own Mac release does: the frontend first (`npm ci`, then
   `nx run artcraft:build`), then the app with Tauri's build tool (pinned to 2.11.5, in the work
   folder) and `SQLX_OFFLINE=true`. Intel only, asking for macOS 10.15 instead of 11; those
   settings go on the command line, so ArtCraft's files aren't edited for them.
4. Signs the app for your Mac only (ad hoc), so the first open is right-click › Open.
5. Checks the result: the macOS the app asks for, then an audit of every system function and
   class it links to against the macOS 10.15 SDK. One that 10.15 lacks would stop the app at
   launch with "Symbol not found", so the build stops and names it instead.

No `sudo`. Nothing is downloaded and run unpinned. It only deletes inside its own work folder.

## Before you start

- Xcode command line tools: `xcode-select --install`
- Rust, from rustup.rs (installs in your home folder)
- Node.js, an LTS version that starts on Catalina (Node 20 if a newer one won't)
- About 10 GB free and 30 minutes or more. The build can go on another drive, such as an external
  SSD formatted APFS or Mac OS Extended (not exFAT). Rust itself still needs about 2 GB in your
  home folder.

## Use it

First check the Mac is ready. It changes nothing:

```bash
bash artcraft-catalina.sh doctor
```

See the releases, then see exactly what a build would do, still changing nothing:

```bash
bash artcraft-catalina.sh tags
```

```bash
bash artcraft-catalina.sh build artcraft-v0.41.1 --dry-run
```

Build it:

```bash
bash artcraft-catalina.sh build artcraft-v0.41.1
```

On an external drive, put the folder before the command (use your drive's name):

```bash
ARTCRAFT_CATALINA_WORK=/Volumes/SSD/artcraft-catalina bash artcraft-catalina.sh build artcraft-v0.41.1
```

`check` reads any built app, the official one included (open the `.dmg`; no need to install):

```bash
bash artcraft-catalina.sh check /Volumes/ArtCraft/ArtCraft.app
```

`audit` checks any built app against macOS 10.15, one system symbol at a time (it reads the
10.15 SDK's lists from a public mirror, pinned to one commit):

```bash
bash artcraft-catalina.sh audit ~/artcraft-catalina/ArtCraft-artcraft-v0.41.1-catalina.app
```

`scan` lists files in the source and its Rust dependencies that name a macOS 11+ function, and
`patches <tag>` lists the patches for a release.

## For tools and agents

- `--json` before any command prints one JSON object instead of text.
- Exit codes: **0** done, **1** stopped (the message says why), **2** the command was typed wrong.
- `build --dry-run` changes nothing; `doctor`, `tags`, `scan`, `patches`, `check` and `audit` only read.
- A build changes only its work folder (`~/artcraft-catalina`, or `ARTCRAFT_CATALINA_WORK`). Run
  one only when a person says so: it takes 30 minutes or more and about 10 GB.

## Tests

`bash tests/run.sh` runs the script against stand-in Mac tools, so every command's path is
checked anywhere, Linux included; `python3 tests/test_audit.py` checks the audit, offline and
against the real 10.15 SDK. CI runs both, with shellcheck, on every pull request.

Test builds run on GitHub's Intel Macs (`ci/README.md`): they prove the build and the audit, not
that the app runs. Only a Catalina Mac proves that.

## Honest limits

- Not yet run on a real Mac. The first build shows what Catalina is missing; each fix becomes a
  patch here, pinned to the releases it was checked against.
- If the app uses a function only newer macOS has, it can still crash when that part is used.
- The app's own updates won't work. Build the next release with this script instead.
