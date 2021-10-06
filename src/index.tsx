import { Thenable, when } from '@lbfalvy/when'
import React from 'react'
import { isForwardRef, isLazy, isMemo } from 'react-is'
import divide from './divide'
import useAwaitAll from './useAwaitAll'
import useCachedMap from './useCachedMap'
import useChangingHandle from './useChangingHandle'
import { unzip, zip } from './zip'

type Obtainer<T> = (() => T) | [() => T, ...any[]]

type SelfPromiseOrObtainer<T, Key extends keyof T> = 
    | & { [P in Key]: Thenable<T[Key]> | T[Key] }
      & { [P in Key as `obtain${Capitalize<string & Key>}`]?: never } 
    | & { [P in Key as `obtain${Capitalize<string & Key>}`]: Obtainer<Thenable<T[Key]> | T[Key]> }
      & { [P in Key]?: never }
type ApplyPropTransform<T> = { // Contravariance hack
    [P in string & keyof T]: (k: SelfPromiseOrObtainer<T, P>) => void
}[string & keyof T] extends {
    [P in string & keyof T]: (k: infer I) => void
}[string & keyof T] ? I : never

type Component<T> =
    | React.ComponentType<T>
    | { default: React.ComponentType<T> }

// The props to be passed.
export type AwaitProps<T> =
    & ({
        for: Component<T> | Thenable<Component<T>>
    } | {
        obtainFor: Obtainer<Component<T> | Thenable<Component<T>>>
    })
    // Transform the props except children
    // reload is forced optional if present
    & ApplyPropTransform<
        & Omit<T, 'children' | 'reload'>
        & ('reload' extends keyof T ? { reload?: T['reload'] } : {})
    >
    // Children is a special case to avoid nested XML tags if it isn't obtained.
    & ('children' extends keyof T ? (
        | {
            children?:
                | T['children']
                | Thenable<T['children']>
                | {
                    with?: T['children'] | Thenable<T['children']>
                    loader?: React.ReactNode
                    error?: React.ReactNode
                }
        }
        | {
            obtainChildren: Obtainer<
                | T['children']
                | Thenable<T['children']>
            >
            children?: T['children'] & {
                loader?: React.ReactNode
                error?: React.ReactNode
            }
        }
    ) : {
        children?: {
            loader?: React.ReactNode
            error?: React.ReactNode
        }
    })

// Picks out all the obtainers and executes them unless they were also provided last round.
function executeObtainers(entries: [string, any][]): [[string, any][], () => void] {
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

export type AwaitRef<T> =
    | { reload: () => void }
    | T & { reload: () => void }

function getName(props: any): string {
    if ('displayName' in props && typeof props.displayName == 'string')
        return props.displayName
    if (
        typeof props.for == 'function'
        || typeof props.for == 'object'
    ) {
        const name = props.for.displayName ?? props.for.name
            ?? props.for.default?.displayName ?? props.for.default?.name
        if (typeof name == 'string') return name
    }
    return 'component'
}

/**
 * Deal with promises in React the easy way
 */
export const Await = React.forwardRef(function Await<T, Ref>(
    props: AwaitProps<T>,
    ref?: React.Ref<AwaitRef<Ref> | null | undefined> | null | undefined
): React.ReactElement {
    const propsCopy = {...props as object} as AwaitProps<T>
    if ('children' in propsCopy
        && typeof propsCopy.children == 'object'
        && 'with' in propsCopy.children)
        propsCopy.children = propsCopy.children.with
    
    // Convert props to entries, skip 'of'
    const propEntries = Object.entries(propsCopy) as [string, any][]
    // Deal with obtainer functions (caches)
    const [withoutObtainers, reload] = executeObtainers(propEntries)
    // Set up refs
    const changeRef = useChangingHandle(ref)
    changeRef?.({ reload })
    // Convert promise entries to entry promises while caching.
    const [keys, promises] = unzip(withoutObtainers)
    const [entryPromises, _] = useCachedMap( 
        promises,
        (p, i) => p instanceof Promise
            ? when.all([keys[i], p])
            : [keys[i], p]
    ) as [([string, any] | Thenable<[string, any]>)[], any]
    // Caching happens by position so this can fail if you manage to
    // rename a prop while passing the same value, provided that you don't
    // change the order of assignment. This is not documented because such
    // a situation cannot really emerge if you use React sensibly.
    //
    // TODO eliminate or simplify this preprocessing step by modifying
    // useAwaitAll Await all the promises in the result
    // (also these are cached.)
    const [results, status] = useAwaitAll(entryPromises, true)
    const allAvailable = Object.fromEntries(results) as any
    let { for: component, ...finalProps } = allAvailable as {
        for: Component<T>
    }
    try {
    const Component: React.ComponentType<T> | undefined =
        typeof component == 'object' // not a function component
        && !(component instanceof React.Component) // nor class component
        && 'default' in component // has a default member
        ? component.default
        : component as React.ComponentType<T>
    const ctx = React.useContext(awaitContext)
    if (status == 'failed') {
        if (props.children && 'error' in props.children)
            return <>{props.children.error}</>
        return <ctx.error name={getName(allAvailable)} {...finalProps} />
    }
    if (status == 'pending') {
        if (props.children && 'loader' in props.children)
            return <>{props.children.loader}</>
        return <ctx.loader name={getName(allAvailable)} {...finalProps} />
    }
    // Forward ref properly
    const shouldForwardRef =
        typeof Component !== 'function' // If it's a class component
            // or if it's one of these builtin components, which forward
            // refs.
            || isForwardRef(Component)
            || isLazy(Component)
            || isMemo(Component)
    return <Component ref={changeRef && shouldForwardRef ? (r: Ref) => {
        const refobj: { reload: () => void } = { reload }
        // If it's a plain object, copy it.
        if (Object.getPrototypeOf(r) === null)
            changeRef({ ...refobj, ...r })
        // If it's a class instance, subtype it.
        else changeRef(Object.setPrototypeOf(refobj, r as any))
        // We're making the assumption that all refs that have state are
        // classes. This makes sense because the three common types of ref
        // are Node, ReactComponent and imperative handles which are meant
        // to be disposable objects that collect functions.
    } : null} reload={reload} {...finalProps as T} />
    } catch(ex) {
        console.log(props, allAvailable)
        throw ex
    }
}) as any as <T, Ref = {}>(
    props: AwaitProps<T> & {
        ref?: React.Ref<
            AwaitRef<Ref> | null | undefined
        > | null | undefined
    }
) => React.ReactElement

export const awaitContext = React.createContext({
    loader: ({ name }: { name: string }) => 
    <div className='await await-loading'>
        Loading {name}...
    </div>,
    error: ({ name }: { name: string }) =>
    <div className='await await-failed'>
        Failed to load {name}
    </div>
})

export {
    useCachedMap, useChangingHandle, useAwaitAll
}