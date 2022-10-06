
import * as xpromise from '@lbfalvy/when'
import React from 'react'


type PromiseState = 'ready' | 'pending' | 'failed';


/**
 * A hook that imitates Promise.all in React.
 * @param collection Array of things to await
 * @returns Ready items and ready state
 */

export function useAwaitAll <T> (
    collection : ( T | xpromise.Thenable<T> )[],
    keepLast = true
) : [ T [] , PromiseState ]{
    
    type Results = T [] | 'pending' | 'failed';
    
    const [ results , setResults ] = 
        React.useState<Results>('pending');
    
    const cache = React.useRef(new WeakMap<xpromise.Thenable<T>,T>());
    
    const newCache = new WeakMap;
    
    // Resolve unchanged promises from cache, also establish the new cache
    
    collection = collection.map(( value ) => {

        if(isPromise(value) && cache.current.has(value)){
            const result = cache.current.get(value) as T;
            newCache.set(value,result);
            return result
        }
        
        return value
    })
    
    cache.current = newCache;
    
    const promise = React.useMemo(
        () => xpromise.all(collection), 
        [ collection.length , ... collection ])
    
    promise.catch(() => {})
    
    // Check if there are no promises
    
    const allGiven = ! collection
        .some(isPromise);
    
    React.useEffect(() => {
        
        if(!allGiven && !keepLast)
            setResults('pending');
        
        promise.then(result => {
            
            // Include given
            
            setResults(result);
            
            collection.forEach(( value , index ) => {
                if(isPromise(value))
                    cache.current.set(value,result[index])
            })
            
        },() => setResults('failed'),'sync')
        
        return () => { promise.cancel() }
    
    },[ promise , collection.length , ... collection ])
    
    
    // If there were no promises, return the input.
    
    if(allGiven)
        return [ collection as T [] , 'ready' ]
    
    
    // If there were promises and we have results, return them
    
    if(results instanceof Array)
        return [ results , 'ready' ]
    
    
    // Otherwise return what we have and the status
    
    const resolved = collection
        .filter((x) : x is T => ! isPromise(x));
    
    return [ resolved , results ]
}


function isPromise ( value : any ) : bool {
    return value instanceof Promise;
}