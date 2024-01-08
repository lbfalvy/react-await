export type SettledStatus = ["succ" | "fail", unknown];

type PromiseStatus =
  | ["pending", ((status: SettledStatus) => void)[]]
  | SettledStatus;

type PromiseRecord = {
  id: number,
  status: PromiseStatus,
}

const PROMISES = new WeakMap<Promise<unknown>, PromiseRecord>();

let next_id = 0;

function mk_record(status: PromiseStatus): PromiseRecord {
  return { id: next_id++, status };
}

export function catalogPromise(promise: Promise<unknown>) {
  if (PROMISES.has(promise)) return;
  PROMISES.set(promise, mk_record(["pending", []]));
  promise.then(res => {
    const prev = PROMISES.get(promise)!;
    PROMISES.set(promise, mk_record(["succ", res]));
    if (prev.status[0] === "pending") {
      prev.status[1].forEach(f => f(["succ", res]));
    }
  }, err => {
    const prev = PROMISES.get(promise)!;
    PROMISES.set(promise, mk_record(["fail", err]));
    if (prev.status[0] === "pending") {
      prev.status[1].forEach(f => f(["fail", err]));
    }
  });
}

export function promiseStatus(
  promise: Promise<unknown>
): "pending" | SettledStatus {
  const record = PROMISES.get(promise);
  if (record == undefined || record.status[0] == "pending") return "pending";
  else return record.status;
}

export function then(
  promise: Promise<unknown>,
  cb: (status: ["succ" | "fail", unknown]) => void
) {
  if (!PROMISES.has(promise)) {
    catalogPromise(promise);
  }
  const record = PROMISES.get(promise)!;
  if (record.status[0] == "pending") record.status[1].push(cb);
  else Promise.resolve(record.status).then(cb);
}

export function debugPrint(promise: Promise<unknown>): string {
  const record = PROMISES.get(promise);
  if (record === undefined) return `Promise`;
  const { id, status: [variant, payload]} = record;
  if (variant == "pending") return `Promise(${id})`;
  return `Promise(${id}, ${variant}: ${payload})`;
}
