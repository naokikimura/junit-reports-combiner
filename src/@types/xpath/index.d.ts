declare module 'xpath' {
  type SelectedValue = Node | Attr | string | number | boolean;
  type XPathSelect = {
    <T extends SelectedValue>(expression: string, node?: Node): Array<T>;
    <T extends SelectedValue>(expression: string, node: Node, single: true): T;
  }
  export const select: XPathSelect;
  export function select1<T extends SelectedValue>(expression: string, node?: Node): T;
  export function evaluate(expression: string, contextNode: Node, resolver: XPathNSResolver, type: number, result: XPathResult): XPathResult;
  export function useNamespaces(namespaceMap: { [name: string]: string }): XPathSelect;
  export function parse(expression: string): XPathEvaluator;
}
