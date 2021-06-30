import React from "react"

/**
 * Cache lookup with fallback to map from T, also update cache
 * @param input Source values
 * @param map Mapping
 * @param cache a writable array
 * @returns Mapped values
 */
function applyWithCache<T, U>(input: ReadonlyArray<T>, map: (v: T, index: number) => U, cache: [T, U][]): U[] {
    // Add to or delete from the end of cache so it's exactly input.length long
    const length = cache.length
    const goal = input.length
    const start = Math.min(length, goal)
    const deleted = Math.min(0, length - goal)
    const added = Math.min(0, goal - length)
    cache.splice(start, deleted, ...new Array(added))
    // Perform the lookup/mapping
    return input.map((t, i) => {
        let value: U
        if (cache[i] && cache[i][0] === t) value = cache[i][1]
        else value = map(t, i)
        cache[i] = [t, value]
        return value
    })
}

/**
 * React hook that imitates Array.map, it also caches the output so you
 * don't have to ensure referential equality. 
 * @param input Data
 * @param map Transformations
 * @returns Results and reload function
 */
export default function useCachedMap<T, U>(input: T[], map: (v: T, index: number) => U): [U[], () => void] {
    const cache = React.useRef<[T, U][]>([])
    // Ensure referential equality of the input array
    input = React.useMemo(() => input, [input.length, ...input])
    // Produce the results, optionally clear cache
    const generate = React.useCallback((clear: boolean = false) => (
        applyWithCache(input, map, clear ? cache.current = [] : cache.current)
    ), [input])
    // Generate the result for the first time
    const [result, setResult] = React.useState<U[]>(generate())
    // Generate the result every time the input changes
    React.useLayoutEffect(() => setResult(generate()), [generate])
    return [
        result, 
        // Return a reload handle to generate the result without cache
        React.useCallback(
            () => setResult(generate(true)),
            [generate]
        )
    ]
}