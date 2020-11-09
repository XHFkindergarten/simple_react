/**
 * 组件的updater
 * 用来控制更新组件状态
 */

// 这个对象我认为是用于初始化class时，占位兜底
export const ReactNoopUpdateQueue = {
  /**
   * 检查组件是否已经挂载
   */
  isMounted: function (publishInstance) {
    // 初始化ing的组件就别挂载不挂载了
    return false
  },

  /**
   * 强制更新
   */
  enqueueForceUpdate: function (publishInstance, callback, callerName) {
    console.warn('enqueueForceUpdate', publishInstance)
  },

  /**
   * 直接替换整个state,通常用这个或者setState来更新状态
   */
  enqueueReplaceState: function (
    publishInstance,
    completeState,
    callback,
    callerName
  ) {
    console.warn('enqueueReplaceState', publishInstance)
  },

  /**
   * 修改部分state
   */
  enqueueSetState: function (
    publishInstance,
    partialState,
    callback,
    callerName
  ) {
    console.warn('enqueueSetState', publishInstance)
  }
}