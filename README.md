# React-await 

the sensible solution to asynchronity in JSX

## What it does

React-await allows you to handle promises and data loading with as little
hassle as possible.

## How to use it

Pass it whatevver component you want to see once the data is ready in the `for`
prop. Add any other props directly to the component. For the props, the
following types are accepted:

- The value itself under its own name
- A promise under the value's name
- A function that returns either the value or a promise to it, under the name
  `obtainProp`. Note that the name is turned to uppercase, and the function
  will be re-run whenever it changes
- An array containing a function on the 0th position followed by its
  dependencies, under the name `obtainProp`.

WARNING: these are directly mapped to useCallback, so never under any
circumstances switch a prop between obtainer form and other forms between
renders. Doing so violates the rules of hooks and leads to a crash or much
worse.

## Additional features

If you want to re-fetch your data, you can either call the `reload` function
prop within the rendered component or the reload() function on the ref from
the parent component. This function never overrides any existing props or
ref properties. Refs are forwarded in such a way that `instanceof` checks
continue to work and `hasOwnProperty` or `in` works if and only if the ref
object has no prototype. If the wrapped component is a function component and
you are using the ref to reload the data you will see errors. This is because
there is no way for us to tell whether the wrapped component accepts a ref,
so we pass a callback whenever the HOC ref is used. The component should still
work as expected.

Note that both obtainer functions and the returned promises are individually
cached. If you find that the component reloads your data when it shouldn't,
you can use useCallback to show that you did not intend to change the prop.