import React from "react"
import divide from "./divide"

/**
 * A hook that imitates Promise.all in React.
 * @param collection Array of things to await
 * @returns Ready items and ready state
 */
export default function useAwaitAll<T>(collection: (T | Promise<T>)[]): [T[], 'ready' | 'pending' | 'failed'] {
    const [results, setResults] = React.useState<(T | undefined)[] | 'pending' | 'failed'>('pending')
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
        // Resolve only if the current 'pending' table is still up to date
        const promise = Promise.all(pending)
        let stale = false
        promise.then(result => {
            if (stale) return
            setResults(result)
            pending.forEach((p, i) => {
                if (p !== undefined) cache.current.set(p, result[i] as T)
            })
        }, () => {
            if (!stale) setResults('failed')
        })
        return () => { stale = true }
    }, [pending.length, ...pending])
    if (results instanceof Array) return [
        results.map((el, i) => (el !== undefined ? el : given[i]) as T),
        'ready'
    ]
    return [given.filter((x): x is T => x !== undefined), results]
}