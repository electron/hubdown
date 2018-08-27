const remark = require('remark')
const slug = require('remark-slug')
const hljs = require('remark-highlight.js')
const html = require('remark-html')
const emoji = require('remark-gemoji-to-emoji')
const autolinkHeadings = require('remark-autolink-headings')
const inlineLinks = require('remark-inline-links')
const grayMatter = require('gray-matter')
const pify = require('pify')
const hasha = require('hasha')

const renderer = remark()
  .use(slug)
  .use(autolinkHeadings, {behaviour: 'wrap'})
  .use(inlineLinks)
  .use(emoji)
  .use([hljs, html], {sanitize: false})

module.exports = async function hubdown (markdownString, opts = {}) {
  const hash = hasha(markdownString)
  const defaults = {
    frontmatter: false
  }
  opts = Object.assign(defaults, opts)

  let data = {}
  let content = markdownString

  // check the cache for preprocessed markdown
  if (opts.cache) {
    const existing = await opts.cache.get(hash).catch(err => {
      console.debug(err)
      return null
    })
    if (existing) return existing
  }

  if (opts.frontmatter) {
    const parsed = grayMatter(markdownString)
    data = parsed.data
    content = parsed.content
  }

  const md = await pify(renderer.process)(content)
  Object.assign(data, {content: md.contents})

  // save processed markdown in cache
  if (opts.cache) await opts.cache.put(hash, data)

  return data
}
