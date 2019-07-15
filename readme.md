# hubdown 

> Convert markdown to GitHub-style HTML using a common set of [remark] plugins

Used by [electron/i18n](https://github.com/electron/i18n)
and [electronjs.org](https://github.com/electron/electronjs.org).

[remark] is a performant markdown parser with a large plugin ecosystem.
Unlike some other node markdown parsers that provide syntax highlighting 
capabilities, remark does not have any native C++ dependencies. This makes 
it easier to install and reduces the likelihood of system-dependent installation
failures.

## Plugins

The following [remark] plugins are used by hubdown:

- [remark-slug](http://ghub.io/remark-slug) adds DOM ids to headings
- [remark-autolink-headings](http://ghub.io/remark-autolink-headings) turns headings into links
- [remark-inline-links](http://ghub.io/remark-inline-links) supports markdown reference links
- [remark-highlight.js](http://ghub.io/remark-highlight.js) applies syntax highlighting to code blocks using highlight.js
- [remark-html](http://ghub.io/remark-html) converts the parsed markdown tree to HTML

## Installation

```sh
npm install hubdown --save
```

## Usage

hubdown exports a single function that returns a promise:

```js
const hubdown = require('hubdown')

hubdown('I am markdown').then(doc => {
  console.log(doc)
})
```

The resolved promise yields an object with a `content` property
containing the parsed HTML:

```js
{
  content: '<p>I am markdown</p>'
}
```

## Usage with Cache

hubdown's `remark` markdown parser is pretty fast, but things can start to slow 
down when you're processing hundreds or thousands of files. To make life easier 
in these situations you can use hubdown's optional cache, which stores 
preprocessed markdown for fast retrieval on subsequent runs.

To use the cache, bring your own [level](https://ghub.io/level) instance and
supply it as an option to hubdown. This helps keep hubdown lean on (native) 
dependencies for users who don't need the cache.

```js
const hubdown = require('hubdown')
const cache = require('level')('./my-hubdown-cache')

hubdown('I will be cached.', { cache }).then(doc => {
  console.log(doc)
})
```

## API

### `hubdown(markdownString[, options])`

Arguments:

- `markdownString` String - (required)
- `options` Object - (optional)
  - `runBefore` Array of [remark] plugins - Custom plugins to be run before the commonly used plugins listed [above](#plugins).
  - `frontmatter` Boolean - Whether or not to try to parse [YML frontmatter] in 
    the file. Defaults to `false`.
  - `cache` [LevelDB](https://ghub.io/level) - An optional `level` instance in which
  to store preprocessed content. See [Usage with Cache](#usage-with-cache).

Returns a promise. The resolved object looks like this:

```js
{
  content: 'HTML goes here'
}
```

If [YML frontmatter] is parsed, those properties will be present on the object too:

```js
{
  title: 'The Feminine Mystique',
  author: 'Betty Friedan',
  content: '<p>The Feminine Mystique is a book written by Betty Friedan which is widely credited with sparking the  beginning of second-wave feminism in the United States.</p>'
}
```

## Tests

```sh
npm install
npm test
```

## License

MIT

[remark]: http://ghub.io/remark
[YML frontmatter]: https://jekyllrb.com/docs/frontmatter