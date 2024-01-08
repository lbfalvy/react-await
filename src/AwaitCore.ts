import { Obtainer, runObtainer } from "./obtainer";
import { SettledStatus, promiseStatus, then } from "./promise_catalog";
import * as promiseCatalog from "./promise_catalog";
import { Emit, Subscribe, event } from "@lbfalvy/mini-events";

export type PropDecl = {
  readonly obtainer?: Obtainer | undefined,
  readonly value?: unknown
};

export type AwaitStatus = "ready" | "pending" | "error";

export type StatusChange =
  | ["ready", Record<string, unknown>]
  | ["errors", Map<string, unknown>]

export class AwaitCore {
  private obtainers: Map<string, Obtainer> = new Map();
  private pendingCache: Map<string, Promise<unknown>> = new Map();
  private promiseCache: Map<Promise<unknown>, Set<string>> = new Map();
  private propsCache: Record<string, unknown> = {};
  private errorCache: Map<string, unknown> = new Map();
  private keys: Set<string> = new Set();
  public statusChange: Subscribe<[StatusChange]>;
  private emitStatusChange: Emit<[StatusChange]>;

  public constructor(
    props: Iterable<[string, PropDecl]>,
  ) {
    [this.emitStatusChange, this.statusChange] = event();
    for (const [key, prop] of props) {
      this.keys.add(key);
      if (prop.obtainer !== undefined) {
        const [obtainer, value] = runObtainer(undefined, prop.obtainer)!;
        this.obtainers.set(key, obtainer);
        this.handleMaybePromise(key, value);
      } else this.handleMaybePromise(key, prop.value);
    }
  }

  public update(props: Iterable<[string, PropDecl]>) {
    const old_keys = this.keys;
    this.keys = new Set();
    for (const [key, { obtainer, value }] of props) {
      this.keys.add(key);
      if (obtainer !== undefined) {
        const prev = this.obtainers.get(key);
        this.handleObtainer(key, prev, obtainer);
      } else {
        this.obtainers.delete(key);
        this.handleMaybePromise(key, value);
      }
    }
    for (const key of old_keys) {
      if (!this.keys.has(key)) {
        this.errorCache.delete(key);
        this.obtainers.delete(key);
        this.unsetPromise(key);
        delete this.propsCache[key];
      }
    }
  }

  public status(): AwaitStatus {
    if (0 < this.errorCache.size) return "error";
    if (0 < this.promiseCache.size) return "pending";
    return "ready";
  }

  public errors(): Map<string, unknown> | undefined {
    if (this.status() !== "error") return undefined;
    return new Map(this.errorCache);
  }

  public props(): Record<string, unknown> {
    return Object.assign({}, this.propsCache);
  }

  public reload() {
    for (const [key, obtainer] of this.obtainers) {
      this.handleObtainer(key, undefined, obtainer);
    }
  }

  private handleObtainer(key: string, prev: Obtainer|undefined, next: Obtainer) {
    const result = runObtainer(prev, next);
    if (result === undefined && prev === undefined) {
      throw new Error(
        "runObtainer returned undefined despite "
        + "previous obtainer being undefined"
      );
    }
    if (result === undefined) return;
    const [obtainer, value] = result;
    this.obtainers.set(key, obtainer);
    this.handleMaybePromise(key, value);
  }

  private handleMaybePromise(key: string, value: unknown) {
    if (value instanceof Promise) return this.handlePromise(key, value);
    this.unsetPromise(key);
    this.propsCache[key] = value;
  }

  private handlePromise(key: string, promise: Promise<unknown>) {
    const prevPromise = this.pendingCache.get(key);
    if (prevPromise === promise) return;
    const status = promiseStatus(promise);
    this.setPromise(key, promise);
    if (status == "pending") {
      then(promise, status => {
        this.onPromiseSettle(promise, status, this.emitStatusChange)
      })
    } else this.onPromiseSettle(promise, status, _ => { });
  }

  /// Returns true if there were previously no errors
  private handleError = (key: string, error: unknown) => {
    this.unsetPromise(key);
    this.errorCache.set(key, error);
  }

  /// Returns true if an error status has just been cleared
  private handleSuccess = (key: string, result: unknown) => {
    this.unsetPromise(key);
    this.errorCache.delete(key);
    this.propsCache[key] = result;
  }

  private setPromise(key: string, promise: Promise<unknown>) {
    this.unsetPromise(key);
    this.pendingCache.set(key, promise);
    const set = this.promiseCache.get(promise);
    if (set !== undefined) set.add(key);
    else this.promiseCache.set(promise, new Set([key]));
  }

  private unsetPromise(key: string): boolean {
    const pending = this.pendingCache.get(key);
    if (pending === undefined) return false;
    const aliases = this.promiseCache.get(pending)!;
    if (aliases?.size <= 1) this.promiseCache.delete(pending);
    else aliases.delete(key);
    this.pendingCache.delete(key);
    return true;
  }

  private onPromiseSettle(
    promise: Promise<unknown>,
    status: SettledStatus,
    onStatusChange: (status: StatusChange) => void
  ) {
    const [variant, payload] = status;
    const updated_keys = this.promiseCache.get(promise);
    if (updated_keys === undefined) return;
    if (updated_keys.size === 0)
      throw new Error("Empty promiseCache entry should have been removed");
    const prev_status = this.status();
    const handle_inst = {
      fail: this.handleError,
      succ: this.handleSuccess
    }[variant];
    for (const key of updated_keys) handle_inst(key, payload);
    if (this.status() !== prev_status) {
      if (this.status() === "ready")
        onStatusChange(["ready", this.props()!])
      else if (this.status() === "error")
        onStatusChange(["errors", this.errors()!]);
    }
  }

  public debugPrint(): string {
    return `AwaitCore{
      pendingCache: ${[...this.pendingCache].map(([k, pr]) =>
      `${k} => ${promiseCatalog.debugPrint(pr)}`
    )}
      promiseCache: ${[...this.promiseCache].map(([pr, kv]) =>
      `${promiseCatalog.debugPrint(pr)} => ${[...kv]}`
    )}
    }`;
  }
}
