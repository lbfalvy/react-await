import { unzip } from "@lbfalvy/array-utils"
import { all, Thenable } from "@lbfalvy/when"
import { useAwaitAll } from "./useAwaitAll"
import { useCachedMap } from "./useCachedMap"
import { executeObtainers, Obtainer } from "./executeObtainers"

type SelfPromiseOrObtainer<T, Key extends keyof T> = 
    | & { [P in Key]: Thenable<T[Key]> | T[Key] }
      & { [P in Key as `obtain${Capitalize<string & Key>}`]?: never } 
    | & { [P in Key as `obtain${Capitalize<string & Key>}`]: Obtainer<Thenable<T[Key]> | T[Key]> }
      & { [P in Key]?: never }
export type WithPromisesAndObtainers<T> = { // Contravariance hack
    [P in string & keyof T]: (k: SelfPromiseOrObtainer<T, P>) => void
}[string & keyof T] extends {
    [P in string & keyof T]: (k: infer I) => void
}[string & keyof T] ? I : never

/**
 * This hook implements the main logic of the component
 * 
 * 1. Replace obtainers with their (cached) return value in the props
 * 2. Await promises in the result (with cache in case you somehow ensure
 *    the referential equality of the promise)
 * 3. Constantly report all collected values as well as the overall status
 */
export function useObtainAwait<T extends {}>(
    data: WithPromisesAndObtainers<T> & {}
): [T, 'pending'|'ready'|'failed', () => void] {
    // Convert props to entries
    const propEntries = Object.entries(data) as [string, any][]
    // Deal with obtainer functions (caches)
    const [withoutObtainers, reload] = executeObtainers(propEntries)
    // Convert promise entries to entry promises while caching.
    const [keys, promises] = unzip(withoutObtainers)
    const [entryPromises, _] = useCachedMap( 
        promises,
        (p, i) => p instanceof Promise
            ? all([keys[i], p] as [string, any])
            : [keys[i], p] as [string, any]
    )
    // Caching happens by position so this can fail if you manage to
    // rename a prop while passing the same value, provided that you don't
    // change the order of assignment. This is not documented because such
    // a situation cannot really emerge if you use React sensibly.
    //
    // TODO eliminate or simplify this preprocessing step by modifying
    // useAwaitAll Await all the promises in the result
    // (also these are cached.)
    const [results, status] = useAwaitAll(entryPromises, true)
    const allAvailable = Object.fromEntries(results) as any
    return [allAvailable, status, reload]
}