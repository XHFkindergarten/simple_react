/**
 * virtual dom -> real dom
 */

import { WorkTag } from "../common"
import { updateProperties } from "../Dom/DomComponent"
import { appendChildToContainer, Instance, Props, Type, UpdatePayload } from "../Dom/DomHostConfig"
import { updateFiberProps } from "../Event/DomComponentTree"
import { Fiber } from "../Fiber/Fiber"

// 执行Placement -> real dom
export function commitPlacement (finishedWork: Fiber): void {
  // 获取最近的原生父级fiber或者rootFiber
  const parentFiber = getHostParent(finishedWork)
  // Node: 这两个变量必须同时被改变
  let parent
  // 是否是根容器
  let isContainer
  // 容器节点
  const parentStateNode = parentFiber.stateNode
  
  switch (parentFiber.tag) {
    case WorkTag.HostComponent: {
      parent = parentStateNode
      isContainer = false
      break
    }
    case WorkTag.HostRoot: {
      // 如果是根节点，stateNode即是fiberRoot
      parent = parentStateNode.containerInfo
      isContainer = true
    }
    case WorkTag.HostPortal:
    case WorkTag.FundamentalComponent:
      break
    
    // if (parentFiber.effectTag & EffectTag.ContentReset) {

    // }

  }
  // 寻找一个兄弟节点？意义不明
  const before = getHostSibling(finishedWork)

  let node: Fiber = finishedWork

  while (true) {
    // 直到node是原生组件/文字容器
    // 因为React组件是不可以被放置的
    // 如果没有，会继续向下查找
    const isHost = node.tag === WorkTag.HostComponent || node.tag === WorkTag.HostText
    if (isHost) {
      // 当前节点的dom实例
      const stateNode = isHost ? node.stateNode : node.stateNode.instance
      if (before) {
        // ...
      } else {
        if (isContainer) {
          // 是根节点，将元素添加到根节点中
          appendChildToContainer(parent, stateNode)
        }
      }
    } else if (node.tag === WorkTag.HostPortal) {

    } else if (node.child !== null) {
      // 如果有子元素，向子元素移动
      node.child.return = node
      node = node.child
      continue
    }
    if (node === finishedWork) {
      console.warn('不应该出现的情况')
      return
    }
    // 向上移动直到找到有兄弟节点或到达顶端
    while(node.sibling === null) {
      if (node.return === null || node.return === finishedWork) {
        // 不可能出现的情况
        return
      }
      node = node.return
    }
    // 移动到兄弟节点
    node.sibling.return = node.return
    node = node.sibling
  }
}

// 寻找最近的原生组件fiber或者rootFiber
export function getHostParent(fiber:Fiber): Fiber {
  let parent = fiber.return
  while(parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
  // 如果运行到这里，说明fiber还没到达顶层就断了
  throw new Error('getHostParent Error')
}

// 我们需要向上找到一个兄弟hostNode
// 如果多个插入在一行中，复杂度会呈指数上升
// 这个逻辑是需要优化的
export function getHostSibling (fiber: Fiber): Instance | null {
  // @question
  // 我没有理解这个算法的意义
  return null

  // let node: Fiber = fiber
  // while (true) {
  //   // 如果没有找到兄弟节点，就尝试另一个sibling
  //   while (node.sibling === null) {
  //     if (node.return === null || isHostParent(node.return)) {
  //       // 如果已经离开了树或者到达了根节点，那么说明无法找到
  //       return null
  //     }
  //     node = node.return
  //   }
  //   // 这时可以保证node.sibling不为null(可能到了更上的层级)
  //   // 将node.sibling和node的return指向同一个(处理特殊情况?)
  //   node.sibling.return = node.return
  //   node = node.sibling
  //   while(
  //     node.tag !== WorkTag.HostComponent &&
  //     node.tag !== WorkTag.HostText &&
  //     node.tag !== WorkTag.DehydratedFragment
  //   ) {
  //     // 如果不是host node 我们可能在其中有包含一个host node
  //     // 需要向下去搜索直到我们找到
  //     if (node.effectTag & EffectTag.Placement) {
  //       continue
  //     }

  //     if (node.child === null || node.tag === WorkTag.HostPortal) {
  //       continue
  //     } else {
  //       node.child.return = node
  //       node = node.child
  //     }
  //   }
  //   // 确认这个节点是stable的
  //   if (!(node.effectTag & EffectTag.Placement)) {
  //     return node.stateNode
  //   }
  // }
}


// 也不知道这个 Host 的判断有啥用
export function isHostParent (fiber: Fiber): boolean {
  return (
    fiber.tag === WorkTag.HostRoot ||
    fiber.tag === WorkTag.HostComponent ||
    fiber.tag === WorkTag.HostPortal
  )
}


export function commitWork(
  current: Fiber | null,
  finishedWork: Fiber
): void {
  switch (finishedWork.tag) {
    // 略了一些
    case WorkTag.HostComponent: {
      // 页面中的 dom 实例
      const instance: Instance = finishedWork.stateNode
      if (instance !== null) {
        // 新的props
        const newProps = finishedWork.memorizedProps

        const oldProps = current !== null ? current.memorizedProps : newProps

        const type = finishedWork.type

        // 我就是 any 战士怎么了
        const updatePayload: UpdatePayload | null = finishedWork.updateQueue as any
        finishedWork.updateQueue = null

        if (updatePayload !== null) {
          commitUpdate(
            instance,
            updatePayload,
            type as string,
            oldProps,
            newProps
          )
        }
      }
      return
    }
  }
}

/**
 * 将最终修改作用到真实 dom 上
 */
export function commitUpdate (
  domElement: Instance,
  updatePayload: any[],
  type: Type,
  oldProps: Props,
  newProps: Props,
  internalInstanceHandle?: any
): void {
  // 修改 dom 的某个属性
  updateFiberProps(domElement, newProps)
  // 将 diff 结果作用到 dom 上
  updateProperties(domElement, updatePayload, type, oldProps, newProps)
}
