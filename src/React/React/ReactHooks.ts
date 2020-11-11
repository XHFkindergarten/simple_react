/**
 * Hooks 架构相关
 */

import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

function resolveDispatcher () {
  // 获取当前的 dispatcher
  const dispatcher = ReactCurrentDispatcher.current
  if (dispatcher === null) {
    throw new Error ('Invalid hook call')
  }
  return dispatcher
}

export function useState<S>(initialState: (() => S) | S) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

