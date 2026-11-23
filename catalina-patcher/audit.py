#!/usr/bin/env python3
"""Does a built Mac app need anything macOS 10.15 Catalina doesn't have?

    python3 audit.py <app executable> [--sdk <folder or https URL of a MacOSX10.15.sdk>] [--json]

Lists every system function and class the app links to (from `nm -m -u`), and checks each one
against what the 10.15 SDK says that library exports (its .tbd files, following re-exports). A
required ("strong") symbol 10.15 lacks stops the app at launch with "Symbol not found"; a weak one
is fine as long as the code checks for it first. Exit codes: 0 nothing missing, 1 something
missing (or the check couldn't run), 2 typed wrong. Plain Python 3.8, no packages: it runs on the
Catalina Mac itself.

The default SDK is the public mirror at phracker/MacOSX-SDKs, pinned to one commit, read only.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

SDK_DEFAULT = ("https://raw.githubusercontent.com/phracker/MacOSX-SDKs/"
               "041600eda65c6a668f66cb7d56b7d1da3e8bcc93/MacOSX10.15.sdk")
ARCH = "x86_64"
LIST_KEYS = ("symbols", "objc-classes", "objc-eh-types", "objc-ivars", "weak-def-symbols",
             "weak-symbols", "thread-local-symbols", "re-exports", "reexported-libraries", "libraries")


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    as_json = "--json" in argv
    sdk = SDK_DEFAULT
    if "--sdk" in argv:
        i = argv.index("--sdk")
        if i + 1 >= len(argv):
            return usage()
        sdk = argv[i + 1]
        args = [a for a in args if a != sdk]
    if len(args) != 1:
        return usage()
    binary = args[0]
    if not os.path.isfile(binary):
        return stop("no file at %s" % binary, as_json)
    try:
        imports = undefined_symbols(binary)
        libs = linked_libraries(binary)
    except (OSError, subprocess.CalledProcessError) as e:
        return stop("couldn't read the app with nm and otool: %s" % e, as_json)
    report = audit(imports, libs, Tbd(sdk))
    if as_json:
        print(json.dumps(report))
    else:
        print_report(report)
    return 0 if report["ok"] else 1


def usage():
    sys.stderr.write(__doc__.split("\n\n")[1] + "\n")
    return 2


def stop(message, as_json):
    if as_json:
        print(json.dumps({"ok": False, "stopped": message}))
    else:
        sys.stderr.write("Stopped: %s\n" % message)
    return 1


# ---- reading the app ------------------------------------------------------------------------

def undefined_symbols(binary):
    """[(symbol, library short name, weak)] from `nm -m -u`."""
    out = run(["nm", "-arch", ARCH, "-m", "-u", binary])
    return parse_nm(out)


def parse_nm(text):
    rows = []
    for line in text.splitlines():
        m = re.search(r"\(undefined\)\s+(weak\s+)?external\s+(\S+)\s+\(from\s+([^)]+)\)", line)
        if m:
            rows.append((m.group(2), m.group(3), bool(m.group(1))))
    return rows


def linked_libraries(binary):
    """{short name: install path} from `otool -L`, the way nm names them."""
    return parse_otool(run(["otool", "-arch", ARCH, "-L", binary]))


def parse_otool(text):
    libs = {}
    for line in text.splitlines()[1:]:
        line = line.strip()
        if not line or line.endswith(":"):
            continue
        path = line.split(" (")[0]
        libs[short_name(path)] = path
    return libs


def short_name(path):
    base = os.path.basename(path)
    if base.endswith(".dylib"):
        base = base[:-6]
    return base.split(".")[0]


def run(cmd):
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          universal_newlines=True).stdout


# ---- what 10.15 exports ---------------------------------------------------------------------

class Tbd:
    """The SDK's .tbd files: each library's exports, following re-exports."""

    def __init__(self, sdk):
        self.sdk = sdk.rstrip("/")
        self.docs = {}      # install name -> (set of exported names, [re-exported install names])
        self.tried = set()  # .tbd files already fetched or found missing

    def exports(self, install_name, seen=None):
        seen = seen if seen is not None else set()
        if install_name in seen:
            return set()
        seen.add(install_name)
        self.load(install_name)
        names, reexports = self.docs.get(install_name, (set(), []))
        out = set(names)
        for r in reexports:
            out |= self.exports(r, seen)
        return out

    def known(self, install_name):
        self.load(install_name)
        return install_name in self.docs

    def load(self, install_name):
        if install_name in self.docs:
            return
        for path in tbd_paths(install_name):
            if path in self.tried:
                continue
            self.tried.add(path)
            text = self.read(path)
            if text is not None:
                for name, doc in parse_tbd(text).items():
                    self.docs.setdefault(name, doc)
                if install_name in self.docs:
                    return

    def read(self, path):
        where = self.sdk + path
        try:
            if where.startswith("https://"):
                req = urllib.request.Request(where, headers={"User-Agent": "catalina-patcher-audit"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    return r.read().decode("utf-8", "replace")
            with open(where, encoding="utf-8", errors="replace") as f:
                return f.read()
        except (OSError, ValueError):
            return None


def tbd_paths(install_name):
    """Where an install name's .tbd can be: next to the binary, or the library's own .tbd."""
    stem = install_name[:-6] if install_name.endswith(".dylib") else install_name
    paths = [stem + ".tbd"]
    m = re.match(r"(.*/([^/]+)\.framework)/Versions/[^/]+/[^/]+$", install_name)
    if m:
        paths.append("%s/%s.tbd" % (m.group(1), m.group(2)))
    return paths


def parse_tbd(text):
    """{install name: (exported names, re-exported install names)} for every document."""
    docs = {}
    for part in re.split(r"^--- !tapi", text, flags=re.M)[1:]:
        m = re.search(r"^install-name:\s*'?([^'\n]+)'?", part, flags=re.M)
        if not m:
            continue
        names, reexports = set(), []
        # Only what a library offers others: its exports (and v4's re-exports) sections.
        for section in re.split(r"^(?=[a-z-]+:)", part, flags=re.M):
            if not re.match(r"(exports|reexports|reexported-libraries):", section):
                continue
            for key, body in re.findall(r"([a-z-]+):\s*\[([^\]]*)\]", section):
                if key not in LIST_KEYS:
                    continue
                items = [i.strip().strip("'\"") for i in body.replace("\n", " ").split(",")]
                items = [i for i in items if i]
                if key in ("re-exports", "reexported-libraries", "libraries"):
                    reexports += items
                else:
                    names |= {symbol_for(key, i) for i in items}
        docs[m.group(1).strip()] = (names, reexports)
    return docs


def symbol_for(key, name):
    if key == "objc-classes":
        return "_OBJC_CLASS_$_" + name.lstrip("_")
    if key == "objc-eh-types":
        return "_OBJC_EHTYPE_$_" + name.lstrip("_")
    if key == "objc-ivars":
        return "_OBJC_IVAR_$_" + name.lstrip("_")
    return name


# ---- the check ------------------------------------------------------------------------------

def audit(imports, libs, tbd):
    by_lib = {}
    for sym, lib, weak in imports:
        by_lib.setdefault(lib, []).append((sym, weak))
    missing, weak_missing, unknown, checked = [], [], [], 0
    for lib, syms in sorted(by_lib.items()):
        path = libs.get(lib)
        if not path or not (path.startswith("/System/") or path.startswith("/usr/lib/")):
            continue  # the app's own or bundled code
        if not tbd.known(path):
            unknown.append(path)
            continue
        have = tbd.exports(path)
        for sym, weak in syms:
            checked += 1
            if is_meta(sym, have) or sym in have:
                continue
            (weak_missing if weak else missing).append({"symbol": sym, "library": path})
    return {"ok": not missing and not unknown, "checked": checked, "missing": missing,
            "weak_missing": weak_missing, "unknown_libraries": unknown}


def is_meta(sym, have):
    # A class's metaclass ships with the class.
    return sym.startswith("_OBJC_METACLASS_$_") and ("_OBJC_CLASS_$_" + sym[18:]) in have


def print_report(r):
    print("System symbols checked against macOS 10.15: %d" % r["checked"])
    if r["missing"]:
        print("MISSING on 10.15 (the app stops at launch until these are patched):")
        for m in r["missing"]:
            print("  %s  (%s)" % (m["symbol"], m["library"]))
    if r["weak_missing"]:
        print("Weak, missing on 10.15 (fine if the code checks before using them):")
        for m in r["weak_missing"]:
            print("  %s  (%s)" % (m["symbol"], m["library"]))
    if r["unknown_libraries"]:
        print("Libraries the 10.15 SDK doesn't have at all (the app won't open):")
        for p in r["unknown_libraries"]:
            print("  " + p)
    print("Nothing missing." if r["ok"] else "Something is missing; see above.")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
