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
const sortObject = require('sort-object')

const renderer = remark()
  .use(slug)
  .use(autolinkHeadings, {behaviour: 'wrap'})
  .use(inlineLinks)
  .use(emoji)
  .use([hljs, html], {sanitize: false})

module.exports = async function hubdown (markdownString, opts = {}) {
  const hash = makeHash(markdownString, opts)

  const defaults = {
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

  const md = await pify(renderer.process)(content)
  Object.assign(data, {content: md.contents})

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

  // object keys are sorted to ensure {a:1, b:2} has the same hash as {b:2, a:1}
  // empty object should become an empty string, not {}
  const optsString = Object.keys(hashableOpts).length
    ? JSON.stringify(sortObject(hashableOpts))
    : ''

  return hasha(markdownString + optsString)
}
