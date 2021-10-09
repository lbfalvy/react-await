import { Thenable } from '@lbfalvy/when'
import React from 'react'
import { isForwardRef, isLazy, isMemo } from 'react-is'
import { useChangingHandle } from '@lbfalvy/react-utils'
import { Obtainer } from './executeObtainers'
import { getName } from './getName'
import { useObtainAwait, WithPromisesAndObtainers } from './useObtainAwait'

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
    & WithPromisesAndObtainers<
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

export type AwaitRef<T> =
    | { reload: () => void }
    | T & { reload: () => void }

/**
 * Deal with promises in React the easy way
 */
export const Await = React.forwardRef(function Await<T, Ref>(
    props: AwaitProps<T>,
    ref?: React.Ref<AwaitRef<Ref> | null | undefined> | null | undefined
): React.ReactElement {
    const propsCopy = {...props as any}
    if ('children' in propsCopy
        && typeof propsCopy.children == 'object'
        && 'with' in propsCopy.children)
        propsCopy.children = propsCopy.children.with
    // <--
    type WithoutChildren = Omit<T, 'reload'> & { for: Component<T> }
    const [allAvailable, status, reload] = useObtainAwait<WithoutChildren>(propsCopy)
    // Set up refs
    const changeRef = useChangingHandle(ref)
    changeRef?.({ reload })
    let { for: component, ...finalProps } = allAvailable as {
        for: Component<T>
    }
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