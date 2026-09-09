import { Box, Heading, Text } from "@hope-ui/solid"
import { useManageTitle } from "~/hooks"

export default function About() {
  useManageTitle("manage.sidemenu.about")
  return (
    <Box>
      <Heading>OpenList 内网版</Heading>
      <Text mt="$4">
        基于 OpenList v4.2.6，提供本地文件管理及内网协议挂载。
      </Text>
      <Text mt="$2">
        文件统一下载到本地打开，不加载在线阅读器、播放器和预览字体。公共网盘、第三方登录及 OCR 已关闭。
      </Text>
      <Text mt="$2">
        OpenList 后端遵循 AGPL-3.0，前端遵循 MIT。版权及第三方许可随安装包提供。
      </Text>
      <Text mt="$2">项目源码：github.com/tcpqueue/openlist-intranet</Text>
    </Box>
  )
}
