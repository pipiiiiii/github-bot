import mri from 'mri';

import { Registry } from './registry';
import { equalFunc, regex, startsWith } from './rules';
import type {
  CompareFunc,
  IRegexResolveResult,
  IResolveResult,
  FuncName,
} from './types';

export { CompareFunc, FuncName, equalFunc, regex, startsWith };

export interface IArgv<T> {
  raw: mri.Argv<T>;
  arg0: string;
  _: string[];
}

export class CommandCenter<T> {
  fallbackHandler: T | undefined;

  registry = new Registry<string, T>();
  regexRegistry = new Registry<RegExp, T>();

  prefixes = [] as string[];
  constructor(prefixes?: string[], cb?: (it: CommandCenter<T>) => void) {
    this.prefixes.push(...(prefixes ?? ['/']));
    typeof cb === 'function' && cb(this);
  }

  async all(handler: T) {
    this.fallbackHandler = handler;
  }

  async on(
    pattern: string | RegExp,
    handler: T,
    alias?: string[],
    rule: CompareFunc<string> = equalFunc,
  ) {
    if (pattern) {
      if (typeof pattern === 'string') {
        this.registry.add(pattern, handler, rule);
        if (alias && Array.isArray(alias)) {
          for (const a of alias) {
            this.registry.add(a, handler, rule);
          }
        }
      } else if (typeof pattern === 'object' && pattern instanceof RegExp) {
        this.regexRegistry.add(pattern, handler, regex);
      }
    }
  }

  async resolve(text: string): Promise<IResolveResult | undefined> {
    if (!text) {
      return;
    }

    let isCommand = false;
    let command = text;
    for (const prefix of this.prefixes) {
      if (text.startsWith(prefix)) {
        command = text.slice(prefix.length);
        isCommand = true;
        break;
      }
    }

    if (!isCommand) {
      console.log(
        `no prefix found for ${text}, prefixes: ${JSON.stringify(
          this.prefixes,
        )}`,
      );
      return;
    }
    const result = {
      type: 'text',
    } as IResolveResult;
    let { handler } = this.registry.find(command) ?? {};

    if (!handler) {
      const tmp = this.regexRegistry.find(command);
      if (tmp) {
        const { data, handler: regexHandler } = tmp;
        const regexResult = data.exec(command)!;
        (result as IRegexResolveResult).type = 'regex';
        (result as IRegexResolveResult).regex = data;
        (result as IRegexResolveResult).result = regexResult;
        handler = regexHandler;
      }
    }

    if (!handler && this.fallbackHandler) {
      console.log(`${text} fallback to *`);
      handler = this.fallbackHandler;
    }
    if (handler) {
      console.log(`${text} will be handled`);
    }

    result.handler = handler;

    return result;
  }

  parseCliArgs<T extends Record<string, any>>(command: string): IArgv<T> {
    const result = mri<T>(command.split(' '));
    result['_'] = result._.filter(Boolean);
    return {
      raw: result,
      arg0: result._[0],
      _: result._,
    };
  }
}
