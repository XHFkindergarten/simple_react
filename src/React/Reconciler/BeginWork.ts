import { cloneChildFibers, reconcileChildFibers } from "../ChildFiber"
import { EffectTag, ExpirationTime, Mode, WorkTag } from "../common"
import { Fiber } from "../Fiber/Fiber"
import { constructClassInstance, mountClassInstance, updateClassInstance } from "../FiberClassComponent"
import { pushTopLevelContextObject } from "../Fiber/FiberContext"
import { renderWithHooks } from "../Fiber/FiberHooks"
import { pushHostContainer } from "../HostContext"
import { FiberRoot } from "../Fiber/FiberRoot"
import { shouldSetTextContent } from "../Dom/DomHostConfig"
import { pushHostContext } from "../HostContext"
import { processUpdateQueue, UpdateQueue } from "../UpdateQueue"
import { isFunction, isNull } from "../utils"

/**
 * 真正的工作内容
 */

// 是否组件状态已经发生了改变
let didReceiveUpdate: boolean = false



export function beginWork (
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: number
): Fiber | null {
  // 最新的过期时间
  const updateExpirationTime = workInProgress.expirationTime
  if (current !== null) {
    const oldProps = current.memorizedProps
    const newProps = workInProgress.pendingProps
    if (oldProps !== newProps) {
      didReceiveUpdate = true
    } else if (updateExpirationTime < renderExpirationTime) {
      didReceiveUpdate = false
      switch (workInProgress.tag) {
        case WorkTag.HostRoot:
          pushHostRootContext(workInProgress)
          break
        case WorkTag.HostComponent:
          pushHostContext(workInProgress)
          if (
            workInProgress.mode & Mode.ConcurrentMode &&
            renderExpirationTime !== ExpirationTime.Never
            // && shouldDeprioritizeSubtree(workInProgress.type, newProps)
          ) {
            // @todo
          }
          break
        // @todo
      }
      return bailoutOnAlreadyFinishedWork(
        current,
        workInProgress,
        renderExpirationTime
      )
    }
  }
  // 在进入开始阶段前，reset expirationTime
  workInProgress.expirationTime = ExpirationTime.NoWork
  switch (workInProgress.tag) {
    // RootFiber
    case WorkTag.HostRoot:
      return updateHostRoot(current as Fiber, workInProgress, renderExpirationTime)
    // class 组件
    case WorkTag.ClassComponent: {
      const Component = workInProgress.type
      const unresolvedProps = workInProgress.pendingProps
      const resolvedProps = unresolvedProps
      return updateClassComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderExpirationTime
      )
    }
    // 非Class组件
    case WorkTag.IndeterminateComponent: 
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type as Function,
        renderExpirationTime
      )
    
    // 原生组件
    case WorkTag.HostComponent:
      const res = updateHostComponent(current, workInProgress, renderExpirationTime)
      return res
  }
  return null
}

// 更新原生组件
function updateHostComponent (
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: number
) {
  pushHostContext(workInProgress)
  if (isNull(current)) {
    // @todo
  }

  const type = workInProgress.type
  const nextProps = workInProgress.pendingProps
  // const prevProps = !isNull(current) ? current?.memorizedProps : null

  let nextChildren = nextProps.children
  // 是否子元素是文字节点
  const isDirectTextChild = shouldSetTextContent(type as string, nextProps)

  if (isDirectTextChild) {
    // 对于子元素为纯文字的节点，递归就已经到达了终点 ^ ^.
    nextChildren = null
  }
  // @todo 这里有个奇怪的判断

  // markRef(current, workInProgress)

  // 检查host config来看这个children是不是应该隐藏
  reconcileChildren(
    current,
    workInProgress,
    nextChildren,
    renderExpirationTime
  )
  return workInProgress.child
}

// 更新Class组件
function updateClassComponent (
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps,
  renderExpiration: number
) {
  // @todo 省略了判断
  let hasContext = false
  // fiberRoot
  const instance = workInProgress.stateNode
  let shouldUpdate
  if (instance === null) {
    if (current !== null) {
      // 将WIP和fiber完全解绑
      current.alternate = null
      workInProgress.alternate = null
      workInProgress.effectTag |= EffectTag.Placement
    }
    // 在初始化阶段，先构建实例
    constructClassInstance(
      workInProgress,
      Component,
      nextProps,
      renderExpiration
    )
    mountClassInstance(
      workInProgress,
      Component,
      nextProps,
      renderExpiration 
    )
    shouldUpdate = true
  } else if (current === null) {
    // 说明instance不为null，之前已经构建过实例，但是没有完成
    // shouldUpdate = resumeMountClassInstance(...)
    shouldUpdate = true
  } else {
    // 已经render过了，更新
    shouldUpdate = updateClassInstance(
      current,
      workInProgress,
      Component,
      nextProps,
      renderExpiration
    )
  }
  // 下一步
  const nextUnitOfWork = finishClassComponent(
    current,
    workInProgress,
    Component,
    shouldUpdate,
    hasContext,
    renderExpiration
  )
  return nextUnitOfWork
}

// 完成Class组件的构建
function finishClassComponent (
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  shouldUpdate: boolean,
  hasContext: boolean,
  renderExpiration: number
) {
  // 即便是shouldComponentUpdate返回了false，Refs也应该更新
  // @todo
  // updateRef(current, workInProgress)

  // 是否捕捉到了Error
  // const didCaptureError = (workInProgress.effectTag & DidCapture) !== EffectTag.NoEffect
  const didCaptureError = false

  if (!shouldUpdate && !didCaptureError) {
    if (hasContext) {
      // 抛出问题
      return bailoutOnAlreadyFinishedWork(
        current,
        workInProgress,
        renderExpiration
      )
    }
  }

  // 对于 composition 组件而言 stateNode 就是实例
  const instance = workInProgress.stateNode

  // @todo 不知道是干嘛的
  // Rerender
  // ReactCurrentOwner.current = workInProgress
  let nextChildren

  // 如果捕捉到了错误但是又没有定义getDerivedStateFromProps
  if (didCaptureError && !isFunction(Component.getDerivedStateFromError)) {
    // 取消后续的渲染
    nextChildren = null
  } else {
    // __DEV__

    // __PRO__
    // 执行 class 组件的 render 函数获取更新后的 chidlren
    nextChildren = instance.render()
  }

  // 将wip的工作标记为已完成
  workInProgress.effectTag |= EffectTag.PerformedWork

  if (current !== null && didCaptureError) {
    // 强制Unmount并且重新调和
    // forceUnmountCurrentAndReconcile()
  } else {
    reconcileChildren(
      current,
      workInProgress,
      nextChildren,
      renderExpiration
    )
  }
  return workInProgress.child
}


// 放弃之前已经完成的工作
export function bailoutOnAlreadyFinishedWork (
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: number
): Fiber | null {
  // 取消计时器
  // cancelWorkTimer(workInProgress)

  // dependency 以 current 为准
  if (current !== null) {
    // 复用之前的depoendencies
    workInProgress.dependencies = current.dependencies
  }

  // const updateExpirationTime = workInProgress.expirationTime
  
  // 放弃工作之前需要检查在 children 中是否有存在的工作
  const childExpirationTime = workInProgress.childExpirationTime
  if (childExpirationTime < renderExpirationTime) {
    // 说明 children 中也没有工作，我们可以直接跳过他们
    return null
  } else {
    // 子树中存在工作，克隆这些 child 节点然后继续
    cloneChildFibers(current, workInProgress)
    return workInProgress.child
  }
}

export function updateHostRoot (
  current: Fiber,
  workInProgress: Fiber,
  renderExpirationTime: number
) {
  // 执行上下文!important
  pushHostRootContext(workInProgress)
  // 更新队列
  const updateQueue = workInProgress.updateQueue
  const nextProps = workInProgress.pendingProps
  // const prevState = workInProgress.memorizedState
  // const prevChildren = prevState !== null ? prevState.element : null

  // 遍历所有队列，计算出fiber节点的最终状态
  processUpdateQueue(
    workInProgress,
    updateQueue as UpdateQueue<any>,
    nextProps,
    null,
    renderExpirationTime
  )
  const nextState = workInProgress.memorizedState
  const nextChildren = nextState.element
  // if (nextChildren === prevChildren) {
    // 如果children地址没有发生变化

    // @todo
    // resetHydrationState()
    // bailoutOnAlreadyFinishedWork(
    //   current,
    //   workInProgress,
    //   renderExpirationTime
    // )
  // }

  // fiberRoot
  const root: FiberRoot = workInProgress.stateNode as FiberRoot
  if (root.hydrate) {
    // @todo
    // 如果需要hydrate
  } else {
    reconcileChildren(
      current,
      workInProgress,
      nextChildren,
      renderExpirationTime
    )
    // @todo
    // resetHydrationState
  }
  return workInProgress.child
}

// mount 不定组件
function mountIndeterminateComponent (
  current: Fiber | null,
  workInProgress: Fiber,
  Component: Function,
  renderExpirationTime: number
): null {
  if (current !== null) {
    // 将wip与原fiber进行解绑
    current.alternate = null;
    workInProgress.alternate = null;
    // 计划一个Placement的Tag
    workInProgress.effectTag |= EffectTag.Placement;
  }

  const props = workInProgress.pendingProps
  let context = {}
  // @todo
  // 没懂这里在处理啥
  // if (!disableLegacyContext) {
  //   const unmaskedContext = getUnmaskedContext(
  //     workInProgress,
  //     Component,
  //     false,
  //   );
  //   console.warn('unmaskedContext', unmaskedContext)
  //   context = getMaskedContext(workInProgress, unmaskedContext);
  // }
  

  // @todo
  // prepareToReadContext(workInProgress, renderExpirationTime)
  let value
  // @todo if (__DEV__) {...
  value = renderWithHooks(
    null,
    workInProgress,
    Component,
    props,
    context,
    renderExpirationTime
  )
  // 这个value已经是得到了渲染结果
  workInProgress.effectTag |= EffectTag.PerformedWork
  // if (
  //   isObject(value) &&
  //   value !== null && 
  //   typeof value.render
  // )
  return null
}

// 看了一下好像除了rootFiber的current有
// 后续子节点的current都为null
export function reconcileChildren (
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderExpirationTime: number
) {
  if (isNull(current)) {
    // 说明该组件目前仍然没有fiber实例，还从未被render过
    // 在render之前完全递归调和完所有的子节点，不处理任何的副作用
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderExpirationTime
    )
  } else {
    // 如果当前的child和WIP完全一致，说明我们什么工作都还没开始做
    // 因此我们使用克隆算法来拷贝所有的children

    // 如果有任何已经完成的工作，在这个情况下都是不合理的，需要放弃掉
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      (current as Fiber).child,
      nextChildren,
      renderExpirationTime
    )
  }
}

function pushHostRootContext (workInProgress: Fiber) {
  // 获取fiberRoot
  const root: FiberRoot = workInProgress.stateNode as FiberRoot
  if (root.pendingContext) {
    // 存在全局的上下文对象更新
    // 更新fiber context栈中的上下文
    pushTopLevelContextObject(
      workInProgress,
      root.pendingContext,
      root.pendingContext !== root.context
    )
  } else if (root.context) {
    // 总是应该设置一下的（译）
    pushTopLevelContextObject(
      workInProgress,
      root.context,
      false
    )
  }
  pushHostContainer(workInProgress, root.containerInfo)
}

