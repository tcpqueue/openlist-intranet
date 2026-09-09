# 来源与版本

本仓库基于以下上游快照整合：

- 后端：OpenListTeam/OpenList v4.2.6，提交 `2bdf16d5967d0a403f67d809efd5a418b8f5bd30`，AGPL-3.0。
- `web/` 前端：OpenListTeam/OpenList-Frontend v4.2.6，提交 `0725e589bb7f0e734a7446f427eed2175f26c15c`，MIT。
- 预览资源：OpenListTeam/OpenList-Resource，提交 `950daec45ec423851e172f6296a8fbeeddd0f703`；各子项目保留对应许可证。
- 简体中文：前端 v4.2.6 release 的 `i18n.tar.gz`。
- PDF 阅读器：`@embedpdf/snippet 2.15.0`，PDF 回退字体包 `@embedpdf/fonts-* 1.0.0`，字体许可 OFL-1.1。
- ExcelJS：4.4.0（替换资源仓库中的旧版以修复 XLSX 兼容性），MIT。
- JSZip：3.10.1，供 PPTX 与 DOCX 预览使用；PPTX 另使用 jQuery 3.7.1 和 DOMPurify 3.4.13，保留上游许可。
- PDF 界面与签名字体：`@fontsource/open-sans`、`caveat`、`dancing-script`、`great-vibes`、`pacifico`，具体版本由 pnpm 锁文件固定，保留 OFL 字体许可。

主要修改包括同源预览资源、PDF 字体本地化、关闭公共服务及相应入口、内网驱动注册限制、离线构建资源校验和 deb/systemd 打包。另修正上游 Monaco 类型导入以及动态预览/存储表单的类型声明，以通过当前锁定工具链的 TypeScript 检查。

第三方字体、预览资源的许可证位于随程序内嵌的 `static/vendor` 对应子目录，源码许可证保留在原位置。完整 npm 与 Go 依赖分别由锁文件和 go.mod/go.sum 列出。
