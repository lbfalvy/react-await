
/**
 * Sort an array's elements into two arrays by a filter
 * @param collection An array of different types
 * @param filter Type discriminator
 * @param holes preserve indices by leaving holes in the output arrays
 */
export default function divide<T, U>(
    collection: (T | U)[],
    filter: (el: T | U, idx: number, array: (T | U)[]) => el is T,
    holes?: false | undefined
): [T[], U[]];
/**
 * Sort an array's elements into two arrays by a filter
 * @param collection An array of different types
 * @param filter Type discriminator
 * @param holes preserve indices by leaving holes in the output arrays
 */
export default function divide<T, U>(
    collection: (T | U)[],
    filter: (el: T | U, idx: number, array: (T | U)[]) => el is T,
    holes: true
): [(T | undefined)[], (U | undefined)[]];
/**
 * Sort an array's elements into two arrays by a filter
 * @param collection Input array
 * @param filter 
 * @param holes preserve indices by leaving holes in the output arrays
 */
export default function divide<T>(
    collection: T[],
    filter: (el: T, idx: number, array: T[]) => boolean,
    holes?: false | undefined
): [T[], T[]];
/**
 * Sort an array's elements into two arrays by a filter
 * @param collection Input array
 * @param filter 
 * @param holes preserve indices by leaving holes in the output arrays
 */
export default function divide<T>(
    collection: T[],
    filter: (el: T, idx: number, array: T[]) => boolean,
    holes: true
): [(T | undefined)[], (T | undefined)[]];

// Implementation
export default function divide<T, U>(
    collection: (T | U)[],
    filter: (el: T | U, idx: number, array: (T | U)[]) => boolean,
    holes = false
): [(T | undefined)[], (U | undefined)[]] {
    const tv: T[] = holes ? new Array(collection.length) : []
    const uv: U[] = holes ? new Array(collection.length) : []
    collection.forEach(holes ? (e, i, a) => {
        if (filter(e, i, a)) tv[i] = e as T
        else uv[i] = e as U
    } : (e, i, a) => {
        if (filter(e, i, a)) tv.push(e as T)
        else uv.push(e as U)
    })
    return [tv, uv]
}