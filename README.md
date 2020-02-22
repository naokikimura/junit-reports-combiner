# junit-reports-combiner

[![npm version](https://badge.fury.io/js/junit-reports-combiner.svg)](https://badge.fury.io/js/junit-reports-combiner) [![CircleCI](https://circleci.com/gh/naokikimura/junit-reports-combiner.svg?style=svg)](https://circleci.com/gh/naokikimura/junit-reports-combiner) [![codecov](https://codecov.io/gh/naokikimura/junit-reports-combiner/branch/master/graph/badge.svg)](https://codecov.io/gh/naokikimura/junit-reports-combiner) [![Known Vulnerabilities](https://snyk.io/test/github/naokikimura/junit-reports-combiner/badge.svg?targetFile=package.json)](https://snyk.io/test/github/naokikimura/junit-reports-combiner?targetFile=package.json)

Combine JUnit XML reports from two and more.

The reports of two and more can be combined using the set operations union, intersection, and difference.

## Installation

### Requires

- Node.js 10+

### CLI

```sh
npm i -g junit-reports-combiner
```

### Modules

```sh
npm i junit-reports-combiner
```

## Usage

### CLI

Combines two reports:

```sh
junit-reports-combiner TEST-example.FooTest.xml TEST-example.BarTest.xml
```

See the `man junit-reports-combiner` for details.

### Modules

```javascript
import { DOMParser } from 'xmldom';
import JUnitReportsCombiner from 'junit-reports-combiner';

const parser = new DOMParser();

const xml1 = `
  <testsuite tests="1" failures="0" name="example.FooTest" time="0.001" errors="0" skipped="0">
    <testcase classname="example.FooTest" name="testFoo" time="0.001"/>
  </testsuite>
`;
const doc1 = parser.parseFromString(xml1, 'application/xml');

const xml2 = `
  <testsuite tests="1" failures="1" name="example.BarTest" time="0.001" errors="0" skipped="0">
    <testcase classname="example.BarTest" name="testBar" time="0.001">
      <failure type="java.lang.AssertionError">java.lang.AssertionError</failure>
    </testcase>
  </testsuite>
`;
const doc2 = parser.parseFromString(xml2, 'application/xml');

const combiner = new JUnitReportsCombiner();
const doc3 = combiner.combine(doc1, doc2);
```

## Contributing
Bug reports and pull requests are welcome on GitHub at https://github.com/naokikimura/junit-reports-combiner

## License
The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
