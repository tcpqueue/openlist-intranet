# OpenList 内网版

基于 OpenList v4.2.6，为内网文件服务提供本地预览资源。目标安装平台为银河麒麟桌面 V10 ARM64；服务通过浏览器访问。

本版本提供本地 DOCX、XLSX、PPTX 预览，PDF 阅读器及中文、繁体、日文、韩文、拉丁、阿拉伯、希伯来回退字体均随程序分发。保留 Local、SMB、SFTP、FTP、WebDav、S3、Virtual 驱动；公共网盘、第三方登录、公共 OCR、Flash 和 EPUB 预览已关闭。默认远程 PDF 印章库已关闭。

## 安装

先确认 `uname -m` 输出为 `aarch64`、`dpkg --print-architecture` 输出为 `arm64`，然后执行：

```sh
sudo dpkg -i openlist-intranet_4.2.6+intranet1_arm64.deb
sudo systemctl status openlist-intranet --no-pager
```

浏览器访问 `http://127.0.0.1:5244`，其他内网机器可使用服务器的内网 IP。服务默认监听 5244 端口；如有其他程序占用，请调整配置后重启。

新安装的默认管理员账号和密码均为 `admin`。若设置了 `OPENLIST_ADMIN_PASSWORD`，使用该环境变量指定的初始密码。已有数据目录的账户密码保持不变。可通过日志确认启动状态：

```sh
sudo journalctl -u openlist-intranet --no-pager
```

也可停止服务后重置密码，再启动服务：

```sh
sudo systemctl stop openlist-intranet
sudo -u openlist-intranet /usr/bin/openlist-intranet admin set '请替换为自己的密码' --data /var/lib/openlist-intranet
sudo systemctl start openlist-intranet
```

数据及运行配置位于 `/var/lib/openlist-intranet`，程序位于 `/usr/bin/openlist-intranet`。服务以独立普通账户 `openlist-intranet` 运行；挂载本地目录前，需给予该账户相应的目录遍历和读写权限。无需安装 Node.js、Go、Python 或公网资源代理。

修改 `/var/lib/openlist-intranet/config.json` 后运行 `sudo systemctl restart openlist-intranet`。同源资源部署时，保持 `cdn` 为空，不要改成外部 CDN。安装包使用独立数据目录，不自动导入其他 OpenList/AList 实例。

## 内网范围

本地预览库和界面默认资源不依赖公网。管理员配置的 S3、WebDAV、SMTP、下载任务、README 图片及其他文件内容仍需使用内网地址。程序没有替代网络边界防火墙；需强制禁止公网时，在主机或网络出口实施规则。

旧版 `.doc`、`.xls`、`.ppt` 不保证能由浏览器本地库直接预览，可下载后使用麒麟上的办公软件打开。PDF 的缺字、公式及复杂版式仍应使用实际业务文档验收。Flash 和 EPUB 文件可保存和下载，但不提供在线预览。

## 升级与卸载

升级前备份整个 `/var/lib/openlist-intranet`，再安装新版本 deb。卸载使用：

```sh
sudo dpkg -r openlist-intranet
```

卸载或 purge 均保留数据目录和服务账户，避免删除文件。确认备份后可由管理员手动清理。

## 从源码构建

需要 Linux、Go 1.27.0、Node.js 24、pnpm 11.24.0、curl、tar、binutils、dpkg-deb。源码和缓存应放在 Linux 原生目录。首次构建需要联网准备依赖，安装包运行时不需要这些构建网络。

```sh
cd web
pnpm install --frozen-lockfile
cd ..
node intranet/prepare-assets.mjs
cd web
pnpm run lint
pnpm run build
cd ..
mkdir -p public/dist
cp -a web/dist/. public/dist/
ARCH=arm64 bash intranet/build-deb.sh
```

资源下载校验值记录于 `intranet/assets.lock.json`；npm 依赖由 `web/pnpm-lock.yaml` 固定。资源缓存完整时可运行 `node intranet/prepare-assets.mjs --offline`。完全断网源码构建还需要预先准备 Go 模块、pnpm 包缓存及工具链。

deb 使用 xz 压缩和 `CGO_ENABLED=0` 静态 ARM64 二进制，避免依赖构建机的 glibc 版本。WSL 和 ARM64 仿真验证不能代替麒麟实体机最终验收。

## 许可及来源

后端沿用 AGPL-3.0，前端沿用 MIT，字体和第三方预览资源保留各自许可。来源及固定提交见 [intranet/UPSTREAM.md](intranet/UPSTREAM.md)，上游项目说明保留于 [README.upstream.md](README.upstream.md)。
