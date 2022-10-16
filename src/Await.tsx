import { Thenable } from '@lbfalvy/when'
import React from 'react'
import { Obtainer } from './executeObtainers'
import { forwardRefWithHandle } from './forwardHandle'
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
export const Await = forwardRefWithHandle(function Await(
    originalProps: AwaitProps<any>, useForwardedRef, setHandle
) {
    // extract explicit loader and error from children if present
    const awaitable = {...originalProps as any}
    let loader: React.ReactNode | undefined
    let error: React.ReactNode | undefined
    if ('children' in awaitable
        && typeof awaitable.children == 'object'
        && 'with' in awaitable.children) {
        loader = awaitable.children.loader
        error = awaitable.children.error
        awaitable.children = awaitable.children.with
    }
    // await all remaining props
    const [allAvailable, status, reload] = useObtainAwait(awaitable)
    // initialise ref
    setHandle?.({ reload })
    // remove component from props
    let { for: component, ...finalProps } = allAvailable as { for: any }
    // if component is a module, use its default export, else assume it
    // to be a component
    const Component =
        typeof component == 'object' // not a function component
        && !(component instanceof React.Component) // nor class component
        && 'default' in component // has a default member
        ? component.default as React.ComponentType<any>
        : component as React.ComponentType<any>
    // get forwarded ref
    const ref = useForwardedRef(Component)
    // render loader or error
    const ctx = React.useContext(awaitContext)
    // ######## EARLY RETURNS ########
    if (status == 'failed') {
        if (error) return <>{error}</>
        return <ctx.error name={getName(allAvailable)} {...finalProps} />
    }
    if (status == 'pending') {
        if (loader) return <>{loader}</>
        return <ctx.loader name={getName(allAvailable)} {...finalProps} />
    }
    return <Component ref={ref} reload={reload} {...finalProps} />
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