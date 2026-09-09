import { Component, lazy } from "solid-js"
import { Obj } from "~/types"
import { useT } from "~/hooks"

export interface PreviewComponent {
  key: string
  name: string
  component: Component<{ images?: Obj[]; navigate?: (name: string) => void; openWith?: boolean }>
}

export const getPreviews = (_file: Obj & { provider: string }): PreviewComponent[] => [{
  key: "download",
  name: useT()("home.preview.names.download"),
  component: lazy(() => import("./download")),
}]
