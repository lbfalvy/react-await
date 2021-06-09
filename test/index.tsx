import { Await } from '../src/index'
import ReactDOM from 'react-dom'
import React from 'react'

const TestCases: (() => React.ReactElement)[] = [
    () => <>
        <p>Await with only synchronous properties</p>
        <Await for={ShowString} s='foo' t='bar' u='baz' />
    </>,
    () => {
        const [promise, resolve, reject] = usePromise()
        return <>
            <p>Await with a single promise</p>
            <Await for={ShowString} s='foo' t={promise} u='baz' />
            <PromiseControl resolve={resolve} reject={reject} />
        </>
    },
    () => <>
        <p>Await with a single synchronous obtainer function</p>
        <Await for={ShowString} s='foo' obtainT={() => 'bar'} u='baz' />
    </>,
    () => {
        const [p1, res1, rej1] = usePromise()
        const [p2, res2, rej2] = usePromise()
        return <>
            <p>Await with a plain promise, an obtainer for another promise and a synchronous obtainer</p>
            <Await for={ShowString} s={p1} obtainT={() => p2} obtainU={() => 'baz'} />
            <PromiseControl resolve={res1} reject={rej1} />
            <PromiseControl resolve={res2} reject={rej2} />
        </>
    },
    () => <>
        <p>Await with plain children</p>
        <Await for={TestWithChildren} s='foo'>
            <a href='https://example.com'>Test child tree</a>
        </Await>
    </>,
    () => {
        const [p1, res1, rej1] = usePromise()
        return <>
            <p>Await with plain children and a custom loader</p>
            <Await for={TestWithChildren} s={p1}>
                {{
                    with: <a href='https://example.com'>example</a>,
                    loader: 'write something in the box below'
                }}
            </Await>
            <PromiseControl resolve={res1} reject={rej1} />
        </>
    },
    () => {
        const [p1, res1, rej1] = usePromise()
        return <>
            <p>Await with promise children</p>
            <Await for={TestWithChildren} s='foo'>
                {p1}
            </Await>
            <PromiseControl resolve={res1} reject={rej1} />
        </>
    },
    () => <>
        <p>Await with obtained children</p>
        <Await for={TestWithChildren} s='foo' obtainChildren={() => <a href='https://example.com'>example</a>} />
    </>,
    () => {
        const [p1, res1, rej1] = usePromise()
        return <>
            <p>Await with obtained async children and a custom loader</p>
            <Await for={TestWithChildren} s='foo' obtainChildren={() => p1}>
                {{
                    loader: 'Enter something in the box below'
                }}
            </Await>
            <PromiseControl resolve={res1} reject={rej1} />
        </>
    }
]

const ShowString = ({ s, t, u }: { s: string, t: string, u: string }) => <>{s};{t};{u}</>
const TestWithChildren = ({ s, children }: {s: string, children: React.ReactNode }) => <>
    {s};{children}
</>

function usePromise(): [Promise<string>, (s: string) => void, (e: any) => void] {
    let resolve!: (v: string) => void, reject!: (e: string) => void
    const promise = new Promise<string>((res, rej) => {
        resolve = res
        reject = rej
    })
    return [promise, resolve, reject]
}

function PromiseControl({ resolve, reject }: { resolve: (s: string) => void, reject?: (e: any) => void }) {
    const [v, setv] = React.useState('')
    return <div>
        <input value={v} onChange={e => setv(e.target.value)} />
        <button onClick={() => resolve(v)}>Resolve</button>
        {reject ? <button onClick={() => reject(v)}>Reject</button> : null}
    </div>
}

function Main() {
    return <>{TestCases.map((TC, i) => <TC key={i}/>)}</>
}
ReactDOM.render(<Main/>, document.getElementById('root'))