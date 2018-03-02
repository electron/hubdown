require('chai').should()

const fs = require('fs')
const path = require('path')
const {before, describe, it} = require('mocha')
const hubdown = require('..')
const cheerio = require('cheerio')
const fixtures = {
  basic: fs.readFileSync(path.join(__dirname, 'fixtures/basic.md'), 'utf8'),
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

  describe('footnotes', () => {
    let file

    before(async () => {
      file = await hubdown(fixtures.footnotes)
    })

    it('handles footnotes in markdown links', async () => {
      fixtures.footnotes.should.include('[link]')
      file.content.should.include('<a href="http://example.com">link</a>')
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
})
