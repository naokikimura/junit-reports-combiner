# junit-reports-combiner

[![npm version](https://badge.fury.io/js/junit-reports-combiner.svg)](https://badge.fury.io/js/junit-reports-combiner) [![CircleCI](https://circleci.com/gh/naokikimura/junit-reports-combiner.svg?style=svg)](https://circleci.com/gh/naokikimura/junit-reports-combiner) [![Known Vulnerabilities](https://snyk.io/test/github/naokikimura/junit-reports-combiner/badge.svg?targetFile=package.json)](https://snyk.io/test/github/naokikimura/junit-reports-combiner?targetFile=package.json)

Combine JUnit XML reports from two and more.

The reports of two and more can be combined using the set operations union, intersection, and difference.

## Installation

### Requires

- Node.js 10+

### CLI

```sh
npm i -g junit-reports-combiner
```

## Usage

### CLI

Combines two reports:

```sh
junit-reports-combiner TEST-example.FooTest.xml TEST-example.BarTest.xml
```

See the `man junit-reports-combiner` for details.

## Contributing
Bug reports and pull requests are welcome on GitHub at https://github.com/naokikimura/junit-reports-combiner

## License
The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
