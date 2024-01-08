import { PropDecl } from "./AwaitCore";
import { Obtainer } from "./obtainer";


export type ExtObtainer<T> = (() => T) | [() => T, ...any[]]
type ObtainerKey<Key extends string> = `f$${Key}`
export type MaybePromise<T> = T | Promise<T>;
type SelfPromiseOrObtainer<T, Key extends keyof T> = 
  | & { [P in Key]: MaybePromise<T[P]> }
    & { [P in Key as ObtainerKey<string & P>]?: never } 
  | & { [P in Key as ObtainerKey<string & P>]: ExtObtainer<MaybePromise<T[P]>> }
    & { [P in Key]?: never }
export type WithPromisesAndObtainers<T> = { // Contravariance hack
    [P in string & keyof T]: (k: SelfPromiseOrObtainer<T, P>) => void
}[string & keyof T] extends {
    [P in string & keyof T]: (k: infer I) => void
}[string & keyof T] ? I : never

const PREFIX = "f$"

export function parseProps(props: Record<string, any>): [string, PropDecl][] {
  return Object.entries(props).map(([name, value]) => {
    if (!name.startsWith(PREFIX)) return [name, { value }];
    return [name.slice(PREFIX.length), { obtainer: parseObtainer(value) }];
  });
}

export function parseObtainer(data: unknown): Obtainer {
  if (typeof data === "function") return { fn: data };
  if (Array.isArray(data) && typeof data[0] === "function") {
    const [fn, ...deps]: [() => unknown, ...unknown[]] = data as any;
    return { fn, deps };
  }
  throw new Error(
    "An obtainer must be either a function or "
    + "a tuple with a function in the first element"
  );
}