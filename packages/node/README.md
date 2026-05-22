# @le-space/node

Node-specific adapters, CLI entrypoints, environment parsing, and GitHub output
helpers will live here.

## Site Publish Helper

`runSiteMode(...)` supports static site publishing, domain linking, browser
bootstrap env generation, and relay probing. The site publish and relay probe
paths are implemented directly in Node so consumer workflows do not need
repo-local helper scripts for those stages.
