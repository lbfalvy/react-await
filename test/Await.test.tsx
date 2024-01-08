import { when, XPromise } from '@lbfalvy/when';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Await } from '../src/Await';
import { Children, flushMtq, ShowString, TestWithReload } from './utils';

test('only given properties', () => {
  const component = renderer.create(
    <Await Comp={ShowString} s='foo' />
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
      <Await Comp={ShowString} s={p} />
    )
  })

  test('resolves', async () => {
    await act(async () => {
      res('bar');
      await flushMtq();
    });
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })

  test('rejects', async () => {
    await act(async () => {
      rej('bar');
      await flushMtq();
    });
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
})

describe('obtainer', () => {
  describe('synchronous', () => {
    test('without dependencies', () => {
      const component = renderer.create(<Await Comp={ShowString} f$s={() => 'foo'} />)
      expect(component.toJSON()).toMatchSnapshot()
    })
    
    describe('with dependencies', () => {
      let component: renderer.ReactTestRenderer
      let obtainS: jest.Mock<string, any>
      const idleProps = { Comp: ShowString };
      beforeEach(() => {
        obtainS = jest.fn().mockReturnValue('foo')
        component = renderer.create(<Await {...idleProps} f$s={[obtainS, 1]} />)
      })
      
      test('rerenders on dep change', () => {
        expect(obtainS).toHaveBeenCalledTimes(1)
        act(() => component.update(<Await {...idleProps} f$s={[obtainS, 2]} />))
        expect(obtainS).toHaveBeenCalledTimes(2)
      })
      
      test('does not rerender if only function changes', () => {
        const cb = jest.fn().mockReturnValue('quz')
        act(() => component.update(<Await {...idleProps} f$s={[cb, 1]} />))
        expect(cb).not.toHaveBeenCalled()
      })
    })
  })
  
  test('asynchronous', async () => {
    const promises: [XPromise<string>, (s: string) => void, (e: any) => void][] = []
    const obtainer = () => {
      const [p, rs, rj] = when<string>()
      promises.push([p, rs, rj])
      return p
    }
    const component = renderer.create(<Await Comp={ShowString} f$s={obtainer} />)
    expect(promises).toHaveLength(1)
    await act(async () => {
      promises[0][1]('foo');
      await flushMtq();
    })
    expect(component.toJSON()).toMatchSnapshot()
  })
})

describe('children', () => {
  test('plain', () => {
    const component = renderer.create(<Await Comp={Children} s='foo'>bar</Await>)
    expect(component.toJSON()).toMatchSnapshot()
  })
  
  test('with custom loader', async () => {
    const [promise, resolve, reject] = when<string>()
    const component = renderer.create(<Await Comp={Children} s={promise}>{{
      with: 'bar',
      loader: 'waiting for data...'
    }}</Await>)
    expect(component.toJSON()).toMatchSnapshot()
    await act(async () => {
      resolve('foo');
      await flushMtq();
    })
    expect(component.toJSON()).toMatchSnapshot()
  })
  
  test('promise', async () => {
    const [promise, resolve] = when<string>()
    const component = renderer.create(<Await Comp={Children} s='foo'>{promise}</Await>)
    expect(component.toJSON()).toMatchSnapshot()
    await act(async () => {
      resolve('bar');
      await flushMtq();
    })
    expect(component.toJSON()).toMatchSnapshot()
  })
  
  test('obtained', () => {
    const component = renderer.create(<Await Comp={Children} s='foo' f$children={[() => 'bar']} />)
    expect(component.toJSON()).toMatchSnapshot()
  })
})
  
describe('reload', () => {
  test('externally', () => {
    let ref: { reload: () => void } | null | undefined
    const component = renderer.create(<Await
      Comp={TestWithReload}
      ref={r => ref = r}
      f$s={[() => "foo"]}
    />)
    act(() => ref?.reload())
    expect(component.toJSON()).toMatchSnapshot()
  })

  test('internally', () => {
    let reload!: () => void;
    const component = renderer.create(<Await
      Comp={TestWithReload}
      withReload={(r: () => void) => reload = r}
      f$s={[() => "foo"]}
    />)
    act(() => reload())
    expect(component.toJSON()).toMatchSnapshot()
  })
})

describe('Async obtainer for component', () => {
  test('plain', async () => {
    const [promise, resolve, reject] = when<(props: { s: string }) => React.ReactElement>()
    const component = renderer.create(<Await f$Comp={[() => promise]} s='foo' />)
    await act(async () => {
      resolve(ShowString);
      await flushMtq();
    })
    expect(component.toJSON()).toMatchSnapshot()
  })
  test('in module', async () => {
    const [promise, resolve, reject] = when<{ default: (props: { s: string }) => React.ReactElement }>()
    const component = renderer.create(<Await f$Comp={[() => promise]} s='foo' />)
    await act(async () => {
      resolve({ default: ShowString })
      await flushMtq();
    })
    expect(component.toJSON()).toMatchSnapshot()
  })
})