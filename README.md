# React-await 

Flexible streamlined data and code fetching in React

## What it does

React-await allows you to resolve promises and load data as needed before rendering a component.

## Why not Suspense?

Suspense is good in the narrow set of cases where it's usable, but it requires special effort from the library creator and dictates a particular data fetching strategy. This component is far more general than that. I've successfully used it to wait for HTTP requests, particular websocket messages, WebRTC connections and user decisions, but it's usable for code-splitting and pretty much any use case when you want to render something from promises or obtainers.

Additionally, Await also solves the waterfall issue with SSR simply by motivating you to fetch data and components together. While this approach is slower than Suspense with Relay, it's a lot more modular and flexible.

## How to use it

Pass it whatevver component you want to render once the data is ready in the `Comp` prop. Add any other props directly to the component. If Comp takes a parameter called `foo`, the following variants are accepted:

- The value itself under its own name
- A promise under the value's name
- A function that returns either the value or a promise to it, under the name `f$foo`. The function will be re-run whenever it changes.
- An array containing a function on the first position followed by its   dependencies, under the name `f$foo`. The function will be re-run whenever the parameter list changes.

The above rules can also be applied to the `Comp` prop. In addition, if `Comp` turns out to be an object with the property `default`, that property is used instead. This serves to make code-splitting with ES modules easier.

All of these comparisons and checks, including the dependency list, are implemented independently of React's builtins, so React constraints don't apply. You may provide a prop in different formats at different renders or change the length of the dependency list.

## Custom loader and error, object children

You can specify a custom loader and error by passing an object to children and using the properties `loader` and `error`. If you also want to pass children to the wrapped component, you can use `children.with`. If you set `children` to an object that doesn't have the property `with`, the wrapped component will receive the whole object. You can cover every edge case by setting `with` to exactly what you want the component to receive, but most of the time the default should just work.

## Examples

```tsx
<Await Comp={MyComponent} one={1} f$two={[() => api.getTwo(), api]} f$three={globalFuncGet3} />
<Await f$Comp={[() => import('./MyComponent.mjs')]} />
<Await f$Comp={[() => customFetchComponent('MyComponent')]} />
<Await Comp={MyComponent}>some children</Await>
<Await Comp={MyComponent}>{{
  with: <>some children</>
  loader: <>Loading some parent...</>
  error: () => <FancyErrorMessage />
}}</Await>
<Await Comp={Chat} f$children={[() => fetchChildren()]}>{{
  loader: <Spinner />
  error: () => <Popup text='Failed to load messages' />
}}</Await>
```

## Reload

An ideal usage of this component is completely declarative, the values returned by obtainers only change when their dependencies do, and so the component always knows when to re-run them. In reality though, these functions are likely using the network or another system with "pull" semantics because they're async, and so they might need to be re-run on a user interaction or timer, ideally without introducing bogus state such as a "last refresh time" that does nothing besides triggering a single update.

If you want to forget all obtainers and re-fetch your data, you can either call the `reload` function prop within the rendered component or the `reload` function patched onto the ref. This function never overrides any existing props or ref properties. Refs are forwarded in such a way that `instanceof` checks continue to work and `hasOwnProperty` or `in` works if and only if the ref object has no prototype.

## Tricks

You can pass an inline render function to put the data consumer right next to data fetching. By setting `f$Comp` to a unary tuple you indicate that the component will never change (empty dependency list), so you can pass a lambda function without losing component state. You still shouldn't use Comp's dependency list to take lexical bindings from the enclosing component because every time Comp is reloaded you'd lose component state.

```tsx
<Await
  f$user={[() => fetchUser(userId), userId]}
  f$Comp={[({ user }) => <>
    <h1>{user.name}</h1>
  </>]}
/>
```

A slightly better solution might be to pass a special component to `Comp` which forwards all its props to a render callback.

```tsx
<Await
  f$Comp={[(props) => props.render(props)]}
  f$user={[() => fetchUser(userId), userId]}
  f$render={[() => ({ user }) => {
    const chat = useConversation(myId, user.name)
    return <SomeChatView log={chat} />
  }, myId]}
/>
```

## Future of the project

The code is strictly separated to framework-agnostic business logic and React glue. This is mostly for maintainability, but I plan on porting it to other frameworks later and appreciate help in this regard.
