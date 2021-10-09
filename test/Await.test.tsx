import { when, XPromise } from '@lbfalvy/when';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Await } from '../src/Await';
import { Children, ShowString, TestWithReload } from './utils';

test('only given properties', () => {
  const component = renderer.create(
    <Await for={ShowString} s='foo' />
  );
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

describe('promise', () => {
  let p: XPromise<string>, res: (s: string) => void, rej: (e: any) => void
  let component: renderer.ReactTestRenderer
  beforeEach(() => {
    [p, res, rej] = when<string>()
    component = renderer.create(
      <Await for={ShowString} s={p} />
    )
  })

  test('resolves', () => {
    act(() => res('bar'))
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })

  test('rejects', () => {
    act(() => rej('bar'))
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
})

describe('obtainer', () => {
  describe('synchronous', () => {
    test('without dependencies', () => {
      const component = renderer.create(<Await for={ShowString} obtainS={() => 'foo'} />)
      expect(component.toJSON()).toMatchSnapshot()
    })
    
    describe('with dependencies', () => {
      let component: renderer.ReactTestRenderer
      let obtainS: jest.Mock<string, any>
      const idleProps = { for: ShowString }
      beforeEach(() => {
        obtainS = jest.fn().mockReturnValue('foo')
        component = renderer.create(<Await {...idleProps} obtainS={[obtainS, 1]} />)
      })
      
      test('rerenders on dep change', () => {
        expect(obtainS).toHaveBeenCalledTimes(1)
        act(() => component.update(<Await {...idleProps} obtainS={[obtainS, 2]} />))
        expect(obtainS).toHaveBeenCalledTimes(2)
      })
      
      test('does not rerender if only function changes', () => {
        const cb = jest.fn().mockReturnValue('quz')
        act(() => component.update(<Await {...idleProps} obtainS={[cb, 1]} />))
        expect(cb).not.toHaveBeenCalled()
      })
    })
  })
  
  test('asynchronous', () => {
    const promises: [XPromise<string>, (s: string) => void, (e: any) => void][] = []
    const obtainer = () => {
      const [p, rs, rj] = when<string>()
      promises.push([p, rs, rj])
      return p
    }
    const component = renderer.create(<Await for={ShowString} obtainS={obtainer} />)
    expect(promises).toHaveLength(1)
    act(() => promises[0][1]('foo'))
    expect(component.toJSON()).toMatchSnapshot()
  })
})

describe('children', () => {
  test('plain', () => {
    const component = renderer.create(<Await for={Children} s='foo'>bar</Await>)
    expect(component.toJSON()).toMatchSnapshot()
  })
  
  test('with custom loader', () => {
    const [promise, resolve, reject] = when<string>()
    const component = renderer.create(<Await for={Children} s={promise}>{{
      with: 'bar',
      loader: 'waiting for data...'
    }}</Await>)
    expect(component.toJSON()).toMatchSnapshot()
    act(() => resolve('foo'))
    expect(component.toJSON()).toMatchSnapshot()
  })
  
  test('promise', () => {
    const [promise, resolve] = when<string>()
    const component = renderer.create(<Await for={Children} s='foo'>{promise}</Await>)
    expect(component.toJSON()).toMatchSnapshot()
    act(() => resolve('bar'))
    expect(component.toJSON()).toMatchSnapshot()
  })
  
  test('obtained', () => {
    const component = renderer.create(<Await for={Children} s='foo' obtainChildren={[() => 'bar']} />)
    expect(component.toJSON()).toMatchSnapshot()
  })
})
  
describe('reload', () => {
  test('externally', () => {
    let ref: { reload: () => void } | null | undefined
    const component = renderer.create(<Await for={TestWithReload} ref={r => ref = r} />)
    act(() => ref?.reload())
    expect(component.toJSON()).toMatchSnapshot()
  })

  test('internally', () => {
    let reload!: () => void | undefined
    const component = renderer.create(<Await for={TestWithReload} withReload={(r: () => void) => reload = r} />)
    act(() => reload?.())
    expect(component.toJSON()).toMatchSnapshot()
  })
})

describe('Async obtainer for component', () => {
  test('plain', () => {
    const [promise, resolve, reject] = when<(props: { s: string }) => React.ReactElement>()
    const component = renderer.create(<Await obtainFor={[() => promise]} s='foo' />)
    act(() => resolve(ShowString))
    expect(component.toJSON()).toMatchSnapshot()
  })
  test('in module', () => {
    const [promise, resolve, reject] = when<{ default: (props: { s: string }) => React.ReactElement }>()
    const component = renderer.create(<Await obtainFor={[() => promise]} s='foo' />)
    act(() => resolve({ default: ShowString }))
    expect(component.toJSON()).toMatchSnapshot()
  })
})