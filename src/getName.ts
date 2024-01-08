export function getName(props: any): string {
    if ('displayName' in props && typeof props.displayName == 'string')
        return props.displayName
    if (
        typeof props.Comp == 'function'
        || typeof props.Comp == 'object'
    ) {
        const name = props.Comp.displayName
            ?? props.Comp.name
            ?? props.Comp.default?.displayName
            ?? props.Comp.default?.name
        if (typeof name == 'string') return name
    }
    return '[Component]'
}