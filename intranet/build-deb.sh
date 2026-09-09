#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version="${VERSION:-4.2.6+intranet5}"
arch="${ARCH:-arm64}"
case "$arch" in arm64|amd64) ;; *) echo "Unsupported architecture: $arch" >&2; exit 1;; esac
test -f public/dist/index.html || { echo 'Build the frontend and copy web/dist to public/dist first.' >&2; exit 1; }
mkdir -p artifacts .build
stage="$(mktemp -d "$PWD/.build/deb-${arch}.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
mkdir -p "$stage/DEBIAN" "$stage/usr/bin" "$stage/lib/systemd/system" "$stage/usr/share/doc/openlist-intranet"
commit="$(git rev-parse --short HEAD)"
built_at="$(date -u +'%Y-%m-%d %H:%M:%S UTC')"
CGO_ENABLED=0 GOOS=linux GOARCH="$arch" go build -trimpath -tags=jsoniter \
  -ldflags="-s -w -X github.com/OpenListTeam/OpenList/v4/internal/conf.Version=v${version} -X github.com/OpenListTeam/OpenList/v4/internal/conf.WebVersion=v4.2.6-intranet -X github.com/OpenListTeam/OpenList/v4/internal/conf.GitCommit=${commit} -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitAuthor=OpenList contributors and tcpqueue' -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.BuiltAt=${built_at}'" \
  -o "$stage/usr/bin/openlist-intranet" .
if readelf -l "$stage/usr/bin/openlist-intranet" | grep -q INTERP; then
  echo 'Expected a static binary, found a dynamic loader.' >&2; exit 1
fi
install -m 644 intranet/openlist-intranet.service "$stage/lib/systemd/system/"
install -m 644 LICENSE "$stage/usr/share/doc/openlist-intranet/copyright"
install -m 644 README.md "$stage/usr/share/doc/openlist-intranet/README.md"
install -m 644 intranet/UPSTREAM.md "$stage/usr/share/doc/openlist-intranet/UPSTREAM.md"
install -m 644 web/LICENSE "$stage/usr/share/doc/openlist-intranet/frontend-LICENSE"
install -m 644 intranet/assets.lock.json "$stage/usr/share/doc/openlist-intranet/assets.lock.json"
install -m 755 intranet/postinst "$stage/DEBIAN/postinst"
install -m 755 intranet/prerm "$stage/DEBIAN/prerm"
install -m 755 intranet/postrm "$stage/DEBIAN/postrm"
size="$(du -sk "$stage/usr" "$stage/lib" | awk '{s+=$1} END {print s}')"
cat > "$stage/DEBIAN/control" <<EOF
Package: openlist-intranet
Version: ${version}
Section: net
Priority: optional
Architecture: ${arch}
Maintainer: tcpqueue <44940833+tcpqueue@users.noreply.github.com>
Installed-Size: ${size}
Depends: systemd
Homepage: https://github.com/tcpqueue/openlist-intranet
Description: OpenList intranet file server for older desktop browsers
 Provides a unified file management UI and local file downloads.
 Cloud drives, third-party login, public OCR, Flash and EPUB previews
 are disabled. Uses a static Linux executable and a systemd service.
EOF
(cd "$stage"; find usr lib -type f -print0 | sort -z | xargs -0 md5sum > DEBIAN/md5sums)
out="artifacts/openlist-intranet_${version}_${arch}.deb"
# xz is supported by dpkg in Kylin Desktop V10; avoid newer zstd packages.
dpkg-deb --root-owner-group -Zxz -z6 --build "$stage" "$out"
cp "$stage/usr/bin/openlist-intranet" "artifacts/openlist-intranet-linux-${arch}"
sha256sum "$out" > "$out.sha256"
echo "Built $out"
