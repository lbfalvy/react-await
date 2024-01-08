export type Obtainer = {
  readonly fn: Function,
  readonly deps?: readonly unknown[] | undefined,
}

export function runObtainer(
  obtainer: Obtainer | undefined,
  decl: Obtainer
): [Obtainer, unknown] | undefined {
  const { fn, deps } = decl;
  const changed = deps === undefined
    ? (obtainer?.fn !== fn || deps !== undefined)
    : (
      obtainer?.deps?.length !== deps.length
      || obtainer.deps.some((el, i) => el !== deps[i])
    );
  return changed ? [{ fn, deps }, fn()] : undefined;
}

