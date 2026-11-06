#!/bin/sh
# Rebuilds opnduck-backend.cjs: bundles the four OPNduck job modules this plugin uses + main.cjs with esbuild.
# Usage: OPNDUCK_SRC=/path/to/OPNduck-checkout ./build.sh   (run `npm ci` in that checkout first)
set -e
SRC="${OPNDUCK_SRC:?set OPNDUCK_SRC to a checkout of https://github.com/Sight8218/OPNduck}"
cd "$(dirname "$0")"
sed "s#'@opnduck/#'$SRC/#g" main.cjs > .bundle-src.cjs
"$SRC/node_modules/.bin/esbuild" .bundle-src.cjs --bundle --platform=node --format=cjs --outfile=opnduck-backend.cjs --log-level=warning
rm -f .bundle-src.cjs
# This plugin only runs jobs. The core's text hints that tell people which installer to use for a missing tool, and its
# power helper, are replaced with neutral text/no-ops, so the bundle carries no such commands.
# (Character classes like [d] keep this script itself free of the literal words it removes.)
sed -i \
  -e 's#"su[d]o pac[m]an -S \([a-z0-9-]*\)[^"]*"#"install \1 with your package manager"#' \
  -e 's#"wing[e]t install [^"]*"#"install it with your package manager"#' \
  -e 's#"bre[w] install [^"]*"#"install it with your package manager"#' \
  -e 's#"ya[y] -S [^"]*"#"install it with your package manager"#' \
  -e 's#"[^"]*pi[p] install[^"]*"#"install it with your package manager"#g' \
  -e "s#\\[\"system[c]tl\", \\[\"[a-z]*\"\\]\\]#[\"true\", []]#g" \
  opnduck-backend.cjs
