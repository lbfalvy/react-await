import React from 'react'
import divide from './divide'
import useAwaitAll from './useAwaitAll'
import useCachedMap from './useCachedMap'
import useChangingHandle from './useChangingHandle'
import { unzip, zip } from './zip'

type PendingEntry<T> = [keyof T, Promise<T[keyof T]>]
type Entry<T> = [keyof T, T[keyof T]]

type SelfPromiseOrObtainer<T, Key extends keyof T> = 
    | & { [P in Key]: Promise<T[Key]> | T[Key] }
      & { [P in Key as `obtain${Capitalize<string & Key>}`]?: never } 
    | & { [P in Key as `obtain${Capitalize<string & Key>}`]: () => Promise<T[Key]> | T[Key] }
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
    & ApplyPropTransform<Omit<T, 'children' | 'reload'>>
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

// Picks out all the functions which are
function executeObtainers(entries: [string, any][]): [[string, any][], () => void] {
    const [obtained, provided] = divide<[string, () => any], [string, any]>(
        entries,
        (pair): pair is [string, () => any] =>
            pair[0].startsWith('obtain')
            && 'obtain'.length < pair[0].length
            && typeof pair[1] == 'function'
    )
    const [obtainerNames, obtainers] = unzip(obtained)
    const [results, reload] = useCachedMap(obtainers, f => f())
    const nameStart = 'obtain'.length
    const resultNames = obtainerNames.map(
        s => s[nameStart].toLowerCase()
            + s.slice(nameStart + 1))
    return [[
        ...provided,
        ...zip(resultNames, results)
    ], reload]
}

type AwaitRef<T> = { reload: () => void } | T & { reload: () => void }

/**
 * Deal with promises in React the easy way
 */
export const Await = React.forwardRef(<T, Ref>(
    props: AwaitProps<T>, ref: React.Ref<AwaitRef<Ref>>
): React.ReactElement => {
    const _props = Object.assign({}, props)
    if ('children' in _props && _props.children && 'with' in _props.children)
        _props.children = _props.children.with
    
    // Convert props to entries, skip 'of'
    const propEntries = Object.entries(_props).filter(([key]) => key != 'for')
    // Deal with obtainer functions (caches)
    const [withoutObtainers, reload] = executeObtainers(propEntries)
    // Set up refs
    const changeRef = useChangingHandle(ref)
    changeRef?.({ reload })
    // Wait for all promises (caches)
    const [results, status] = useAwaitAll(withoutObtainers.map(promiseEntryToEntryPromise))
    const finalProps = Object.fromEntries(results) as unknown as T
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
        changeRef(Object.setPrototypeOf(refobj, r as any))
    } : null} reload={reload} {...finalProps} />
}) as <T, Ref = {}>(
    props: AwaitProps<T> & { ref?: React.Ref<AwaitRef<Ref>> }
) => React.ReactElement

export const awaitContext = React.createContext({
    loader: ({ name }: { name: string }) => <div className='await await-loading'>
        Loading {name}...
    </div>,
    error: ({ name }: { name: string }) => <div className='await await-failed'>
        Failed to load {name}
    </div>
})

export { useCachedMap, useChangingHandle, useAwaitAll }