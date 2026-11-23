# Patches

Small changes to ArtCraft's source so it builds and runs on macOS 10.15 Catalina. Each one is a
`git diff` against one ArtCraft release, listed in `manifest.tsv` with the releases it fits and why.

The build checks each patch fits before applying it, applies it, then checks it took. If ArtCraft
changed those lines in a newer release, the build stops and says which patch needs updating.

None yet. They get added as the first builds show what Catalina lacks.
