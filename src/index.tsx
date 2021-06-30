import React from 'react'
import divide from './divide'
import useAwaitAll from './useAwaitAll'
import useCachedMap from './useCachedMap'
import useChangingHandle from './useChangingHandle'
import { unzip, zip } from './zip'

type PendingEntry<T> = [keyof T, Promise<T[keyof T]>]
type Entry<T> = [keyof T, T[keyof T]]

type Obtainer<T> = (() => T) | [() => T, ...any[]]

type SelfPromiseOrObtainer<T, Key extends keyof T> = 
    | & { [P in Key]: Promise<T[Key]> | T[Key] }
      & { [P in Key as `obtain${Capitalize<string & Key>}`]?: never } 
    | & { [P in Key as `obtain${Capitalize<string & Key>}`]: Obtainer<Promise<T[Key]> | T[Key]> }
      & { [P in Key]?: never }
type ApplyPropTransform<T> = {
    [P in string & keyof T]: (k: SelfPromiseOrObtainer<T, P>) => void
}[string & keyof T] extends {
    [P in string & keyof T]: (k: infer I) => void
}[string & keyof T] ? I : never

// The props to be passed.
export type AwaitProps<T> =
    // The extended component, required
    & { for: React.ComponentType<T> }
    // Transform the properties except children, reload is forced optional if present
    & ApplyPropTransform<Omit<T, 'children' | 'reload'> & (
        'reload' extends keyof T ? { reload?: T['reload'] } : {}
    )>
    // Children is a special case to avoid nested XML tags, but only if it isn't obtained.
    & ('children' extends keyof T ? ({
        children:
            | T['children'] | Promise<T['children']>
            | {
                with: T['children'] | Promise<T['children']>
                loader?: React.ReactNode
                error?: React.ReactNode
            }
    } | {
        obtainChildren: () => T['children'] | Promise<T['children']>
        children?: {
            loader?: React.ReactNode
            error?: React.ReactNode
        }
    }) : {
        children?: {
            loader?: React.ReactNode
            error?: React.ReactNode
        }
    })


function promiseEntryToEntryPromise<T>(pair: PendingEntry<T> | Entry<T>): Promise<Entry<T>> | Entry<T> {
    if (pair[1] instanceof Promise) return pair[1].then(value => [pair[0], value])
    else return pair as Entry<T>
}

// Picks out all the obtainers and executes them unless they were also provided last round.
function executeObtainers(entries: [string, any][]): [[string, any][], () => void] {
    const [obtained, provided] = divide<[string, Obtainer<any>], [string, any]>(
        entries,
        (pair): pair is [string, Obtainer<any>] => // Obtainers are
            pair[0].startsWith('obtain') // named obtain<Prop>
            && 'obtain'.length < pair[0].length // The prop name is not empty
            && (
                typeof pair[1] == 'function' // Their value is either a function
                || typeof pair[1] == 'object' // or an array
                && pair[1] instanceof Array
                && typeof pair[1][0] == 'function' // with a function in the first position
            )
    )
    const [obtainerNames, obtainers] = unzip(obtained)
    const funcs = obtainers.map(obtainer => {
        if (typeof obtainer == 'function')
            return React.useCallback(obtainer, [obtainer])
        const [f, ...deps] = obtainer
        return React.useCallback(f, deps)
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

export type AwaitRef<T> = { reload: () => void } | T & { reload: () => void }

/**
 * Deal with promises in React the easy way
 */
export const Await = React.forwardRef(function Await<T, Ref>(
    props: AwaitProps<T>, ref?: React.Ref<AwaitRef<Ref> | null | undefined> | null | undefined
): React.ReactElement {
    const _props = Object.assign({}, props)
    if ('children' in _props && _props.children && 'with' in _props.children)
        _props.children = _props.children.with
    
    // Convert props to entries, skip 'of'
    const propEntries = Object.entries(_props).filter(([key]) => key != 'for') as [string, T[keyof T]][]
    // Deal with obtainer functions (caches)
    const [withoutObtainers, reload] = executeObtainers(propEntries)
    // Set up refs
    const changeRef = useChangingHandle(ref)
    changeRef?.({ reload })
    // Convert promise entries to entry promises while caching.
    const [keys, promises] = unzip(withoutObtainers)
    const [entryPromises, _] = useCachedMap( 
        promises,
        (p, i) => p instanceof Promise ? p.then(result => [keys[i], result]) : [keys[i], p]
    ) as [(Entry<T> | Promise<Entry<T>>)[], any]
    // Caching happens by position so this can fail if you manage to rename a prop while
    // passing the same value, provided that you don't change the order of assignment.
    // This is not documented because such a situation cannot really emerge if you use
    // React sensibly.
    // TODO eliminate or simplify this preprocessing step by modifying useAwaitAll
    // Await all the promises in the result (also these are cached.)
    const [results, status] = useAwaitAll(entryPromises, false)
    const finalProps = Object.fromEntries(results) as Partial<T>
    const ctx = React.useContext(awaitContext)
    if (status == 'failed') {
        if (props.children && 'error' in props.children) return <>{props.children.error}</>
        return <ctx.error name={props.for.displayName ?? props.for.name} {...finalProps} />
    }
    if (status == 'pending') {
        if (props.children && 'loader' in props.children) return <>{props.children.loader}</>
        return <ctx.loader name={props.for.displayName ?? props.for.name} {...finalProps} />
    }
    // Forward ref properly
    return <props.for ref={changeRef ? (r: Ref) => {
        const refobj: { reload: () => void } = { reload }
        // If it's a plain object, copy it.
        if (Object.getPrototypeOf(r) === null) changeRef({ ...refobj, ...r })
        // If it's a class instance, subtype it.
        else changeRef(Object.setPrototypeOf(refobj, r as any))
        // We're making the assumption that all refs that have state are classes.
        // This makes sense because the three common types of ref are Node, ReactComponent
        // and imperative handles which are meant to be disposable objects that collect functions.
    } : null} reload={reload} {...finalProps as T} />
}) as <T, Ref = {}>(
    props: AwaitProps<T> & { ref?: React.Ref<AwaitRef<Ref> | null | undefined> | null | undefined }
) => React.ReactElement

export const awaitContext = React.createContext({
    loader: ({ name }: { name: string }) => <div className='await await-loading'>
        Loading {name}...
    </div>,
    error: ({ name }: { name: string }) => <div className='await await-failed'>
        Failed to load {name}
    </div>
})

export {
    useCachedMap, useChangingHandle, useAwaitAll
}