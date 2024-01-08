import { useChangingHandle } from "@lbfalvy/react-utils";
import React from "react";
import ReactIs from "react-is";

/** Decides whether the component can be referenced */
function isRefable(comp: React.ComponentType<unknown>): boolean {
    return typeof comp !== 'function' // If it's a class component
        // or if it's one of these builtin components, which forward
        // refs.
        || ReactIs.isForwardRef(comp)
        || ReactIs.isLazy(comp)
        || ReactIs.isMemo(comp)
}

/**
 * Add entries to a ref such that `instanceof` checks continue to work,
 * `keyof` checks work if and only if the ref has no prototype, and
 * the handle never overrides indices that the ref has already defined.
 */
function fuseHandles<
    T extends Record<string, any>,
    U extends Record<string, any>
>(ref: T | null | undefined, handle: U | undefined): T & U | undefined {
    // If the ref is not set, don't return anything
    if (handle == null || handle == undefined) return ref as T & U;
    if (ref == null || ref == undefined) {
        return handle as T & U | undefined
    }
    // If it's a plain object, make it a subtype of the handle.
    if (Object.getPrototypeOf(ref) === null) {
        return Object.setPrototypeOf(ref, handle)
    }
    // If it's a class instance, copy keys over
    const refObj = (ref as any as Record<string, unknown>);
    for (let key of Object.keys(handle)) {
        // Only copy a key if it isn't defined on the target and also
        // evaluates to undefined when queried through the prototype chain
        let isOwnProp = Object.getOwnPropertyDescriptor(ref, key) !== undefined
        let isDefined = refObj[key] !== undefined
        if (!isOwnProp && !isDefined)
            refObj[key] = handle[key]
    }
    return refObj as T & U
    // We're making the assumption that all refs that have state are
    // classes. This makes sense because the three common types of ref
    // are Node, ReactComponent and imperative handles which are meant
    // to be disposable objects that collect functions.
}

/**
 * HKT for components that take a component as their prop. It enables
 * you to expose a handle with custom functions for imperative actions.
 * Your handle's functions will be copied over to the forwarded reference.
 * 
 * Typing most components returned by this function would require HKT
 * support in Typescript, so it's usually easiest to use an `as any as T`
 * unsafe cast.
 */
export function forwardRefWithHandle<
    UpProps,
    Handle extends Record<string, any>
>(
    render: (
        props: UpProps,
        useForwardedRef: (
            comp: React.ComponentType<any>
        ) => React.Ref<any> | null,
        setHandle?: 
            | ((handle: Handle) => void)
            | undefined,
    ) => React.ReactElement | null
): React.ForwardRefExoticComponent<
    & React.PropsWithoutRef<UpProps> 
    & React.RefAttributes<Handle>
> {
    return React.forwardRef<Handle, UpProps>((props, ref) => {
        let innerRef = React.useRef<Record<string, any>>();
        let handle = React.useRef<Handle|undefined>();
        const changeRef = useChangingHandle(ref)
        const updateRef = React.useCallback(() => {
            if (!changeRef) return
            let fused = fuseHandles(innerRef.current, handle.current)
            if (fused != null && fused != undefined) changeRef(fused)
        }, [changeRef])
        // Decides whether the given component currently needs a ref
        const useForwardedRef = (comp: React.ComponentType<any>): React.Ref<any> => {
            if (!changeRef || !isRefable(comp)) return null
            return React.useCallback((inner: any) => {
                innerRef.current = inner
                updateRef()
            }, [updateRef])
        }
        // Update the public-facing patch-on functions
        // if a ref was provided at all
        const setHandle = changeRef ? (newHandle: Handle) => {
            if (handle.current === newHandle) return;
            handle.current = newHandle
            updateRef()
        } : undefined
        return render(props, useForwardedRef, setHandle)
    })
}