import { divide, unzip, zip } from "@lbfalvy/array-utils"
import React from "react"
import { useCachedMap } from "./useCachedMap"

export type Obtainer<T> = (() => T) | [() => T, ...any[]]

/**
 * Picks out all the obtainers and executes them unless they were also provided last round.
 */
export function executeObtainers(entries: [string, any][]): [[string, any][], () => void] {
    const [obtained, provided] = divide<[string, Obtainer<any>], [string, any]>(
        entries,
        (pair): pair is [string, Obtainer<any>] => // Obtainers are
            pair[0].startsWith('obtain') // named obtain<Prop>
            && 'obtain'.length < pair[0].length // <Prop> is not empty
            && ( // Their value is either
                typeof pair[1] == 'function' // a function
                // or an array
                || typeof pair[1] == 'object' && pair[1] instanceof Array
                // that starts with a function
                && typeof pair[1][0] == 'function'
            )
    )
    const [obtainerNames, obtainers] = unzip(obtained)
    const funcs = obtainers.map(obtainer => {
        if (typeof obtainer == 'function')
            return React.useCallback(obtainer, [obtainer])
        const [f, ...deps] = obtainer
        // The instance must change if the dep array does
        return React.useCallback(() => f(), deps)
    })
    const [results, reload] = useCachedMap(funcs, f => f())
    const nameStart = 'obtain'.length
    const resultNames = obtainerNames.map(
        s => s[nameStart].toLowerCase()
            + s.slice(nameStart + 1))
    return [[
        ...provided,
        ...zip(resultNames, results)
    ], reload]
}