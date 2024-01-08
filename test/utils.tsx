import { when } from "@lbfalvy/when"
import React from "react"

export const ShowString = ({ s }: { s: string }) => <>{s}</>
export const Children = ({ s, children }: {s: string, children: React.ReactNode }) => {
  if (typeof children == 'function') throw new Error('aaaaa')
  return <>{s};{children}</>
}
interface ReloadProps {
  reload: () => void,
  withReload?: (r: () => void) => any,
  s: string,
}
export const TestWithReload = ({ reload, withReload }: ReloadProps) => {
  const renderCount = React.useRef(0)
  renderCount.current++
  React.useLayoutEffect(() => {
    withReload?.(reload)
  }, [withReload])
  return <>{renderCount.current}</>
}

export async function flushMtq(): Promise<void> {
  await when(5);
}