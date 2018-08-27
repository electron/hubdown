require('chai').should()

const fs = require('fs')
const path = require('path')
const {before, describe, it} = require('mocha')
const hubdown = require('..')
const cheerio = require('cheerio')
const level = require('level')
const hasha = require('hasha')
const fixtures = {
  basic: fs.readFileSync(path.join(__dirname, 'fixtures/basic.md'), 'utf8'),
  emoji: fs.readFileSync(path.join(__dirname, 'fixtures/emoji.md'), 'utf8'),
  footnotes: fs.readFileSync(path.join(__dirname, 'fixtures/footnotes.md'), 'utf8'),
  frontmatter: fs.readFileSync(path.join(__dirname, 'fixtures/frontmatter.md'), 'utf8')
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

  it('handles emoji shortcodes', async () => {
    const file = await hubdown(fixtures.emoji)
    fixtures.emoji.should.include(':tada:')
    file.content.should.include('🎉')

    // does not mess with existing emoji
    fixtures.emoji.should.include('✨')
    file.content.should.include('✨')
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

  describe('frontmatter', () => {
    it('does not parse frontmatter by default', async () => {
      const file = await hubdown(fixtures.frontmatter)
      Object.keys(file).should.include('content')
      Object.keys(file).should.not.include('title')
    })

    it('parses YML frontmatter if the frontmatter option is true', async () => {
      const file = await hubdown(fixtures.frontmatter, {frontmatter: true})
      Object.keys(file).should.include('content')
      Object.keys(file).should.include('title')
      file.title.should.equal('Project of the Week: WebTorrent')
      file.author.should.equal('zeke')
      file.date.should.equal('2017-03-14')
    })
  })

  describe('caching', () => {
    const db = level('./test/.cache', {valueEncoding: 'json'})

    it('accepts an optional leveldb instance as a cache', async () => {
      const hash = hasha(fixtures.basic)
      await db.put(hash, {content: 'I came from the cache'})

      const uncached = await hubdown(fixtures.basic)
      uncached.content.should.include('<h2')

      const cached = await hubdown(fixtures.basic, {cache: db})
      cached.content.should.equal('I came from the cache')
    })

    it('saves to the cache', async () => {
      const hash = hasha('Cache me please')
      await db.del(hash)

      await hubdown('Cache me please', {cache: db})
      const cached = await db.get(hash)
      cached.content.should.equal('<p>Cache me please</p>\n')
    })
  })
})
