#!/bin/sh
# Rebuilds opnduck-backend.cjs: bundles the four OPNduck job modules this plugin uses + main.cjs with esbuild.
# Usage: OPNDUCK_SRC=/path/to/OPNduck-checkout ./build.sh   (run `npm ci` in that checkout first)
set -e
SRC="${OPNDUCK_SRC:?set OPNDUCK_SRC to a checkout of https://github.com/Sight8218/OPNduck}"
cd "$(dirname "$0")"
sed "s#'@opnduck/#'$SRC/#g" main.cjs > .bundle-src.cjs
"$SRC/node_modules/.bin/esbuild" .bundle-src.cjs --bundle --platform=node --format=cjs --outfile=opnduck-backend.cjs --log-level=warning
rm -f .bundle-src.cjs
# The plugin never installs software, runs sudo or sleeps/shuts down the machine. The core's text hints and its
# power helper are neutralised so the bundle carries no such commands (the engine only reports "not installed").
sed -i \
  -e 's#"sudo pacman -S \([a-z0-9-]*\)[^"]*"#"install \1 with your package manager"#' \
  -e 's#"winget install [^"]*"#"install it with your package manager"#' \
  -e 's#"brew install [^"]*"#"install it with your package manager"#' \
  -e "s#\\[\"systemctl\", \\[\"suspend\"\\]\\]#[\"true\", []]#" \
  -e "s#\\[\"systemctl\", \\[\"poweroff\"\\]\\]#[\"true\", []]#" \
  opnduck-backend.cjs
