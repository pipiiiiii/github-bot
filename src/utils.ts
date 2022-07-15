export class StringBuilder {
  private array = [] as string[];
  constructor(...initial: string[]) {
    this.array.push(...initial);
  }
  add(str: string, addExtraLine = false) {
    addExtraLine && this.array.push('');
    this.array.push(str);
    addExtraLine && this.array.push('');
  }
  build() {
    return '\n' + this.array.join('\n') + '\n';
  }
  toString() {
    return this.build();
  }
}

export function proxyThisUrl(url: string) {
  return `${HOST}/proxy/${encodeURIComponent(url)}`;
}
