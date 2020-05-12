const unified = require('unified')
const markdown = require('remark-parse')
const emoji = require('remark-gemoji-to-emoji')
const remark2rehype = require('remark-rehype')
const raw = require('rehype-raw')
const slug = require('rehype-slug')
const autolinkHeadings = require('rehype-autolink-headings')
const highlight = require('rehype-highlight')
const html = require('rehype-stringify')

const grayMatter = require('gray-matter')
const hasha = require('hasha')
const stableStringify = require('json-stable-stringify')

// Create processor once, if possible.
const defaultProcessor = createProcessor()

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

  const processor = opts.runBefore.length !== 0 || opts.ignoreMissing
    ? createProcessor(opts.runBefore, opts.ignoreMissing)
    : defaultProcessor

  const file = await processor.process(content)
  Object.assign(data, { content: String(file) })

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

function createProcessor (before, ignoreMissing) {
  return unified()
    .use(markdown)
    .use(before)
    .use(emoji)
    .use(remark2rehype, { allowDangerousHTML: true })
    .use(slug)
    .use(autolinkHeadings, { behavior: 'wrap' })
    .use(highlight,
      {
        languages: {
          graphql: require('highlightjs-graphql').definer
        },
        ignoreMissing: !!ignoreMissing
      })
    .use(raw)
    .use(html)
}
