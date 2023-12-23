import fs from 'node:fs'
import url from 'node:url'
import link from './link.js'

export async function inject(htmlPath, { out, root, noFetch } = {}) {
  const htmlUrl = url.pathToFileURL(htmlPath)
  const baseUrl = root ? new URL(root) : null
  const newHtml = await link(htmlUrl, { baseUrl, noFetch })
  if (out) {
    await fs.promises.writeFile(out, newHtml);
  } else {
    process.stdout.write(newHtml)
  }
}
