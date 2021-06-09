/**
 * Combines two arrays into an array of tuples containing the elements from both arrays.
 * @param a first tuple elements
 * @param b second tuple elements
 * @returns array of tuples
 */
export function zip<T, U>(a: T[], b: U[]): [T, U][] {
    return a.map((v, i) => [v, b[i]])
}

/**
 * Reverses the zip operation
 * @param zipped array of tuples
 * @returns tuple of arrays
 */
export function unzip<T, U>(zipped: [T, U][]): [T[], U[]] {
    const tv: T[] = [], uv: U[] = []
    zipped.forEach(([t, u]) => { tv.push(t); uv.push(u) })
    return [tv, uv]
}