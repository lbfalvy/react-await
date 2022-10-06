
import { divide, unzip, zip } from '@lbfalvy/array-utils'
import { useCachedMap } from './useCachedMap'
import React from 'react'


export type Obtainer <T> = 
    ( () => T ) | 
    [ () => T , ... any [] ]

type ObtainerPair = [ string , Obtainer<any> ]
type AnyPair = [ string , any ]


const { length : nameStart } = 'obtain';


/**
 *  @brief Picks out all the obtainers and executes 
 *  them unless they were also provided last round.
 */

export function executeObtainers (
    entries : AnyPair []
) : [ AnyPair [] , () => void ] {
    
    const [ obtained , provided ] = 
        divide<ObtainerPair,AnyPair>(entries,isObtainerPair);
    
    const [ names , obtainers ] = 
        unzip(obtained);
    
    const functions = obtainers
        .map(updateObtainer);
    
    const [ results , reload ] = 
        useCachedMap(functions,f => f());
    
    const resultNames = names
        .map(formatName);
            
    const zipped = [
        ... provided ,
        ... zip(resultNames,results)
    ]
            
    return [ zipped , reload ]
}


function updateObtainer ( obtainer : Obtainer ) : Function<any> {
    
    if(typeof obtainer == 'function')
        return React.useCallback(obtainer,[ obtainer ])
    
    const [ f , ... dependencies ] = obtainer;
    
    // The instance must change if the dependency array does
    
    return React.useCallback(() => f(),dependencies)
}


function formatName ( name : string ) : string {
    return name[nameStart].toLowerCase() 
         + name.slice(nameStart + 1)
}


function isObtainerPair ( pair ) : pair is ObtainerPair {
    
    const [ name , value ] = pair;
    
    // Named obtain<Prop>
    
    if(! name.startsWith('obtain') )
        return false;
    
    // <Prop> is not empty
    
    if(name === 'obtain')
        return false;
        
    // Their value is either
    
    if(typeof value == 'function')
        return true;
        
    if(
        Array.isArray(value) &&
        typeof value[0] == 'function'
    ) return true;
    
    return false;
}