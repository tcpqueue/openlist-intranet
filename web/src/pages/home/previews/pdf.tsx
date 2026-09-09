import EmbedPDF from "@embedpdf/snippet"
import pdfiumWasmUrl from "@embedpdf/snippet/dist/pdfium.wasm?url"
import { Box, useColorMode } from "@hope-ui/solid"
import { onMount } from "solid-js"
import { currentLang } from "~/app/i18n"
import { BoxWithFullScreen } from "~/components"
import { objStore } from "~/store"
import { base_path, joinBase } from "~/utils"
import localFontConfig from "~/generated/pdf-fonts.json"

const PDFViewer = () => {
  const { colorMode } = useColorMode()
  let ref: HTMLDivElement | undefined
  onMount(() => {
    const src = objStore.raw_url
    // wasm url must be absolute
    const absolutePdfiumWasmUrl = new URL(
      pdfiumWasmUrl,
      location.href + base_path,
    ).href
    if (ref && src) {
      EmbedPDF.init({
        type: "container",
        target: ref,
        src,
        theme: { preference: colorMode() },
        i18n: {
          defaultLocale: currentLang(),
          fallbackLocale: "en",
        },
        wasmUrl: absolutePdfiumWasmUrl,
        fontFallback: {
          ...localFontConfig,
          baseUrl: new URL(joinBase("static/vendor/pdf-fonts"), location.origin)
            .href,
        },
        fonts: {
          ui: {
            family: "Open Sans, system-ui, sans-serif",
            stylesheetUrl: joinBase("static/vendor/ui-fonts/ui.css"),
          },
          signature: {
            stylesheetUrl: joinBase("static/vendor/ui-fonts/signature.css"),
            fonts: [
              { name: "Caveat", family: "Caveat" },
              { name: "Dancing Script", family: "Dancing Script" },
              { name: "Great Vibes", family: "Great Vibes" },
              { name: "Pacifico", family: "Pacifico" },
            ],
          },
        },
        stamp: { manifests: [] },
      })
    }
  })
  return (
    <BoxWithFullScreen w="$full" h="60vh">
      <Box ref={ref} w="$full" h="$full" />
    </BoxWithFullScreen>
  )
}

export default PDFViewer
