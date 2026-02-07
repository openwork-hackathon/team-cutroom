import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @vercel/blob before importing storage
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({ url: "https://blob.vercel-storage.com/test-file.mp3" }),
}))

import { uploadToBlob, uploadAudioBlob, uploadVideoBlob, uploadThumbnailBlob } from "./storage"
import { put } from "@vercel/blob"

describe("Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BLOB_READ_WRITE_TOKEN
  })

  describe("uploadToBlob", () => {
    it("returns placeholder URL when BLOB_READ_WRITE_TOKEN is not set", async () => {
      const buffer = Buffer.from("test data")
      const url = await uploadToBlob(buffer, "test/path.mp3", "audio/mpeg")

      expect(url).toBe("https://placeholder.blob.vercel.com/test/path.mp3")
      expect(put).not.toHaveBeenCalled()
    })

    it("calls put() when BLOB_READ_WRITE_TOKEN is set", async () => {
      process.env.BLOB_READ_WRITE_TOKEN = "test-token"
      const buffer = Buffer.from("test data")

      const url = await uploadToBlob(buffer, "test/path.mp3", "audio/mpeg")

      expect(put).toHaveBeenCalledWith("test/path.mp3", buffer, {
        access: "public",
        contentType: "audio/mpeg",
        token: "test-token",
      })
      expect(url).toBe("https://blob.vercel-storage.com/test-file.mp3")
    })
  })

  describe("uploadAudioBlob", () => {
    it("constructs correct audio path", async () => {
      const buffer = Buffer.from("audio data")
      const url = await uploadAudioBlob(buffer, "pipeline-123", "stage-456")

      expect(url).toBe(
        "https://placeholder.blob.vercel.com/audio/pipeline-123/stage-456.mp3"
      )
    })
  })

  describe("uploadVideoBlob", () => {
    it("constructs correct video path", async () => {
      const buffer = Buffer.from("video data")
      const url = await uploadVideoBlob(buffer, "pipeline-123", "CutroomVideo")

      expect(url).toBe(
        "https://placeholder.blob.vercel.com/video/pipeline-123/CutroomVideo.mp4"
      )
    })
  })

  describe("uploadThumbnailBlob", () => {
    it("constructs correct thumbnail path", async () => {
      const buffer = Buffer.from("image data")
      const url = await uploadThumbnailBlob(buffer, "pipeline-123")

      expect(url).toBe(
        "https://placeholder.blob.vercel.com/thumbnails/pipeline-123/thumb.jpg"
      )
    })
  })
})
