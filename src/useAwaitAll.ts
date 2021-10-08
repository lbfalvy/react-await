import * as xpromise from "@lbfalvy/when"
import React from "react"

/**
 * A hook that imitates Promise.all in React.
 * @param collection Array of things to await
 * @returns Ready items and ready state
 */
export function useAwaitAll<T>(
    collection: (T | xpromise.Thenable<T>)[],
    keepLast = true
): [T[], 'ready' | 'pending' | 'failed'] {
    type Results = T[] | 'pending' | 'failed'
    const [results, setResults] = React.useState<Results>('pending')
    const cache = React.useRef(new WeakMap<xpromise.Thenable<T>, T>())
    const newCache = new WeakMap()
    // Resolve unchanged promises from cache, also establish the new cache
    collection = collection.map(el => {
        if (el instanceof Promise && cache.current.has(el)) {
            const res = cache.current.get(el) as T
            newCache.set(el, res)
            return res
        } else return el
    })
    cache.current = newCache
    const promise = React.useMemo(
        () => xpromise.all(collection), 
        [collection.length, ...collection]
    )
    promise.catch(() => {})
    // Check if there are no promises
    const allGiven = !collection.some(e => e instanceof Promise)
    React.useEffect(() => {
        if (!allGiven && !keepLast) setResults('pending')
        promise.then(result => {
            // Include given
            setResults(result)
            collection.forEach((p, i) => {
                if (p instanceof Promise) cache.current.set(p, result[i])
            })
        }, e => setResults('failed'), 'sync')
        return () => { promise.cancel() }
    }, [promise, collection.length, ...collection])
    // If there were no promises, return the input.
    if (allGiven) return [collection as T[], 'ready']
    // If there were promises and we have results, return them
    if (results instanceof Array) return [results, 'ready']
    // Otherwise return what we have and the status
    return [collection.filter((x): x is T => !(x instanceof Promise)), results]
}