import { createMD5, createSHA1, createSHA256 } from "hash-wasm"

interface WorkerProgressMessage {
  type: "progress"
  progress: number
}

interface WorkerResultMessage {
  type: "result"
  hash: { md5: string; sha1: string; sha256: string }
}

interface WorkerErrorMessage {
  type: "error"
  error: string
}

export type WorkerMessage =
  WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  const { file } = e.data
  try {
    const [md5Digest, sha1Digest, sha256Digest] = await Promise.all([
      createMD5(),
      createSHA1(),
      createSHA256(),
    ])

    // FileReader and Blob.slice are supported by early Kylin browsers.
    // Keep memory bounded while hashing large files in the worker.
    const chunkSize = 2 * 1024 * 1024
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, file.size)
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error || new Error("读取文件失败"))
        reader.readAsArrayBuffer(file.slice(offset, end))
      })
      const value = new Uint8Array(buffer)
      md5Digest.update(value)
      sha1Digest.update(value)
      sha256Digest.update(value)
      const progress: WorkerProgressMessage = { type: "progress", progress: end / file.size * 100 }
      self.postMessage(progress)
    }

    const result: WorkerResultMessage = {
      type: "result",
      hash: {
        md5: md5Digest.digest("hex"),
        sha1: sha1Digest.digest("hex"),
        sha256: sha256Digest.digest("hex"),
      },
    }
    self.postMessage(result)
  } catch (error) {
    const err: WorkerErrorMessage = {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(err)
  }
}
