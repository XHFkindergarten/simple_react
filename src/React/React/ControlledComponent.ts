/**
 * 当前被控制的组件
 */

// 用来恢复被控制的组件，在一个更新事件被触发之后
// let restoreImpl = null

let restoreTarget = null

let restoreQueue = null

// ?
export function needsStateRestore (): boolean {
  return restoreTarget !== null || restoreQueue !== null
}

export function restoreStateIfNeeded () {
  if (!restoreTarget) {
    return
  }
  // @todo
}