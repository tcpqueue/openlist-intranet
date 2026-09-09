import { joinBase } from "~/utils"

export const useCDN = () => {
  const static_path = joinBase("static")

  const resource = joinBase("static/vendor")

  const npm = (name: string, version: string, path: string) => {
    return `${resource}/npm/${name}/${version}/${path}`
  }

  const res = (path: string) => {
    return `${resource}/${path}`
  }

  const monacoPath = () => `${static_path}/monaco-editor/vs`
  const katexCSSPath = () => `${static_path}/katex/katex.min.css`
  const mermaidJSPath = () => `${static_path}/mermaid/mermaid.min.js`
  const libHeifPath = () => `${static_path}/libheif`
  const libAssPath = () => `${static_path}/libass-wasm`
  const fontsPath = () => `${static_path}/fonts`

  // Office preview libraries are included in this distribution.
  const pptBasePath = () => res("ppt.js")
  const docxPreviewPath = () => res("docxjs/dist/docx-preview.min.js")
  const excelJSPath = () => res("exceljs/exceljs.min.js")

  return {
    npm,
    res,
    monacoPath,
    katexCSSPath,
    mermaidJSPath,
    libHeifPath,
    libAssPath,
    fontsPath,
    pptBasePath,
    docxPreviewPath,
    excelJSPath,
  }
}
