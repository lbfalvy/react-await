import React from "react"

export const ShowString = ({ s }: { s: string }) => <>{s}</>
export const Children = ({ s, children }: {s: string, children: React.ReactNode }) => {
  if (typeof children == 'function') throw new Error('aaaaa')
  return <>{s};{children}</>
}
interface ReloadProps {
  reload: () => void,
  withReload?: (r: () => void) => any
}
export const TestWithReload = ({ reload, withReload }: ReloadProps) => {
  const renderCount = React.useRef(0)
  renderCount.current++
  React.useEffect(() => {
    withReload?.(reload)
  }, [withReload])
  return <>{renderCount.current}</>
}