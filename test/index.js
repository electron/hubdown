const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.should()
const fs = require('fs')
const path = require('path')
const { before, describe, it } = require('mocha')
const hubdown = require('..')
const cheerio = require('cheerio')
const level = require('level')
const hasha = require('hasha')
const fixtures = {
  basic: fs.readFileSync(path.join(__dirname, 'fixtures/basic.md'), 'utf8'),
  emoji: fs.readFileSync(path.join(__dirname, 'fixtures/emoji.md'), 'utf8'),
  footnotes: fs.readFileSync(path.join(__dirname, 'fixtures/footnotes.md'), 'utf8'),
  frontmatter: fs.readFileSync(path.join(__dirname, 'fixtures/frontmatter.md'), 'utf8'),
  graphql: fs.readFileSync(path.join(__dirname, 'fixtures/graphql.md'), 'utf8'),
  html: fs.readFileSync(path.join(__dirname, 'fixtures/html.md'), 'utf8'),
  unknownLanguage: fs.readFileSync(path.join(__dirname, 'fixtures/unknown-language.md'), 'utf8')
}

describe('hubdown', () => {
  let file, $

  before(async () => {
    file = await hubdown(fixtures.basic)
    $ = cheerio.load(file.content)
  })

  it('adds DOM ids to headings', () => {
    $('h2#basic-fixture').length.should.equal(1)
  })

  it('turns headings into links', () => {
    $('h2#basic-fixture a[href="#basic-fixture"]').text().should.equal('Basic Fixture')
  })

  it('handles markdown links', () => {
    fixtures.basic.should.include('[link](https://link.com)')
    file.content.should.include('<a href="https://link.com">link</a>')
  })

  it('uses GraphQL syntax higlighting', async () => {
    const file = await hubdown(fixtures.graphql)
    $ = cheerio.load(file.content)
    fixtures.graphql.should.include('```graphql')
    $('pre > code.hljs.language-graphql').length.should.equal(1)
    $('pre > code > span.hljs-keyword').length.should.equal(1)
    $('span.hljs-string').first().text().should.equal('"octocat"')
    $('span.hljs-number').first().text().should.equal('20')
  })

  it('handles emoji shortcodes', async () => {
    const file = await hubdown(fixtures.emoji)
    fixtures.emoji.should.include(':tada:')
    file.content.should.include('🎉')

    // does not mess with existing emoji
    fixtures.emoji.should.include('✨')
    file.content.should.include('✨')
  })

  it('preserves raw HTML from input string', async () => {
    const file = await hubdown(fixtures.html)
    fixtures.html.should.include('<div class="note">')
    fixtures.html.should.include('*Markdown*')
    file.content.should.include('<div class="note">')
    file.content.should.include('<em>Markdown</em>')
  })

  describe('highlight.ignoreMissing option', () => {
    it('throws an error when unknown language is present', () => {
      return hubdown(fixtures.unknownLanguage).should.be.rejectedWith(/Unknown language: `some-unknown-language`/)
    })

    it('should work when the highlight.ignoreMissing option is true', async () => {
      const file = await hubdown(fixtures.unknownLanguage, { highlight: { ignoreMissing: true } })
      $ = cheerio.load(file.content)
      fixtures.unknownLanguage.should.include('```some-unknown-language')
      $('pre > code.hljs.language-some-unknown-language').length.should.equal(1)
    })
  })

  describe('footnotes', () => {
    let file

    before(async () => {
      file = await hubdown(fixtures.footnotes)
    })

    it('handles footnotes in markdown links', async () => {
      fixtures.footnotes.should.include('[link]')
      file.content.should.include('<a href="http://example.com">link</a>')
    })

    it('handles full reference links', () => {
      fixtures.footnotes.should.include('[full reference link][full]')
      file.content.should.include('<a href="http://full.com">full reference link</a>')
    })
  })

  describe('runBefore', () => {
    it('runs custom plugins', async () => {
      let pluginDidRun = false
      const plugin = () => (tree) => {
        pluginDidRun = true
        return tree
      }
      await hubdown(fixtures.basic, { runBefore: [plugin] })
      pluginDidRun.should.equal(true)
    })
  })

  describe('frontmatter', () => {
    it('does not parse frontmatter by default', async () => {
      const file = await hubdown(fixtures.frontmatter)
      Object.keys(file).should.include('content')
      Object.keys(file).should.not.include('title')
    })

    it('parses YML frontmatter if the frontmatter option is true', async () => {
      const file = await hubdown(fixtures.frontmatter, { frontmatter: true })
      Object.keys(file).should.include('content')
      Object.keys(file).should.include('title')
      file.title.should.equal('Project of the Week: WebTorrent')
      file.author.should.equal('zeke')
      file.date.should.equal('2017-03-14')
    })
  })

  describe('caching', () => {
    const db = level('./test/.cache', { valueEncoding: 'json' })

    it('accepts an optional leveldb instance as a cache', async () => {
      const hash = hasha(fixtures.basic)
      await db.put(hash, { content: 'I came from the cache' })

      const uncached = await hubdown(fixtures.basic)
      uncached.content.should.include('<h2')

      const cached = await hubdown(fixtures.basic, { cache: db })
      cached.content.should.equal('I came from the cache')
    })

    it('saves to the cache', async () => {
      const hash = hasha('Cache me please')
      await db.del(hash)

      await hubdown('Cache me please', { cache: db })
      const cached = await db.get(hash)
      cached.content.should.equal('<p>Cache me please</p>')
    })
  })
})
