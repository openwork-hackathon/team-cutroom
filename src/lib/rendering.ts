import path from "path"
import fs from "fs"

// Cache the bundle location across renders (bundling is expensive ~30-60s)
let cachedBundleLocation: string | null = null

/**
 * Bundle the Remotion project. Result is cached so subsequent renders skip this step.
 */
export async function getBundleLocation(): Promise<string> {
  if (cachedBundleLocation) {
    return cachedBundleLocation
  }

  console.log("Bundling Remotion project...")
  const { bundle } = await import("@remotion/bundler")
  const entryPoint = path.resolve(process.cwd(), "remotion", "index.ts")

  cachedBundleLocation = await bundle({
    entryPoint,
    onProgress: (progress: number) => {
      if (progress % 25 === 0) {
        console.log(`  Bundling: ${progress}%`)
      }
    },
  })

  console.log("Bundle complete")
  return cachedBundleLocation
}

/**
 * Render a video to a local file using Remotion.
 */
export async function renderVideoToFile(
  compositionId: string,
  inputProps: Record<string, unknown>,
  durationInFrames: number,
  outputPath: string
): Promise<void> {
  const { renderMedia, selectComposition } = await import("@remotion/renderer")
  const bundleLocation = await getBundleLocation()

  // Ensure output directory exists
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  })

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
    },
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100)
      if (percent % 20 === 0) {
        console.log(`  Rendering: ${percent}%`)
      }
    },
  })
}

/**
 * Render a single frame as a JPEG thumbnail.
 */
export async function renderThumbnailToFile(
  compositionId: string,
  inputProps: Record<string, unknown>,
  frame: number,
  outputPath: string
): Promise<void> {
  const { renderStill, selectComposition } = await import("@remotion/renderer")
  const bundleLocation = await getBundleLocation()

  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  })

  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: outputPath,
    inputProps,
    frame: Math.min(frame, composition.durationInFrames - 1),
    imageFormat: "jpeg",
  })
}
