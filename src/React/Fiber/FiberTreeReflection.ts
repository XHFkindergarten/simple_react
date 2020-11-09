/**
 * Fiber树 和 真实 DOM 之间的反映关系
 */

import { EffectTag, WorkTag } from "../common";
import { Fiber } from "./Fiber";
import { get as getInstance } from '../InstanceMap'

/**
 * 获取最近的已挂载 Fiber 节点
 */
export function getNearestMountedFiber (fiber: Fiber): null | Fiber {
  let node = fiber
  let nearestMounted: Fiber | null = fiber
  if (!fiber.alternate) {
    // 没有 workInProgress，说明这个fiber节点是一个还没有被插入的新树
    // 那么节点上应该会有一个插入的 effect tag
    let nextNode: Fiber | null = node
    while (nextNode) {
      node = nextNode
      if ((node.effectTag & (EffectTag.Placement | EffectTag.Hydrating)) !== EffectTag.NoEffect) {
        // 这是一个插入节点，离它最近的可能的挂载节点需要向上寻找
        nearestMounted = node.return
      }
      nextNode = node.return
    }
  } else {
    while(node.return) {
      node = node.return
    }
  }
  if (node.tag = WorkTag.HostRoot) {
    return nearestMounted
  }
  return null
}

/**
 * 是否已经挂载了
 */
export function isMounted (
  component: any
): boolean {
  // ReactComponent -> fiber
  const fiber: Fiber = getInstance(component)
  if (!fiber) {
    return false
  }

  // 如果最近的挂载节点是这个 fiber, 说明已经挂载了
  return getNearestMountedFiber(fiber) === fiber
}