import { put } from "@vercel/blob"

/**
 * Upload a file to Vercel Blob storage.
 * Falls back to placeholder URL when BLOB_READ_WRITE_TOKEN is not configured.
 */
export async function uploadToBlob(
  buffer: Buffer,
  pathname: string,
  contentType: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (!token) {
    console.warn("BLOB_READ_WRITE_TOKEN not configured, returning placeholder URL")
    return `https://placeholder.blob.vercel.com/${pathname}`
  }

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    token,
  })

  return blob.url
}

/** Upload an audio file for a pipeline stage */
export async function uploadAudioBlob(
  buffer: Buffer,
  pipelineId: string,
  stageId: string
): Promise<string> {
  return uploadToBlob(buffer, `audio/${pipelineId}/${stageId}.mp3`, "audio/mpeg")
}

/** Upload a rendered video for a pipeline */
export async function uploadVideoBlob(
  buffer: Buffer,
  pipelineId: string,
  compositionId: string
): Promise<string> {
  return uploadToBlob(
    buffer,
    `video/${pipelineId}/${compositionId}.mp4`,
    "video/mp4"
  )
}

/** Upload a thumbnail image for a pipeline */
export async function uploadThumbnailBlob(
  buffer: Buffer,
  pipelineId: string
): Promise<string> {
  return uploadToBlob(
    buffer,
    `thumbnails/${pipelineId}/thumb.jpg`,
    "image/jpeg"
  )
}
