import { cancelTimeout, EffectTag, ExcutionContext, ExpirationTime, Mode, NoTimeout, ReactPriorityLevel, WorkTag } from "../common";
import { createWorkInProgress, Fiber } from "../Fiber/Fiber";
import { FiberRoot, isRootSuspendedAtTime, markRootFinishedAtTime, markRootUpdateAtTime } from "../Fiber/FiberRoot";
import { unwindInterruptedWork } from "../FiberUnwindWork";
import { flushSyncCallbackQueue, getCurrentPriorityLevel, now, runWithPriority, scheduleCallback, scheduleSyncCallback } from "../ScheduleReactLayer";
import { beginWork } from './BeginWork'
import { isNull } from "../utils";
import { completeWork } from "./CompleteWork";
import { commitPlacement, commitWork } from "./CommitWork";
import { computeSuspenseExpiration, expirationTimeToMs, msToExpirationTime } from "../Fiber/FiberExpiration";
import { SuspenseConfig } from "../Fiber/FiberSuspenseConfig";
import { __interactionsRef } from "../Scheduler/Tracing";
import { inferPriorityFromExpirationTime, LOW_PRIORITY_EXPIRATION } from "../Fiber/FiberExpirationTime";
import ReactCurrentDispatcher from "../React/ReactCurrentDispatcher";
import { ContextOnlyDispatcher } from "../Fiber/FiberHooks";
import { Dispatcher } from "../React/ReactFiberHooks";

// 调和结束的时候根节点状态
enum RootExitStatus {
  RootImcomplete = 0,
  RootFatalError = 1,
  RootErrored = 2,
  RootSuspended = 3,
  RootSuspendedWithDelay = 4,
  RootCompleted = 5,
  RootLocked = 6
}

// 执行上下文
// 用于描述我们当前处于react执行栈的哪个位置
let excutionContext: ExcutionContext = ExcutionContext.NoContext

// 假设render所需要的时间
let renderExpirationTime = ExpirationTime.NoWork

// 当前fiberRoot是complete、error还是suspended状态
let workInProgressRootExitStatus: RootExitStatus = RootExitStatus.RootImcomplete

// 当前的effect链表
let nextEffect: Fiber | null = null

// 有离散更新的 fiberRoot set
let rootsWithPendingDiscreteUpdates: Map<FiberRoot, number> | null = null

// 是否有被动的 effect
let rootDoesHavePassiveEffects: boolean = false


// pending状态的被动effect
// let pendingPassiveEffectsRenderPriority: ReactPriorityLevel.NoPriority
// let pendingPassiveEffectsExpirationTime: ExpirationTime = ExpirationTime.NoWork

// 指向我们正在处理的root
let workInProgressRoot: FiberRoot | null = null

// 指向我们当前正在工作的fiber
let workInProgress: Fiber | null = null

// 换句话说，因为过期时间决定了 update 被 batched 的方式
// 我们希望同一事件中发生的所有更新都得到同一过期时间
// 因此，我们用一个变量来记录当前事件的时间
let currentEventTime: number = ExpirationTime.NoWork

/**
 * 获取当前时间
 */
export function requestCurrentTime () {
  if ((excutionContext & (ExcutionContext.RenderContext | ExcutionContext.CommitContext)) !== ExcutionContext.NoContext) {
    // 如果当前处于 render 阶段 或者 commit 阶段
    // 可以直接读取真实的事件(why)
    return msToExpirationTime(now())
  }
  // 不处于 React 处理阶段，所以可能处于一个浏览器事件中
  if (currentEventTime !== ExpirationTime.NoWork) {
    // 返回这个事件所处的时间
    return currentEventTime
  }
  // 这是 React yielded 之后的第一次 update, 计算一个新的开始时间
  currentEventTime = msToExpirationTime(now())
  return currentEventTime
}



// 为Fiber计算它的任务优先级
export function computeExpirationForFiber (
  currentTime: number,
  fiber: Fiber,
  suspenseConfig: null | SuspenseConfig
): number {
  const mode = fiber.mode

  // 如果不是batch模式（说明为Sync模式，直接返回同步expiration时间
  if ((mode & Mode.BatchedMode) === Mode.NoMode) {
    return ExpirationTime.Sync
  }

  // 获取当前scheduler中的currentPriorityLevel
  const priorityLevel = getCurrentPriorityLevel()
  
  // 如果不是并发模式（啥是并发模式？？？
  if ((mode & Mode.ConcurrentMode) === Mode.NoMode) {
    return priorityLevel === ReactPriorityLevel.ImmediatePriority ? ExpirationTime.Sync : ExpirationTime.Batched
  }

  // 如果当前不处于render中，返回render所需的expirationTime
  if ((excutionContext & ExcutionContext.RenderContext) !== ExcutionContext.NoContext) {
    return renderExpirationTime
  }

  let expirationTime
  
  if (suspenseConfig !== null) {
    // 如果有suspense的话，根据suspenseConfig来计算一个过期时间
    expirationTime = computeSuspenseExpiration(
      currentTime,
      suspenseConfig.timeoutMs | 0 || LOW_PRIORITY_EXPIRATION
    )
  }
  return expirationTime
}

/**
 * batchedUpdates 
 * 根据时间片合并状态
 * A, R 执行函数的参数和返回值
 * fn: 要执行的函数
 * a: 可选的参数
 */
export function batchedUpdate<A, R> (fn: (A) => R, a: A): R {
  let prevExcutionContext = excutionContext
  // 将当前的执行上下文设置为batched上下文
  excutionContext |= ExcutionContext.BatchedContext

  // 执行任务
  try {
    return fn(a)
  } finally {
    excutionContext = prevExcutionContext
    // 如果当前没有其他工作，立即执行回调
    if (excutionContext === ExcutionContext.NoContext) {
      flushSyncCallbackQueue()
    }
  }
}

export function batchedEventUpdates<A, R>(
  fn: (a: A) => R,
  a: A
): R {
  const prevExcutionContext = excutionContext
  excutionContext |= ExcutionContext.EventContext
  try {
    return fn(a)
  } finally {
    excutionContext = prevExcutionContext
    if (excutionContext === ExcutionContext.NoContext) {
      flushSyncCallbackQueue()
    }
  }
}

/**
 * 离散事件 Update
 * @param fn 
 * @param a 
 */
export function discreteUpdate<A, B, C, R>(
  fn: (A, B, C) => R,
  a: A,
  b: B,
  c: C
): R {
  const prevExcutionContext = excutionContext
  // 混入离散事件上下文
  excutionContext |= ExcutionContext.DiscreteEventContext
  try {
    return runWithPriority(ReactPriorityLevel.UserBlockingPriority, fn.bind(null, a, b, c))
  } finally {
    excutionContext = prevExcutionContext
    if (excutionContext === ExcutionContext.NoContext) {
      // 执行回调
      flushSyncCallbackQueue()
    }
  }
}

/**
 * 不需要合并状态的同步（初次）渲染
 * A 内部执行函数需要的参数类型
 * R 内部执行函数需要返回的类型
 * fn: 内部执行函数
 * a: 用于fn的参数
 */
export function unbatchedUpdate<A, R>(
  fn: (A) => R,
  a?: A
): R {
  // 首先通过位操作确保当前执行上下文不是batch上下文
  const prevExcutionContext = excutionContext
  excutionContext &= ~ExcutionContext.BatchedContext

  // 混入unbatch上下文
  excutionContext |= ExcutionContext.LegacyUnbatchedContext
  
  try {
    return fn(a)
  } finally {
    excutionContext = prevExcutionContext
    // 如果没有其他工作，立刻执行回调
    if (excutionContext === ExcutionContext.NoContext) {
      flushSyncCallbackQueue()
    }
  }
}

// 执行Fiber上的update任务
function ScheduleUpdateOnFiber (
  current: Fiber,
  expirationTime: number
) {
  // 根据 workFiber 的过期时间自下而上逐个标记父节点的 expirationTime
  const root = markUpdateTimeFromFiberToRoot(current, expirationTime)

  // 获取当前 fiber 的运行优先级
  const priority = getCurrentPriorityLevel()

  if (expirationTime === ExpirationTime.Sync) {
    // 同步任务
    if (
      // 如果是unbatch
      (excutionContext & ExcutionContext.LegacyUnbatchedContext) !== ExcutionContext.NoContext &&
      // 且未处于render和commit当中
      (excutionContext & (ExcutionContext.RenderContext | ExcutionContext.CommitContext)) === ExcutionContext.NoContext
    ) {
      // 满足上述条件，说明当前正在执行优先级最高的同步渲染任务

      // 开始同步构建 fiber 树
      performSyncWorkOnRoot(root)
    } else {
      ensureRootIsScheduled(root)
      if (excutionContext === ExcutionContext.NoContext) {
        flushSyncCallbackQueue()
      }
    }
  } else {
    ensureRootIsScheduled(root)
  }
  if (
    // 当前处于一个离散事件上下文
    (excutionContext & ExcutionContext.DiscreteEventContext) !== ExcutionContext.NoContext &&
    (priority === ReactPriorityLevel.UserBlockingPriority || priority === ReactPriorityLevel.ImmediatePriority)
  ) {

    if (rootsWithPendingDiscreteUpdates === null) {
      rootsWithPendingDiscreteUpdates = new Map([[ root, expirationTime ]])
    } else {
      // 获取最后一次离散事件的过期时间
      const lastDiscreteTime = rootsWithPendingDiscreteUpdates.get(root)
      if (lastDiscreteTime === undefined || lastDiscreteTime > expirationTime) {
        // 没有过期时间 或者 过期时间变短了，更新
        rootsWithPendingDiscreteUpdates.set(root, expirationTime)
      }
    }
  }
}
/**
 * 更新fiber节点及其所有上级节点的expiration time
 */
// 翻译：这个步骤被分割成一个单独的函数
// 这样我们可以标记一个包含了挂起工作的Fiber
// 而不是一定要执行更新
export function markUpdateTimeFromFiberToRoot(
  fiber: Fiber,
  expirationTime: number
): FiberRoot {
  // 更新root fiber的expirationTime
  if (fiber.expirationTime < expirationTime) {
    // fiber的expirationTime取较大值
    fiber.expirationTime = expirationTime
  }

  // 过期时间也同步到WIP
  let alternate = fiber.alternate
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime
  }
  /* 算法部分 沿着fiber架构向上回溯，更新沿途祖先fiber节点的expiration time */
  let node = fiber.return
  let root: FiberRoot | null = null
  if (node === null && fiber.tag === WorkTag.HostRoot) {
    // 回到根节点
    root = fiber.stateNode
  } else {
    while(node !== null) {
      // 同时也更新
      alternate = node.alternate
      // 从当前 fiber 向上 更新父级的 childExpirationTime
      if (node.childExpirationTime < expirationTime) {
        node.childExpirationTime = expirationTime
        // 如果父级元素有 wip ，一同更新
        if (
          alternate !== null &&
          alternate.childExpirationTime < expirationTime
        ) {
          alternate.childExpirationTime = expirationTime
        }
      } else if (
        alternate !== null &&
        alternate.childExpirationTime < expirationTime
      ) {
        alternate.childExpirationTime = expirationTime
      }
      // 已经到达根 fiber 节点
      if (node.return === null && node.tag === WorkTag.HostRoot) {
        root = node.stateNode
        break
      } 
      node = node.return
    }
  }

  if (root !== null) {
    if (workInProgressRoot === root) {
      // @todo
    }
    markRootUpdateAtTime(root, expirationTime)
  }

  return root as any
}

// 提交reconcile成果
function commitRoot (root: FiberRoot): null {
  const renderPriorityLevel = getCurrentPriorityLevel()
  runWithPriority(
    ReactPriorityLevel.ImmediatePriority,
    commitRootImpl.bind(null, root, renderPriorityLevel)
  )
  return null
}

// 提交根实例(dom)到浏览器真实容器root中
function commitRootImpl (
  root: FiberRoot,
  renderPriorityLevel: ReactPriorityLevel
) {
  // 刷新被动的effect
  // flushPassiveEffects()

  const finishedWork = root.finishedWork
  const expirationTime = root.finishedExpirationTime
  if (finishedWork === null) {
    return null
  }

  root.finishedWork = null
  root.finishedExpirationTime = ExpirationTime.NoWork

  // commitRoot操作是没有停止和继续的，它总是异步完成的
  // 所以我们可以清除这些数据来允许一个新的callback被Schedule
  root.callbackNode = null
  root.callbackExpirationTime = ExpirationTime.NoWork
  root.callbackPriority = ReactPriorityLevel.NoPriority
  root.nextKnownPendingLevel = ExpirationTime.NoWork

  // startCommitTimer() 这个应该是dev下的

  // remainingExpirationTimeBeforeCommit

  const remainingExpirationTime = getRemainingExpirationTime(finishedWork)
  
  // 更新fiberRoot中的完成时间，后续更新时会用到 lastExpiredTime
  markRootFinishedAtTime (
    root,
    expirationTime,
    remainingExpirationTime
  )

  if (root === workInProgressRoot) {
    // 初次渲染不会执行这个block，因为finishSyncRender中已经将这个值设为了null
    workInProgressRoot = null
    workInProgress = null
    renderExpirationTime = ExpirationTime.NoWork
  } else {
    // 如果这两者不一致，说明上一次我们操作的root和这次commit的root不是同一个
  }

  // 获取effects链表
  let firstEffect
  // if (finishedWork.effectTag > EffectTag.PerformedWork) {
  //   // 一个fiber的effect链表只能包含它的子fiber，而不能是fiber本身
  //   // 所以如果根节点有一个effect,我们需要将它添加到链表的末尾
  //   if (finishedWork.lastEffect !== null) {
  //     // 如果根节点有effect，添加到链表末尾取链表头部
  //     finishedWork.lastEffect.nextEffect = finishedWork
  //     firstEffect = finishedWork.firstEffect
  //   } else {
  //     // 如果没有effect，那么finishedWork就是唯一的effect
  //     firstEffect = finishedWork
  //   }
  // } else {

  // 根节点上没有effect
  firstEffect = finishedWork.firstEffect
  // }
  if (firstEffect !== null) {
    const prevExecutionContext = excutionContext
    // 执行上下文加入Commit
    excutionContext |= ExcutionContext.CommitContext

    // 清空当前的Owner
    // ReactCurrentOwner.current = null

    // commit阶段被分成了几个小阶段
    // 我们在每个阶段都会遍历effect list
    // 所有的突变effect都会在layout effect?之前

    // 第一阶段是 before mutation
    // 我们使用这个阶段阅读整个tree的state
    // 生命周期 getSnapshotBeforeUpdate也是在这里出发

    // @todo
    // startCommitSnapshotEffectsTimer()
    // prepareForCommit(root.containerInfo)
    

    // 将firstEffect
    nextEffect = firstEffect

    while(nextEffect !== null) {
      try {
        // @todo
        // effect的第一次循环
        // 1. 在class组件中通过prevState,prevProps获取组件快照，用于componentDidUpdate
        // 2. 只有在fiber为class component时才工作
        // commitBeforeMutationEffects()
        nextEffect = nextEffect.nextEffect
      } catch (err) {
        throw new Error(err)
      }
    }

    // @todo
    // commit 后重置一些变量，例如在 commit 期间是不处理浏览器事件的
    // resetAfterCommit(root.containerInfo)

    // 再次赋值
    nextEffect = firstEffect

    // effect的第二次循环
    // 根据fiber的effectTag，执行不同的操作(插入，更新，删除)
    while (nextEffect !== null) {
      try {
        // @todo
        commitMutationEffects(root, renderPriorityLevel)
      } catch(err) {
        throw new Error(err)
      }
    }

    // 在 commit Mutation 阶段之后，workInProgress tree 已经是真实 Dom 对应的树了
    // 所以之前的 tree 仍然是 componentWillUnmount 阶段的状态，但是在 layout phase 之前
    // 所以 finishedWork 要作为现在的 current
    root.current = finishedWork


    // 下一阶段成为 layout phase 布局阶段
    // 由于遗留原因，类组件的生命周期也在这里被调用

    // @todo
    // startCommitLifeCyclesTimer()

    // 重新指向第一个 effect
    nextEffect = firstEffect

    while(nextEffect !== null) {
      try {
        commitLayoutEffects(root, expirationTime)
      } catch (error) {
        console.error('commitLayoutEffects error', error)
        nextEffect = nextEffect.nextEffect
      }
    }

    // @todo
    // stopCommitLifeCyclesTimer()

    nextEffect = null

    // important
    // 通知 Scheduler 在当前帧的结尾处 yield ,这样浏览器能够将线程交给绘画引擎
    // requestPaint()

    excutionContext = prevExecutionContext
  } else {
    // @todo
  }

  const rootDidHavePassiveEffects = rootDoesHavePassiveEffects
  if (rootDidHavePassiveEffects) {
    // @todo
  } else {
    // 我们已经完成了 effect 链表的工作，所以清除 nextEffect 指针来帮助 GC (garbage collection)
    // 如果还有 passive effect, 我们会在 flushPassiveEffects 中清除
    nextEffect = firstEffect
    while (nextEffect !== null) {
      // 不断释放指向下一个链表节点的指针
      const nextNextEffect = nextEffect.nextEffect
      nextEffect.nextEffect = null
      nextEffect = nextNextEffect
    }
  }

  // @todo 检查这个 root 上是否还有遗留的工作
  // const remainingExpirationTime = root.firstPendingTime
  // if (remainingExpirationTime !== ExpirationTime.NoWork) {

  // } else {
  //   legacyErrorBoundariesThatAlreadyFailed = null;
  // }

  // @todo 好像是 DEV 下的调试需要
  // onCommitRoot(finishedWork.stateNode, expirationTime)

  // 每次在结束 commitRoot 之前调用这个函数，来确定任何其他的工作都已经被 Schedule 了


  flushSyncCallbackQueue()
  return null
}


// important
// 使用这个函数为根节点调度任务，每个根节点只有一个任务
// 如果这个任务已经被 schedule 了，我们就要确认现在任务的expirationTime
// 和下个 fiber 的expirationTime 是一样的
function ensureRootIsScheduled(root: FiberRoot) {
  const lastExpiredTime = root.lastExpiredTime
  if (lastExpiredTime !== ExpirationTime.NoWork) {
    return
  }

  const expirationTime = getNextRootExpirationTimeToWorkOn(root)
  const existingCallbackNode = root.callbackNode
  if (expirationTime === ExpirationTime.NoWork) {
    // 没有什么需要做的
    if (existingCallbackNode !== null) {
      // 重置 这个什么 callbackNode
      root.callbackNode = null
      root.callbackExpirationTime = ExpirationTime.NoWork
      root.callbackPriority = ReactPriorityLevel.NoPriority
    }
    return
  }
  // 获取当前脚本时间
  const currentTime = requestCurrentTime()
  const priorityLevel = inferPriorityFromExpirationTime(currentTime, expirationTime)

  // 如果有一个已经存在的 render task
  // 确认它的优先级和过期时间，否则，取消掉然后 schedule 一个新的
  if (existingCallbackNode) {
    // @todo
  }

  root.callbackExpirationTime = expirationTime
  root.callbackPriority = priorityLevel

  let callbackNode
  if (expirationTime === ExpirationTime.Sync) {
    // @todo
    callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
  } else {
    callbackNode = scheduleCallback(
      priorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
      { timeout: expirationTimeToMs(expirationTime) - now()}
    )
  }

  root.callbackNode = callbackNode
}

// 处理并发的工作
function performConcurrentWorkOnRoot (root, didTimeout) {
  // todo
}


// 获取下一个 root 的过期时间
function getNextRootExpirationTimeToWorkOn (root: FiberRoot): number {
  const lastExpiredTime = root.lastExpiredTime
  if (lastExpiredTime !== ExpirationTime.NoWork) {
    return lastExpiredTime
  }

  const firstPendingTime = root.firstPendingTime
  if (!isRootSuspendedAtTime(root, firstPendingTime)) {
    return firstPendingTime
  }

  // @todo
  const lastPingedTime = root.lastPingedTime
  const nextKnownPendingLevel = root.nextKnownPendingLevel
  return lastPingedTime > nextKnownPendingLevel
    ? lastPingedTime
    : nextKnownPendingLevel
}

function commitLayoutEffects (
  root: FiberRoot,
  committedExpirationTime: number
) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag

    if (effectTag & (EffectTag.Update | EffectTag.Callback)) {
      // 如果有 更新 或者 回调 effect
    }

    if (effectTag & EffectTag.Ref) {
      // @todo
      // commitAttachRef(nextEffect)
    }

    nextEffect = nextEffect.nextEffect
  }
}

// 真正改写文档中dom的函数
// 提交fiber effect
function commitMutationEffects (
  root: FiberRoot,
  renderPriorityLevel: number
) {
  while (nextEffect !== null) {
    // 当前fiber的tag
    const effectTag = nextEffect.effectTag
    // 如果有contentReset的需求
    if (effectTag & EffectTag.ContentReset) {
      // commitResetTextContext(nextEffect)
    }
    if (effectTag & EffectTag.Ref) {
      // @todo
    }

    // 下方的switch语句只处理Placement,Deletion和Update
    const primaryEffectTag = effectTag & (
      EffectTag.Placement |
      EffectTag.Update |
      EffectTag.Deletion | 
      EffectTag.Hydrating
    )
    switch (primaryEffectTag) {
      case EffectTag.Placement: {
        commitPlacement(nextEffect)
        // effectTag 完成实名制后，要将对应的 effect 去除
        nextEffect.effectTag &= ~EffectTag.Placement
      }
      case EffectTag.Update: {
        const current = nextEffect.alternate
        commitWork(current, nextEffect)
      }
    }

    nextEffect = nextEffect.nextEffect
  }
}



// 完成同步模式下的render
function finishSyncRender (
  root: FiberRoot,
  exitStatus: any,
  expirationTime: number
): void {
  if (exitStatus === RootExitStatus.RootLocked) {
    // markRootSuspendedAtTime(root, expirationTime)
  } else {
    workInProgressRoot = null

    // 提交根节点!
    commitRoot(root)
  }
}

// 将同步渲染工作作用与原生dom
function performSyncWorkOnRoot (root: FiberRoot) {
  // 获取 fiberRoot 的最新 expiredTime
  const lastExpiredTime = root.lastExpiredTime
  // 对于初次渲染而言,expiredTime为0,所以需要赋值为Sync
  const expirationTime = lastExpiredTime !== ExpirationTime.NoWork ? lastExpiredTime : ExpirationTime.Sync
  if (root.finishedExpirationTime === expirationTime) {
    // 如果完成时间和过期时间一致，说明已经计算完成，可以commit
    console.warn('should commitRoot')
    // commitRoot(root)
  } else {
    // 如果我们处理的 fiberRoot 和 expirationTime 已经改变了
    // 说明当前已经有了新的工作
    // 重置几个工作变量以及新生成一个纯净的 workInProgress
    if (
      root !== workInProgressRoot
      || expirationTime !== renderExpirationTime
    ) {
      // 准备空的执行栈
      // 创建一个 current 的副本 workInProgress
      // 所有的 fiber 操作都是在 workInProgress 中进行
      prepareFreshStack(root, expirationTime)
    }
    // 如果我们有一个WIP，意味着存在工作要做
    if (workInProgress !== null) {
      const prevExcutionContext = excutionContext
      // 在当前上下文中混入 render 上下文
      excutionContext |= ExcutionContext.RenderContext

      // 在执行更新前先 push 一个占位的空 dispatcher 进栈
      // 以防找不到 setState 等函数
      const prevDispatcher = pushDispatcher(root)

      // 不间断的同步工作，完全不考虑时间片
      workLoopSync()

      excutionContext = prevExcutionContext
      // dispatcher 出栈
      popDispatcher(prevDispatcher)

      if (workInProgress !== null) {
        // 理论上 workInProgress 不是 null 是无法跳出之前的循环的
        // 属于非法情况
      } else {
        // 将完成调和后的 wip 设为 fiberRoot 的已完成工作
        root.finishedWork = root.current.alternate
        
        root.finishedExpirationTime = expirationTime

        // 完成真实Dom的组装
        finishSyncRender(root, workInProgressRootExitStatus, expirationTime)
      }
      // 结束之前，确认是否整个 root 已经完全处理完毕，有的话会继续执行 workLoop
      ensureRootIsScheduled(root)
    }
  }
  
  return null
}

// dispatcher 进栈
function pushDispatcher (root: FiberRoot) {
  const prevDispatcher = ReactCurrentDispatcher.current
  // 推入一个占位 dispatcher，防止为空
  ReactCurrentDispatcher.current = ContextOnlyDispatcher
  if (prevDispatcher === null) {
    return ContextOnlyDispatcher
  }
  return prevDispatcher
}

// dispatcher 出栈，还原成执行 workLoop 之前的 dispatcher
function popDispatcher (prevDispatcher: Dispatcher) {
  ReactCurrentDispatcher.current = prevDispatcher
}


// reset执行栈
export function prepareFreshStack (
  root: FiberRoot,
  expirationTime: number
) {
  // 重置根节点的finishWork
  root.finishedWork = null
  root.finishedExpirationTime = ExpirationTime.NoWork

  // timeoutHandle是计时器的回调id
  const timeoutHandle = root.timeoutHandle

  // 如果存在timeoutHandle
  if (timeoutHandle !== NoTimeout) {
    // 之前的root可能创造了一个setTimeout来commit一个state更新
    // 现在我们已经有了额外的工作，所以需要取消掉
    root.timeoutHandle = NoTimeout
    cancelTimeout(timeoutHandle)
  }

  if (workInProgress !== null) {
    // 如果已经存在了WIP，向上找到它的root fiber
    let interruptedWork = workInProgress.return
    while (interruptedWork !== null) {
      // @todo important unwindInterruptedWork // 放弃执行栈任务
      unwindInterruptedWork(interruptedWork)
      interruptedWork = interruptedWork.return
    }
  }
  workInProgressRoot = root
  workInProgress = createWorkInProgress(root.current, null, expirationTime)
  renderExpirationTime = expirationTime
  workInProgressRootExitStatus = RootExitStatus.RootImcomplete
}
// 同步的workLoop
function workLoopSync () {
  // 只要没有完成reconcile就一直执行
  while(workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress as Fiber)
  }
}

/**
 * core function
 * 深度遍历fiber节点
 */
function performUnitOfWork (workFiber: Fiber): Fiber | null {
  // 当前暴露出来的 alternate 对象
  // 但是通过使用它意味着我们可以再 diff 时直接进行读写（空间换时间）
  const current = workFiber.alternate

  // 打工函数
  let next = beginWork(current, workFiber, renderExpirationTime)
  // 将处理完毕的 props 设置为已完成的
  workFiber.memorizedProps = workFiber.pendingProps
  if (next === null) {
    // 每一次 performUnitOfWork 都只处理一个 fiber
    // 但是当 next 为 null 时，说明已经到了 fiber 树的叶子节点
    // 这个时候就可以开始执行收尾工作
    next = completeUnitOfWork(workFiber)
  }

  return next
}


// 清除一些被动的effect
// export function flushPassiveEffects () {
//   if (pendingPassiveEffectsRenderPriority !== ReactPriorityLevel.NoPriority) {
//     // 如果被动effect的优先级不为NoPriority（说明存在passive effect）
//     // 保证其优先级不高于NormalPriority
//     const priorityLevel =
//       pendingPassiveEffectsRenderPriority > ReactPriorityLevel.NormalPriority ?
//       ReactPriorityLevel.NormalPriority :
//       pendingPassiveEffectsRenderPriority
//     // 重置pendingPassiveEffectRenderPriority
//     pendingPassiveEffectsRenderPriority = ReactPriorityLevel.NoPriority
    
//     // 运行
//     runWithPriority(priorityLevel, () => {})
//   }
// }

// 当完成了reconcile工作后
function completeUnitOfWork (unitOfWork: Fiber): Fiber | null {
  // 尝试完成当前Unit，然后移动到sibling节点。如果没有sibling，移动到return节点
  workInProgress = unitOfWork
  // 这个while循环是向上回溯的过程，直至回到RootFiber的return
  do {
    const current = workInProgress.alternate
    const returnFiber = workInProgress.return

    let next

    // 检查工作结束的原因是完成了还是抛出了异常
    if ((workInProgress.effectTag & EffectTag.Incomplete) === EffectTag.NoEffect) {

      // 如果没有抛出错误
      next = completeWork(current, workInProgress, renderExpirationTime)
      // 重置所有子元素的过期时间
      resetChildExpirationTime(workInProgress)

      if (next !== null) {
        // 如果在completeWork之后next仍然不为null，
        // 那么在下一个unitOfWork中去处理它
        return next
      }
      if (
        // 如果还有父级节点，且父级节点的EffectTag并未标记为Complete
        returnFiber !== null &&
        (returnFiber.effectTag & EffectTag.Incomplete) === EffectTag.NoEffect
      ) {
        // 将子树的所有effect和这个fiber都放进父节点的effect链表中
        // 子树们完成的顺序影响着side effect的顺序
        if (returnFiber.firstEffect === null) {
          returnFiber.firstEffect = workInProgress.firstEffect
        }
  
        if (workInProgress.lastEffect !== null) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress.lastEffect
          }
          returnFiber.lastEffect = workInProgress.lastEffect
        }
  
        const effectTag = workInProgress.effectTag

        // 对于 effectTag 中 > PerformedWork(1) 的节点，说明已经调和完毕
        // 将当前的 workInProgress 作为 effect 绑定到 fiber 上
        if (effectTag > EffectTag.PerformedWork) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress
          } else {
            returnFiber.firstEffect = workInProgress
          }
          returnFiber.lastEffect = workInProgress
        }
      }
    } else {
      // 这个fiber没能完成工作因为抛出了某些异常，如果这是一个错误边界boundary,捕获它
      // const next = unwindWork
    }

    // 兄弟Fiber
    const siblingFiber = workInProgress.sibling
    // 如果存在兄弟节点，下一个unitOfWork就处理兄弟节点
    if (!isNull(siblingFiber)) {
      return siblingFiber
    }
    // 如果不存在兄弟节点了，那么向root逐层处理
    workInProgress = returnFiber
  } while (workInProgress !== null)

  // 将根节点的结束状态标记为完成
  if (workInProgressRootExitStatus === RootExitStatus.RootImcomplete) {
    workInProgressRootExitStatus = RootExitStatus.RootCompleted
  }
  return null
}

function resetChildExpirationTime (completeWork: Fiber) {
  if (renderExpirationTime !== ExpirationTime.Never && completeWork.childExpirationTime === ExpirationTime.Never) {
    return
  }

  let newChildExpirationTime = ExpirationTime.NoWork

  // 向下获取最短的 expirationTime
  let child = completeWork.child
  while (child !== null) {
    const childUpdateExpirationTime = child.expirationTime
    const childChildExpirationTime = child.childExpirationTime
    if (childUpdateExpirationTime > newChildExpirationTime) {
      newChildExpirationTime = childUpdateExpirationTime
    }
    if (childChildExpirationTime > newChildExpirationTime) {
      newChildExpirationTime = childChildExpirationTime
    }
    child = child.sibling
  }
  completeWork.childExpirationTime = newChildExpirationTime
}


/**
 * 计算剩余的过期时间
 */
function getRemainingExpirationTime (
  fiber: Fiber
): number {
  const updateExpirationTime = fiber.expirationTime
  const childExpirationTime = fiber.childExpirationTime
  // 获取当前 fiber 和子 fiber 中比较小的那个 expirationTime
  return updateExpirationTime > childExpirationTime
    ? updateExpirationTime
    : childExpirationTime
}


export {
  ScheduleUpdateOnFiber as ScheduleWork
}


