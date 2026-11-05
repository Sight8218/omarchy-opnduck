#!/bin/sh
# Rebuilds opnduck-backend.cjs: bundles OPNduck's job core + main.cjs with esbuild.
# Usage: OPNDUCK_SRC=/path/to/OPNduck-checkout ./build.sh   (run `npm ci` in that checkout first)
set -e
SRC="${OPNDUCK_SRC:?set OPNDUCK_SRC to a checkout of https://github.com/Sight8218/OPNduck}"
cd "$(dirname "$0")"
sed "s#'@opnduck/#'$SRC/#g" main.cjs > .bundle-src.cjs
"$SRC/node_modules/.bin/esbuild" .bundle-src.cjs --bundle --platform=node --format=cjs --outfile=opnduck-backend.cjs --log-level=warning
rm -f .bundle-src.cjs
