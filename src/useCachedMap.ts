import { applyWithCache } from "@lbfalvy/array-utils"
import { Apply } from "@lbfalvy/array-utils/build/types/applyWithCache"
import React from "react"

/**
 * React hook that imitates Array.map, it also caches the output so you
 * don't have to ensure referential equality. 
 * @param input Data
 * @param map Transformations
 * @returns Results and reload function
 */
export function useCachedMap<T, U>(input: T[], map: (v: T, index: number) => U): [U[], () => void] {
    const cache = React.useRef<Apply<T, U>>(applyWithCache(map))
    // Ensure referential equality of the input array
    input = React.useMemo(() => input, [input.length, ...input])
    // Produce the results, optionally clear cache
    const generate = React.useCallback((clear: boolean = false) => {
        const apply = clear ? cache.current = applyWithCache(map) : cache.current
        return apply(input)
    }, [input])
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