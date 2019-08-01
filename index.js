const unified = require('unified')
const markdown = require('remark-parse')
const emoji = require('remark-gemoji-to-emoji')
const inlineLinks = require('remark-inline-links')
const remark2rehype = require('remark-rehype')
const slug = require('rehype-slug')
const autolinkHeadings = require('rehype-autolink-headings')
const highlight = require('rehype-highlight')
const html = require('rehype-stringify')

const grayMatter = require('gray-matter')
const pify = require('pify')
const hasha = require('hasha')
const stableStringify = require('json-stable-stringify')

module.exports = async function hubdown (markdownString, opts = {}) {
  const hash = makeHash(markdownString, opts)

  const defaults = {
    runBefore: [],
    frontmatter: false
  }
  opts = Object.assign(defaults, opts)

  let data = {}
  let content = markdownString

  // check the cache for preprocessed markdown
  if (opts.cache) {
    let existing = false
    try {
      existing = await opts.cache.get(hash)
    } catch (err) {
      if (!err.notFound) console.error(err)
    }
    if (existing) return existing
  }

  if (opts.frontmatter) {
    const parsed = grayMatter(markdownString)
    data = parsed.data
    content = parsed.content
  }

  const renderer = unified()
    .use(markdown)
    .use(opts.runBefore)
    .use(emoji)
    .use(inlineLinks)
    .use(remark2rehype)
    .use(slug)
    .use(autolinkHeadings, { behavior: 'wrap' })
    .use(highlight)
    .use(html)

  const md = await pify(renderer.process)(content)
  Object.assign(data, { content: md.contents })

  // save processed markdown in cache
  if (opts.cache) await opts.cache.put(hash, data)

  return data
}

// create a unique hash from the given input (markdown + options object)
function makeHash (markdownString, opts) {
  // copy existing opts object to avoid mutation
  const hashableOpts = Object.assign({}, opts)

  // ignore `cache` prop when creating hash
  delete hashableOpts.cache

  // deterministic stringifier gets a consistent hash from stringified results
  // object keys are sorted to ensure {a:1, b:2} has the same hash as {b:2, a:1}
  // empty object should become an empty string, not {}
  const optsString = Object.keys(hashableOpts).length ? stableStringify(hashableOpts) : ''

  return hasha(markdownString + optsString)
}
