# React-await 

the sensible solution to asynchronity in JSX

## What it does

React-await allows you to handle promises and data loading with as little
hassle as possible.

## Why not Suspense?

Suspense is good in the narrow set of cases where it's usable, but it
requires special effort from the library creator and dictates a particular
data fetching strategy. This component is far more general than that. I've
successfully used it to wait for HTTP requests, particular websocket
messages, WebRTC connections and user decisions, but it's usable for
code-splitting and pretty much any use case when you want to render
something from promises or obtainers. You can specify the target component
inline, but to avoid nesting XML tags it's probably better to extract it. 

## How to use it

Pass it whatevver component you want to render once the data is ready in
the `for` prop. Add any other props directly to the component.
For a parameter called `foo`, the following variants are accepted:

- The value itself under its own name
- A promise under the value's name
- A function that returns either the value or a promise to it, under the
  name `obtainFoo`. Note that the name is turned to uppercase, and the
  function will be re-run whenever it changes
- An array containing a function on the 0th position followed by its
  dependencies, under the name `obtainFoo`.

The above rules can also be applied to the `for` prop. In addition, if
`for` turns out to be an object with the property `default`, that property
is used instead. This serves to make code-splitting with ES modules
easier.

WARNING: these are directly mapped to useCallback, so never under any
circumstances switch a prop between obtainer form and other forms between
renders, as doing so violates the rules of hooks.

## Custom loader and error, object children

You can specify a custom loader and error by passing an object to
children and using the properties `loader` and `error` which both take
`ReactNode`s. If you also want to pass children to the wrapped component,
you can use `children.with`. If you set `children` to an object that
doesn't have the property `with`, the wrapped component will receive the
whole object. You can cover every corner case by passing exactly what you
want relayed to `with`, but most of the time the default should just work.

## Examples

```tsx
<Await for={MyComponent} one={1} obtainTwo={[() => api.getTwo(), api]} three={globalFuncGet3} />
<Await obtainFor={[() => import('./MyComponent.mjs')]} />
<Await obtainFor={[() => customFetchComponent('MyComponent')]} />
<Await for={MyComponent}>some children</Await>
<Await for={MyComponent}>{{
  with: <>some children</>
  loader: <>Loading some parent...</>
  error: <FancyErrorMessage />
}}</Await>
<Await for={Chat} obtainChildren={[() => fetchChildren()]}>{{
  loader: <Spinner />
  error: <Popup text='Failed to load messages' />
}}</Await>
```

## Additional features

If you want to re-fetch your data, you can either call the `reload` function
prop within the rendered component or the reload() function on the ref from
the parent component. This function never overrides any existing props or
ref properties. Refs are forwarded in such a way that `instanceof` checks
continue to work and `hasOwnProperty` or `in` works if and only if the ref
object has no prototype.