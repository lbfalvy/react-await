# React-await 

the sensible solution to asynchronity in JSX

## What it does

React-await allows you to handle promises and data loading with as little
hassle as possible.

## How to use it

Pass it whatevver component you want to see once the data is ready in the `for`
prop. Add any other props directly to the component. If the data is in a
promise, add the promise. If your data is available as the return value of a
(synchronous or asynchronous) function, `foo={1}` becomes
`obtainFoo={async () => 1}`.

## Additional features

If you want to re-fetch your data, you can either call the `reload` function
prop (which does not override any manually passed props of the same name) or
the reload() function on the ref (which does override any properties of the
same name on the forwarded ref, because we're forwarding the ref through
prototypal inheritance).

Note that both obtainer functions and the returned promises are individually
cached. If you find that the component reloads your data when it shouldn't,
you can use useCallback to show that you did not intend to change the prop.

## Future plans

Obtainers could optionally support a dependency array, but this would require
a custom made useCallback because of the fixed hook count rule.

The types need a little bit of polishing, eg. a required reload() prop from the
child should become optional rather than deleted.

The type of refs should be intelligently detected, DOM nodes should continue to
use the current strategy but imperative handles should be copied to a new
object. This would allow us to not override a possible existing reload() while
also keeping hasOwnProperty to function as expected.