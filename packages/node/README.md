# @le-space/node

Node-specific adapters, CLI entrypoints, environment parsing, and GitHub output
helpers will live here.

## Site Publish Helper

`runSiteMode(...)` supports static site publishing and domain linking. The site
publish path is implemented directly in Node now, so consumer workflows do not
need a separate Python upload helper dependency chain for static site deploys.
