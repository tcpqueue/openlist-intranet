import ResizeObserverPolyfill from "resize-observer-polyfill"

if (typeof window.ResizeObserver !== "function") {
  window.ResizeObserver = ResizeObserverPolyfill
}

// Older Firefox exposes only addListener/removeListener on MediaQueryList.
const originalMatchMedia = window.matchMedia.bind(window)
window.matchMedia = (query: string): MediaQueryList => {
  const result = originalMatchMedia(query)
  if (!result.addEventListener) {
    result.addEventListener = ((_type: string, listener: any) => result.addListener(listener)) as any
    result.removeEventListener = ((_type: string, listener: any) => result.removeListener(listener)) as any
  }
  return result
}

// Keep scrolling usable when the options overload is unavailable.
if (!("scrollBehavior" in document.documentElement.style)) {
  const originalScroll = window.scrollTo.bind(window)
  window.scrollTo = ((x: any, y?: number) => {
    if (typeof x === "object") originalScroll(x.left || 0, x.top || 0)
    else originalScroll(x, y || 0)
  }) as typeof window.scrollTo
}

if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    const blob = this
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error || new Error("读取文件失败"))
      reader.readAsArrayBuffer(blob)
    })
  }
}
