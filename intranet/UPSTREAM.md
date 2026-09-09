# 来源与版本

- 后端：OpenListTeam/OpenList v4.2.6，提交 `2bdf16d5967d0a403f67d809efd5a418b8f5bd30`，AGPL-3.0。
- 前端：OpenListTeam/OpenList-Frontend v4.2.6，提交 `0725e589bb7f0e734a7446f427eed2175f26c15c`，MIT。
- 本地图标：OpenListTeam/OpenList-Resource，提交 `950daec45ec423851e172f6296a8fbeeddd0f703`；保留对应许可证。
- 简体中文：前端 v4.2.6 release 的 `i18n.tar.gz`。

intranet.4 使用统一文件管理界面，取消文件在线预览和相关资源打包，文件下载后用本机软件打开。目录说明使用的 KaTeX、Mermaid 资源仍随程序本地提供。依赖版本见 pnpm-lock.yaml 和 go.mod/go.sum，许可证保留在源码及内嵌资源中。

主要修改包括内网访问限制、公共服务及相应入口移除、安全修复、旧浏览器补丁、默认本地存储，以及静态 ARM64 可执行文件与 deb/systemd 打包。tabbable 补丁使用 JavaScript 检查 inert 祖先，避开老浏览器不支持的复杂 :not() 选择器。
