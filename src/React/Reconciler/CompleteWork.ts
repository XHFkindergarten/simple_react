/**
 * 完成reconcile
 */

import { Container, EffectTag, WorkTag } from "../common";
import { appendInitialChild, createInstance, finalizeInitialChildren, Instance, prepareUpdate, Props, Type } from "../Dom/DomHostConfig";
import { Fiber } from "../Fiber/Fiber";
import { getHostContext, getRootHostContainer, popHostContainer, popHostContext } from "../HostContext";

// 在真实DOM中放置元素
export function appendAllChildren (
  parent: Instance,
  workInProgress: Fiber,
  needsVisibilityToggle: boolean,
  isHidden: boolean
) {
  let node = workInProgress.child
  // 我们只有当前fiber对应的node节点本身
  // 当然它的子节点的真实dom已经在内存中就位了
  while (node !== null) {
    if ((node as Fiber).tag === WorkTag.HostComponent || (node as Fiber).tag === WorkTag.HostText) {
      appendInitialChild(parent, (node as Fiber).stateNode)
    } else if (node.tag === WorkTag.FundamentalComponent) {

    } else if (node.tag === WorkTag.HostPortal) {

    } else if (node.child !== null) {
      // 如果child不为Null,进入子元素进行放置
      node.child.return = node
      node = node.child
      continue
    }
    if (node === workInProgress) {
      // 不知道这是什么情况下会触发..
      return
    }
    while(node.sibling === null) {
      // 如果没有兄弟节点了
      if (node.return === null || node.return === workInProgress) {
        // 如果已经是根节点 或者
        return
      }
      // 向上层移动
      node = node.return
    }
    // 直到向上找到一个有兄弟节点的节点
    node.sibling.return = node.return
    node = node.sibling
  }
}
// 将 fiber 标记为需要更新
function markUpdate (workInProgress: Fiber) : void {
  workInProgress.effectTag |= EffectTag.Update
}

// 更新原生组件
export function updateHostComponent (
  current: Fiber,
  workInProgress: Fiber,
  type: Type,
  newProps: Props,
  rootContainerInstance: Container
) {
  // 如果有一个 alternate ，说明这是一次 update
  const oldProps = current.memorizedProps
  if (oldProps === newProps) {
    // 无需修改
    return
  }

  // 如果是某个 child 改变，可以考虑复用这个节点
  const instance: Instance = workInProgress.stateNode
  const currentHostContext = getHostContext()


  // 通过 diff 算法，判断节点的更新参数
  const updatePayload = prepareUpdate(
    instance,
    type,
    oldProps,
    newProps,
    rootContainerInstance,
    currentHostContext
  )
  // 定义 UpdateQueue类型 的时候没想明白吗，或许是两个人写的
  workInProgress.updateQueue = updatePayload as any
  if (updatePayload) {
    // 将这个 fiber 的 effect 标记为 Update
    markUpdate(workInProgress)
  }
}

export function completeWork (
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: number
): Fiber | null {
  const newProps = workInProgress.pendingProps
  switch (workInProgress.tag) {
    case WorkTag.IndeterminateComponent:
      break
    case WorkTag.LazyComponent:
      break
    case WorkTag.FunctionComponent:
      break
    case WorkTag.ClassComponent: {
      // const Component = workInProgress.type
      // if (isLegacyContextProvider(Component)) {
      //   popLegacyContext(workInProgress)
      // }
      break
    }
    case WorkTag.HostRoot: {
      popHostContainer(workInProgress)
      // popTopLevelLegacyContextObject(workInProgress)
      // 获取fiberRoot
      const fiberRoot = workInProgress.stateNode
      // 如果有将要使用的上下文,挂载到root上
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext
        fiberRoot.pendingContext = null
      }
      
      if (current === null || current.child === null) {
        // ?? 什么情况
      }      
    }
    case WorkTag.HostComponent: {
      // pop该fiber对应的上下文
      popHostContext(workInProgress)
      // 获取stack中的当前dom
      const rootContainerInstance = getRootHostContainer()
      const type = workInProgress.type
      if (current !== null && workInProgress.stateNode !== null) {
        // @todo
        // 不是初次渲染，更新已有的dom
        // updateHostComponent
        updateHostComponent(
          current,
          workInProgress,
          type as string,
          newProps,
          rootContainerInstance
        )
      } else {
        if (!newProps) {
          throw new Error('如果没有newProps,是不合法的')
        }
        // 获取namespace
        const currentHostContext = getHostContext()

        // 判断是不是hydrated
        // @todo
        let wasHydrated = false
        if (wasHydrated) {
          // @todo 略过
        } else {
          let instance = createInstance(
            type as string,
            newProps,
            rootContainerInstance,
            currentHostContext,
            workInProgress
          )
          // 将之前所有已经生成的子dom元素装载到instance实例中
          appendAllChildren(instance, workInProgress, false, false)
          // This needs to be set before we mount Flare event listeners
          workInProgress.stateNode = instance

          // feat: 这个函数真的藏得很隐蔽，我不知道这些人是怎么能注释都不提一句的呢→_→
          // finalizeInitialChildren 作用是将props中的属性挂载到真实的dom元素中去
          // 返回一个bool值，代表是否需要auto focus(input, textarea...)
          if (finalizeInitialChildren(instance, type as string, newProps, rootContainerInstance, currentHostContext)) {
            markUpdate(workInProgress)
          }

          // @todo
          // if (workInProgress.ref !== null) 
          // markRef(workInProgress)
        }
      }
    }
  }
  
  return null
}