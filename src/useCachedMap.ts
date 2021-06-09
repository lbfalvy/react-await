import React from "react"

/**
 * React hook that imitates Array.map, it also caches the output so you
 * don't have to ensure referential equality. 
 * @param input Data
 * @param map Transformations
 * @returns Results and reload function
 */
export default function useCachedMap<T, U>(input: T[], map: (v: T) => U): [U[], () => void] {
    const cache = React.useRef<Map<T, U>>(new Map())
    // Flush the cache if it's not empty
    const [_, flush] = React.useReducer(old => {
        if (cache.current.size == 0) return old
        cache.current = new Map()
        return {} // We return a new object to trigger a rerender
    }, {})
    const freshMap = new Map<T, U>()
    // Cache lookup with fallback to map from i, also build new cache
    const out = input.map(i => {
        let value: U
        if (cache.current.has(i))
            value = cache.current.get(i) as U
        else value = map(i)
        freshMap.set(i, value)
        return value
    })
    cache.current = freshMap // save new cache
    return [out, flush]
}