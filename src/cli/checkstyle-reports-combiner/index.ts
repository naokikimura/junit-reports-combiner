import { Readable, Writable } from 'stream';
import util from 'util';
import { CheckstyleReportCombiner, OperatorType } from '../../main';
import DOMLoader from '../../dom/loader';
import DOMStore from '../../dom/store';

const debug = util.debuglog('checkstyle-reports-combiner');

export default async function execute(argv: string[], stdin: Readable, stdout: Writable): Promise<void> {
  const args = argv.slice(2)
    .map(arg => {
      const matches = arg.match(/^--(\w[\w-]*)(?:|\s*=\s*(.*)\s*)$/)
      return matches === null ? ['--', arg] : [matches[1], matches[2]];
    })
    .reduce((map, [key, value]) => map.set(key, (map.get(key) || []).concat(value)), new Map<string, string[]>());

  const namespaces = (args.get('namespace') || [])
    .map(namespace => namespace.split(/\s*=\s*/))
    .reduce((namespaces: { [name: string]: string }, [key, value]) => {
      namespaces[key] = value;
      return namespaces;
    }, {});

  const combinerOptions = {
    namespaces,
    fileKey: (args.get('file-key') || [])[0],
    resultKey: (args.get('result-key') || [])[0],
  };

  const Operator = (args.get('operator') || [])
    .map(CheckstyleReportCombiner.getOperatorType)
    .reduce<OperatorType | undefined>((_, operator) => operator, undefined);

  const all = (((values: string[] | undefined): boolean | undefined => values && values[0] !== 'false')(args.get('all')));
  const distinct = all === undefined ? all : !all;

  debug(util.inspect({ Operator, distinct, combinerOptions }));
  const combiner = new CheckstyleReportCombiner(Operator, distinct, combinerOptions);
  const files = ((files): (string | Readable)[] =>
    files.length > 1 ? files : Array<string | Readable>().concat(stdin, ...files))(args.get('--') || []);
  const first = files[0];
  const others = files.slice(1);
  debug(util.inspect({ first, others }));

  return others
    .reduce<Promise<Document>>(async (previous: Promise<Document>, file: string | Readable) => {
      return Promise.all([await previous, await new DOMLoader().load(file)])
        .then(([left, right]) => combiner.combine(left, right));
    }, new DOMLoader().load(first))
    .then(document => new DOMStore(stdout).store(document));
}
