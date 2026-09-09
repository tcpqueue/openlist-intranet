# intranet.4 兼容性与验证

本版本面向银河麒麟桌面 V10 ARM64，使用一套文件管理界面。文件统一下载到本地打开，不提供 PDF、Office、音视频、图片等在线阅读器。

## 网页验证

构建目标 Chromium 69 / Firefox 68。实际使用 Chromium 70.0.3508.0 与现代 Chromium 验证；构建目标不等于这些版本全部通过实机测试。

测试在只有回环接口的 Linux 网络命名空间内运行，覆盖登录、文件列表、下载页、管理页、中文目录创建、超过 2 MiB 文件上传与下载内容核对、1024 与 640 像素窗口布局。现代浏览器覆盖 12 个页面，记录页面异常、HTTP 错误和外部请求。

旧浏览器回归脚本为 `intranet/tests/test_legacy_browser.cjs`，由 `test_intranet.py --browser-script` 调用。环境变量 `INTRANET_PUPPETEER` 指向 puppeteer-core 1.7.0 模块绝对路径，`INTRANET_LEGACY_CHROME` 指向旧 Chromium 可执行文件。浏览器仅用于测试，不随安装包提供。前端 CSP 拒绝 Vite 的 data URL 能力探测时，会使用本地兼容脚本，控制台可出现对应 CSP 提示。

## 部署与预设

- deb 采用 xz 压缩，静态 ARM64 主程序不需要额外的 glibc 动态库；服务管理依赖 systemd。
- 服务以 root 运行，安装时启用并启动，开机自启。配置与数据库在 `/var/lib/openlist-intranet`。
- 首次启动且没有已有存储时，创建 Local 存储 `/tmp/openlist`，挂载 `/`。目录权限 0750，不显示隐藏文件；上传文件权限 0600。
- 启动时只为仍然启用且指向默认路径的 Local 存储补建缺失目录；修改配置或删除预设后不会恢复预设。初始化标记保存在数据目录。
- `/tmp` 可被系统清理。补建目录不能恢复文件，长期保存应改用持久目录。
- 初始账号密码 admin/admin，已有密码不变；游客默认禁用。公共默认密码和 root 运行是部署约定。

ARM64 程序使用 QEMU 用户态测试，运行于 WSL 宿主内核。尚未在实体麒麟 V10 / Linux 4.4 内核及其自带浏览器上验证，不能将 QEMU 测试等同于该实机验证。安装脚本通过临时目录和替身命令测试，不等同于实体系统的 systemd 安装测试。

`SECURITY-REVIEW.md` 是 intranet.3 的历史审查记录，其阅读器及字体描述不适用于本版本。
