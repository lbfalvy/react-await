import React from "react"
import divide from "./divide"

/**
 * A hook that imitates Promise.all in React.
 * @param collection Array of things to await
 * @returns Ready items and ready state
 */
export default function useAwaitAll<T>(collection: (T | Promise<T>)[], keepLast = true): [T[], 'ready' | 'pending' | 'failed'] {
    const [results, setResults] = React.useState<T[] | 'pending' | 'failed'>('pending')
    const cache = React.useRef<Map<Promise<T>, T>>(new Map())
    const newCache = new Map()
    // Resolve unchanged promises from cache, also establish the new cache
    collection = collection.map(el => {
        if (el instanceof Promise && cache.current.has(el)) {
            const res = cache.current.get(el) as T
            newCache.set(el, res)
            return res
        } else return el
    })
    cache.current = newCache
    // Separate promises and reals
    const [pending, given] = divide<Promise<T>, T>(collection,
        (e): e is Promise<T> => e instanceof Promise,
        true)
    React.useEffect(() => {
        if (pending.length && !keepLast) setResults('pending')
        // Promise is discarded on change
        const promise = Promise.all(pending)
        let stale = false
        promise.then(result => {
            if (stale) return
            // Include given
            setResults(result.map((el, i) => (el !== undefined ? el : given[i]) as T))
            pending.forEach((p, i) => {
                if (p !== undefined) cache.current.set(p, result[i] as T)
            })
        }, () => {
            if (!stale) setResults('failed')
        })
        return () => { stale = true }
    }, [collection.length, ...collection])
    // If pending is empty, return given
    if (pending.every(v => v === undefined)) return [given as T[], 'ready']
    // If pending is not empty and we have results, return them
    if (results instanceof Array) return [results, 'ready']
    // Otherwise return what we have and the status
    return [given.filter((x): x is T => x !== undefined), results]
}