
/**
 *  @brief Determine the name of a props.
 */

export function getName ( props : any ) : string {
    return displayNameOf(props)
        ?? forNameOf(props)
        ?? 'component'
}


function displayNameOf ( props : any ) : string | undefined {
    
    const name = props.displayName;
    
    if(typeof name == 'string')
        return name;
}

function forNameOf ( props : any ) : string | undefined {
    
    const 
        value = props.for ,
        type = typeof value ;
    
    if( type != 'function' && type != 'object' )
        return;
        
    const name = 
        value.displayName ?? 
        value.name ?? 
        value.default?.displayName ??
        value.default?.name;
              
    if(typeof name == 'string')
        return name;
}