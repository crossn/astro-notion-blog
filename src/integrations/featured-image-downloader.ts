import type { AstroIntegration } from 'astro'
import { getAllPosts, downloadFile } from '../lib/notion/client'

export default (): AstroIntegration => ({
  name: 'featured-image-downloader',
  hooks: {
    'astro:build:start': async () => {
      const posts = await getAllPosts()
      const featuredImages = posts.filter(
        (post) => post.FeaturedImage?.Url
      )
      const available = await Promise.all(
        featuredImages.map(async (post) => {
          let url: URL
          try {
            url = new URL(post.FeaturedImage!.Url)
          } catch {
            console.warn(
              `[featured-image-downloader] Invalid image URL for post ${post.Slug}`
            )
            return false
          }

          try {
            return await downloadFile(url)
          } catch {
            // A featured image is optional; keep the rest of the build available.
            console.warn(
              `[featured-image-downloader] Could not make image available for ${url.origin}${url.pathname}`
            )
            return false
          }
        })
      )

      const availableCount = available.filter(Boolean).length
      console.info(
        `[featured-image-downloader] ${availableCount} of ${featuredImages.length} featured images available; ${featuredImages.length - availableCount} unavailable.`
      )
    },
  },
})
