import React from 'react'
import { forwardRefWithHandle } from './forwardHandle'
import { getName } from './getName'
import { AwaitCore } from './AwaitCore'
import { ExtObtainer, MaybePromise, parseProps, WithPromisesAndObtainers } from './props'

export type Comp<T> =
    | React.ComponentType<T>
    | { default: React.ComponentType<T> }

export type ErrorReporter = (errors: Map<string, unknown>) => React.ReactNode;

// The props to be passed.
export type AwaitProps<T> =
    & ({
        Comp: MaybePromise<Comp<T>>
        f$Comp?: never
    } | {
        f$Comp: ExtObtainer<MaybePromise<Comp<T>>>
        Comp?: never
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
            children?: MaybePromise<T['children']>
                | {
                    with?: MaybePromise<T['children']>
                    loader?: React.ReactNode
                    error?: ErrorReporter
                }
        }
        | {
            f$children: ExtObtainer<MaybePromise<T['children']>>
            children?: T['children'] & {
                loader?: React.ReactNode
                error?: ErrorReporter
            }
        }
    ) : {
        children?: {
            loader?: React.ReactNode
            error?: ErrorReporter
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
    let error: ErrorReporter | undefined
    if ('children' in awaitable && typeof awaitable.children == 'object') {
        if ('with' in awaitable.children) {
            loader = awaitable.children.loader
            error = awaitable.children.error
            awaitable.children = awaitable.children.with
        }
    }
    // construct core on first run, update on subsequent runs
    const cRef = React.useRef<AwaitCore>();
    if (cRef.current) cRef.current.update(parseProps(awaitable));
    else cRef.current = new AwaitCore(parseProps(awaitable));
    const core = cRef.current; // this never changes
    const [status, setStatus] = React.useState(core.status());
    // subscribe to state changes once
    React.useLayoutEffect(() => {
        return core.statusChange(() => {
            // console.log("The state change got this far");
            setStatus(core.status())
        }, true)
    }, [])
    // // await all remaining props
    // const [allAvailable, status, reload] = useObtainAwait(awaitable)
    // initialise ref
    const [_, forceRerender] = React.useState({});
    const reload = React.useCallback(() => {
        core.reload();
        forceRerender({});
    }, []);
    setHandle?.({ reload });
    // remove component from props
    const { Comp, ...props } = core.props() as { Comp: any }
    // if component is a module, use its default export, else assume it
    // to be a component
    const Component =
        typeof Comp == 'object' // not a function component
        && !(Comp instanceof React.Component) // nor class component
        && 'default' in Comp // has a default member
        ? Comp.default as React.ComponentType<any>
        : Comp as React.ComponentType<any>
    // get forwarded ref
    const ref = useForwardedRef(Component)
    // default loader or error
    const ctx = React.useContext(awaitContext)

    // ######## EARLY RETURNS, NO HOOKS PAST THIS POINT ########
    if (status === "ready") {
        return <Component ref={ref} reload={reload} {...props} />
    }
    const name = getName(core.props());
    if (status == "error") {
        const errors = core.errors()!;
        if (error) return <>{error(errors)}</>
        return <ctx.error name={name} errors={errors} {...props} />
    }
    if (status == 'pending') {
        if (loader) return <>{loader}</>
        return <ctx.loader name={name} {...props} />
    }
    throw new Error("Invalid core status! (not ready/pending/error)");
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
    error: ({ name, errors }: { name: string, errors: Map<string, unknown> }) => 
    <div className='await await-failed'>
        Failed to load {name}. Errors:
        <dl>
            {[...errors].map(([key, error]) => <div key={key}>
                <dt>{key}</dt>
                <dd>{`${error}`}</dd>
            </div>)}
        </dl>
    </div>
})