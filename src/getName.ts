export function getName(props: any): string {
    if ('displayName' in props && typeof props.displayName == 'string')
        return props.displayName
    if (
        typeof props.for == 'function'
        || typeof props.for == 'object'
    ) {
        const name = props.for.displayName
            ?? props.for.name
            ?? props.for.default?.displayName
            ?? props.for.default?.name
        if (typeof name == 'string') return name
    }
    return '[Component]'
}