/**
 * DOM 组件树 收集 dom -> fiber 之间的关系map
 */

import { WorkTag } from "../common"


// 随机Key
const randomKey = Math.random().toString(36).slice(2)

// 随机Key对应的当前实例的Key
const internalInstanceKey = '__reactInternalInstance$' + randomKey
// Key 对应 render 之后的 props
const internalEventHandlersKey = '__reactEventHandlers$' + randomKey
// 对应实例
const internalContianerInstanceKey = '__reactContainer$' + randomKey

/**
 * 创建 html instance 的时候使用全局hash指针指向它对应的fiber
 */
export function precacheFiberNode (
  hostInst: object,
  node: Document | Element | Node
): void {
  node[internalInstanceKey] = hostInst
}


/**
 * 给定一个 DOM 元素，获取最近的容器组件 HostComponent 或者 HostText
 * 如果这个node是hydrated?或者还没有render那么也可以用一个SuspenseInstance
 * 或是一个HostRoot节点来表示
 */
export function getClosestInstanceFromNode (targetNode) {
  let targetInst = targetNode[internalInstanceKey]
  // 如果此时没有Key，直接返回null
  if (targetInst) {
    return targetInst
  }

  // @todo
  // 这段逻辑是考虑到事件触发组件并不是事件的直接目标
  // 真正的 targetInstance 可能还处于 suspense 状态中
  
  return null
}

export function getNodeFromInstance(inst) {
  // 只返回原生组件
  if (inst.tag === WorkTag.HostComponent || inst.tag === WorkTag.HostText) {
    return inst.stateNode
  }
  console.error('getNodeFromInstance 被错误调用了')
}
// 根据 dom 获取 render 了的 fiber props
export function getFiberCurrentPropsFromNode (node) {
  return node[internalEventHandlersKey] || null
}

// 设置 props
export function updateFiberProps (node, props) {
  node[internalEventHandlersKey] = props
}

export function getInstanceFromNode (node) {
  const inst = node[internalInstanceKey] || node[internalContianerInstanceKey]
  if (
    inst && 
    (
      inst.tag === WorkTag.HostComponent ||
      inst.tag === WorkTag.HostText ||
      inst.tag === WorkTag.SuspenseComponent ||
      inst.tag === WorkTag.HostRoot
    )
  ) {
    return inst
  }
  return null
}