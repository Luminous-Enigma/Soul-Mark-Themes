# Test builds on GitHub's Intel Macs

`.github/workflows/catalina-build.yml` builds ArtCraft for macOS 10.15 with this patcher on one of
GitHub's Intel Mac machines, then audits the result against the 10.15 SDK. It proves the build
works and that the app links to nothing 10.15 lacks. Only the owner's Catalina Mac proves it runs.

It never runs on ordinary pull requests. It starts when a person starts it by hand (Actions ›
catalina-build › Run workflow), or when a push to a work branch (not main) changes
`request.txt`, which holds the release tag to build. The owner said yes to these runs on 23 Nov 2026.

Each run prints `REPORT_JSON` with the `check` and `audit` results, and the end of the build log
if the build fails.

A run that builds also keeps the app as a download, `ArtCraft-catalina-app`, for 14 days: open the
run (Actions › catalina-build), scroll to Artifacts and download it. That gives the owner an app to
try on Catalina without building on their Mac. Inside is `ArtCraft-<tag>-catalina.app.zip`;
double-click it to unzip, move the app wherever you like, and open it the first time with
right-click › Open (it is signed for testing only, not notarized).
