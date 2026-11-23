"""Tests for audit.py. Offline against small hand-made SDK lists in tests/sdk; then, when the
network allows, the same questions against the real pinned macOS 10.15 SDK.
    python3 tests/test_audit.py"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import audit  # noqa: E402

NM = """
                 (undefined) external _CGMainDisplayID (from CoreGraphics)
                 (undefined) external _CGPreflightScreenCaptureAccess (from CoreGraphics)
                 (undefined) weak external _CGRequestScreenCaptureAccess (from CoreGraphics)
                 (undefined) external _OBJC_CLASS_$_CGStandIn (from CoreGraphics)
                 (undefined) external _OBJC_METACLASS_$_CGStandIn (from CoreGraphics)
                 (undefined) external _malloc (from libSystem)
                 (undefined) external _UTTypeStandIn (from UniformTypeIdentifiers)
                 (undefined) external _my_own_function (from libartcraft_helper)
"""
OTOOL = """artcraft:
\t/System/Library/Frameworks/CoreGraphics.framework/Versions/A/CoreGraphics (compatibility version 64.0.0, current version 1463.2.0)
\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1281.0.0)
\t/System/Library/Frameworks/UniformTypeIdentifiers.framework/Versions/A/UniformTypeIdentifiers (compatibility version 1.0.0, current version 1.0.0)
\t@rpath/libartcraft_helper.dylib (compatibility version 0.0.0, current version 0.0.0)
"""


class Offline(unittest.TestCase):
    def setUp(self):
        self.r = audit.audit(audit.parse_nm(NM), audit.parse_otool(OTOOL), audit.Tbd(os.path.join(HERE, "sdk")))

    def missing(self, key):
        return {m["symbol"] for m in self.r[key]}

    def test_reads_nm_and_otool(self):
        self.assertEqual(len(audit.parse_nm(NM)), 8)
        self.assertIn("libSystem", audit.parse_otool(OTOOL))

    def test_present_function_passes(self):
        self.assertNotIn("_CGMainDisplayID", self.missing("missing"))

    def test_missing_required_function_is_caught(self):
        self.assertIn("_CGPreflightScreenCaptureAccess", self.missing("missing"))
        self.assertFalse(self.r["ok"])

    def test_missing_weak_function_is_listed_apart(self):
        self.assertIn("_CGRequestScreenCaptureAccess", self.missing("weak_missing"))
        self.assertNotIn("_CGRequestScreenCaptureAccess", self.missing("missing"))

    def test_classes_and_metaclasses_pass(self):
        self.assertFalse({"_OBJC_CLASS_$_CGStandIn", "_OBJC_METACLASS_$_CGStandIn"} & self.missing("missing"))

    def test_reexports_are_followed(self):
        self.assertNotIn("_malloc", self.missing("missing"))

    def test_a_library_1015_lacks_is_caught(self):
        self.assertIn("/System/Library/Frameworks/UniformTypeIdentifiers.framework/Versions/A/UniformTypeIdentifiers",
                      self.r["unknown_libraries"])

    def test_the_apps_own_libraries_are_skipped(self):
        self.assertNotIn("_my_own_function", self.missing("missing"))

    def test_only_exports_count(self):
        have = audit.Tbd(os.path.join(HERE, "sdk")).exports(
            "/System/Library/Frameworks/CoreGraphics.framework/Versions/A/CoreGraphics")
        self.assertNotIn("_NotAnExportOfThisLibrary", have)

    def test_clean_app_is_ok(self):
        nm = "(undefined) external _CGMainDisplayID (from CoreGraphics)\n(undefined) external _free (from libSystem)\n"
        r = audit.audit(audit.parse_nm(nm), audit.parse_otool(OTOOL), audit.Tbd(os.path.join(HERE, "sdk")))
        self.assertTrue(r["ok"])
        self.assertEqual(r["checked"], 2)


class LiveSdk(unittest.TestCase):
    """The real macOS 10.15 SDK lists. Skipped without network."""

    @classmethod
    def setUpClass(cls):
        cls.tbd = audit.Tbd(audit.SDK_DEFAULT)
        if not cls.tbd.known("/usr/lib/libSystem.B.dylib"):
            raise unittest.SkipTest("the SDK mirror isn't reachable")

    def has(self, lib, sym):
        return sym in self.tbd.exports(lib)

    def test_known_1015_symbols_are_there(self):
        self.assertTrue(self.has("/usr/lib/libSystem.B.dylib", "_malloc"))
        self.assertTrue(self.has("/System/Library/Frameworks/AppKit.framework/Versions/C/AppKit", "_NSApp"))
        self.assertTrue(self.has("/System/Library/Frameworks/AppKit.framework/Versions/C/AppKit", "_OBJC_CLASS_$_NSView"))
        # Foundation comes to AppKit by re-export.
        self.assertTrue(self.has("/System/Library/Frameworks/AppKit.framework/Versions/C/AppKit", "_OBJC_CLASS_$_NSString"))

    def test_macos_11_functions_are_not(self):
        cg = "/System/Library/Frameworks/CoreGraphics.framework/Versions/A/CoreGraphics"
        self.assertTrue(self.has(cg, "_CGMainDisplayID"))
        self.assertFalse(self.has(cg, "_CGPreflightScreenCaptureAccess"))

    def test_macos_11_framework_is_unknown(self):
        self.assertFalse(self.tbd.known(
            "/System/Library/Frameworks/UniformTypeIdentifiers.framework/Versions/A/UniformTypeIdentifiers"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
