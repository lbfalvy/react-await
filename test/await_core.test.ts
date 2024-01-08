import { when } from "@lbfalvy/when";
import { AwaitCore } from "../src/AwaitCore"

test("Returns the empty object", () => {
  const core = new AwaitCore([]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({});
})

const testCore = () => new AwaitCore([
  ["foo", { value: 3 }],
  ["bar", { value: true }],
]);

test("Returns direct porps", () => {
  const core = testCore();
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ bar: true, foo: 3 });
})

test("Allows updating props", () => {
  const core = testCore();
  core.update([
    ["foo", { value: 4 }],
    ["bar", { value: true }]
  ]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 4, bar: true });
})

test("Allows adding new props", () => {
  const core = testCore();
  core.update([
    ["foo", { value: 3 }],
    ["bar", { value: true }],
    ["baz", { value: "quz" }],
  ]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3, bar: true, baz: "quz" });
})

test("Allows deleting props", () => {
  const core = testCore();
  core.update([["foo", { value: 3 }]]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3 });
})

test("Allows deleting all props", () => {
  const core = testCore();
  core.update([]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({});
})

test("Plain obtainer behaviour", () => {
  const obt = jest.fn(() => 3);
  const core = new AwaitCore([["foo", { obtainer: { fn: obt } }]]);
  // obtainer works
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3 });
  // result reused from ctor
  core.update([["foo", { obtainer: { fn: obt } }]]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3 });
  expect(obt).toHaveBeenCalledTimes(1);
  const obt2 = jest.fn(() => 4);
  // change detected
  core.update([["foo", { obtainer: { fn: obt2 } }]]);
  expect(obt).toHaveBeenCalledTimes(1);
  expect(core.props()).toEqual({ foo: 4 });
  // result reused from previous update
  core.update([["foo", { obtainer: { fn: obt2 } }]]);
  expect(obt2).toHaveBeenCalledTimes(1);
  // change from previous update detected and earlier value forgotten
  core.update([["foo", { obtainer: { fn: obt } }]]);
  expect(obt).toHaveBeenCalledTimes(2);
  expect(core.props()).toEqual({ foo: 3 });
  // deleting obtainers deletes the result...
  core.update([]);
  expect(core.props()).toEqual({});
  // ...and forgets the obtainer
  core.update([["foo", { obtainer: { fn: obt } }]]);
  expect(obt).toHaveBeenCalledTimes(3);
  // changing to value forgets the obtainer
  core.update([["foo", { value: 4 }]]);
  expect(core.props()).toEqual({ foo: 4 });
  core.update([["foo", { obtainer: { fn: obt } }]]);
  expect(obt).toHaveBeenCalledTimes(4);
  expect(core.props()).toEqual({ foo: 3 });
})

/** Flush the microtask queue n times */
async function flush_mtq(): Promise<void> {
  await new Promise(res => setTimeout(res, 0));
}

test("Promise behaviour", async () => {
  const statcb = jest.fn();
  const [pr1, res1] = when();
  const core = new AwaitCore([["foo", { value: pr1 }]]);
  core.statusChange(statcb);
  // Pending state
  expect(core.status()).toBe("pending");
  expect(core.props()).toStrictEqual({});
  // Resolving a promise
  res1(3);
  await flush_mtq();
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3 });
  expect(statcb).toHaveBeenCalledTimes(1);
  // Updating with the same promise
  core.update([["foo", { value: pr1 }]]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3 });
  expect(statcb).toHaveBeenCalledTimes(1);
  // Updating with a different promise
  const [pr2, res2] = when();
  core.update([["foo", { value: pr2 }]]);
  expect(core.status()).toBe("pending");
  // settling the second promise
  res2(true);
  await flush_mtq();
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: true });
  expect(statcb).toHaveBeenCalledTimes(2);
  // Updating with a known promise settles synchronously
  core.update([["foo", { value: pr1 }]]);
  expect(core.status()).toBe("ready");
  expect(core.props()).toEqual({ foo: 3 });
  expect(statcb).toHaveBeenCalledTimes(2);
})

test("Async obtainer behaviour", async () => {
  // this test simply ensures that the above two systems are chained
  // together
  const statcb = jest.fn();
  const [pr1, res1] = when();
  const core = new AwaitCore([["foo", { value: pr1 }]]);
  core.statusChange(statcb);
})

test("Status changes to ready when all are ready", async () => {
  const statcb = jest.fn();
  const [pr1, res1] = when();
  const [pr2, res2] = when();
  const core = new AwaitCore([
    ["foo", { value: pr1 }],
    ["bar", { value: pr2 }]
  ]);
  core.statusChange(statcb);
  expect(core.status()).toBe("pending");
  res1(3);
  await flush_mtq();
  expect(core.status()).toBe("pending");
  expect(statcb).toHaveBeenCalledTimes(0);
  res2(false);
  await flush_mtq();
  expect(core.status()).toBe("ready");
  expect(statcb).toHaveBeenCalledTimes(1);
  expect(statcb).toHaveBeenCalledWith(["ready", { foo: 3, bar: false }]);
})

test("Status changes to error when any error", async () => {
  let arg = undefined;
  const statcb = jest.fn(x => arg = x);
  const [pr1, _res1, rej1] = when();
  const [pr2] = when();
  const core = new AwaitCore([
    ["foo", { value: pr1 }],
    ["bar", { value: pr2 }]
  ]);
  core.statusChange(statcb);
  rej1("some error");
  await flush_mtq();
  expect(statcb).toHaveBeenCalledTimes(1);
  const [variant, payload] = arg!;
  expect(variant).toBe("errors");
  expect(payload.size).toBe(1);
  expect(payload.get("foo")).toBe("some error");
})