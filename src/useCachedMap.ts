import React from "react"

/**
 * React hook that imitates Array.map, it also caches the output so you
 * don't have to ensure referential equality. 
 * @param input Data
 * @param map Transformations
 * @returns Results and reload function
 */
export default function useCachedMap<T, U>(input: T[], map: (v: T, index: number) => U): [U[], () => void] {
    const cache = React.useRef<[T, U][]>([])
    const [_, flush] = React.useReducer(old => {
        // Flush the cache if it's not empty
        if (cache.current.length == 0) return old
        cache.current = []
        return {} // We return a new object to trigger a rerender
    }, {})
    const freshMap = new Array(input.length)
    // Cache lookup with fallback to map from t, also build new cache
    const out = input.map((t, i) => {
        let value: U
        if (cache.current[i]?.[0] === t)
            value = cache.current[i][1]
        else value = map(t, i)
        freshMap[i] = [t, value]
        return value
    })
    cache.current = freshMap // save new cache
    return [out, flush]
}