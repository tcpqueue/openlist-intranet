# OpenList 内网版

基于 OpenList v4.2.6，面向银河麒麟桌面 V10 ARM64。新旧浏览器使用同一套文件管理界面，保留文件列表、目录操作、上传、下载及管理后台。所有文件下载到本地后打开，不再提供 PDF、Office、图片、音视频等在线文件预览，也不分发对应阅读器、播放器和预览字体。

## 安装与访问

```sh
sudo dpkg -i openlist-intranet_4.2.6+intranet4_arm64.deb
sudo systemctl status openlist-intranet --no-pager
```

浏览器访问 `http://服务器内网IP:5244`。新安装账号、密码均为 `admin`；已有密码不变。`OPENLIST_ADMIN_PASSWORD` 可覆盖新装初始密码。默认密码公开可猜，正式使用建议修改。

服务使用 root/root，安装时自动启用开机自启并启动；数据配置位于 `/var/lib/openlist-intranet`，程序位于 `/usr/bin/openlist-intranet`。静态 ARM64 二进制不依赖 glibc 动态加载器，不需要安装 Go、Node.js 或 Python；安装包依赖系统已有的 systemd。

## 预设本地存储

首次启动且尚无存储配置时，自动创建 `/tmp/openlist`，作为 Local 存储挂载在首页 `/`。已经配置过存储的实例不覆盖配置；手动删除预设存储后，重启不会重新添加。预设目录仍在使用但被清理时，服务下次启动会重新创建空目录。

systemd 配置为 `PrivateTmp=false`，因此使用的是系统实际的 `/tmp/openlist`。目录须由运行服务的用户拥有，不能是符号链接，也不能允许其他用户写入；新目录权限为 0750。服务不会自动接管不安全的现有目录。

**`/tmp` 可能被系统定期清理或在重启时清空。该预设适合临时文件，长期资料应另行配置持久目录。** 卸载不会删除存储文件或 `/var/lib/openlist-intranet`。

## 浏览器兼容

JavaScript 编译目标为 Chromium 69、Firefox 68 ESR 及以上。统一界面采用兼容的宽度和间距写法、系统中文字体与简洁控件；修复旧浏览器弹窗焦点选择器，并补充 ResizeObserver、MediaQueryList 事件和 Blob.arrayBuffer 兼容实现。上传哈希使用分块 FileReader，避免依赖 Blob.stream；下载不再依赖新开标签页。

实际验证使用 Chromium 70.0.3508.0 和当前 Chromium。Firefox 68 是编译目标，未在该版本上实测。麒麟自带浏览器可能有厂商差异，Linux 4.4 和麒麟实机仍需最终验收。

## 内网与安全

保留 Local、SMB、SFTP、FTP、WebDav、S3、Virtual 驱动。公网地址、域名存储、公共网盘、第三方登录、OCR、离线下载和外部预览入口关闭；网络存储仅接受私有或回环 IP，HTTP 代理禁用，数据库仅使用本地 SQLite。界面资源由本站提供，README 的外部图片和远程内容不加载。

保留此前的鉴权、登录限速和本地文件边界修复。本地读写通过 os.Root 限制在对应存储目录，SFTP 要求验证服务器 SHA256 主机密钥指纹。管理员仍可主动添加本机目录；root、公开默认密码、HTTP/FTP 明文传输的风险不能靠界面适配消除。

## 构建

需要 Linux、Go 1.27.0、Node.js 24、pnpm 11.24.0、curl、tar、binutils、dpkg-deb。项目和缓存放在 Linux 原生目录，`/mnt/...` 仅用于与 Windows 传输文件。

```sh
cd web
pnpm install --frozen-lockfile
cd ..
node intranet/prepare-assets.mjs
cd web
pnpm run lint
pnpm run build
cd ..
rm -rf public/dist
cp -a web/dist public/dist
ARCH=arm64 bash intranet/build-deb.sh
```

资源校验记录在 `intranet/assets.lock.json`。缓存完整时可使用 `node intranet/prepare-assets.mjs --offline`；完全断网构建还需预先准备工具链和依赖缓存。deb 使用 xz，避免旧 dpkg 不支持 zstd。

后端沿用 AGPL-3.0，前端沿用 MIT。来源见 [intranet/UPSTREAM.md](intranet/UPSTREAM.md)，上游说明保留在 README.upstream.md。
