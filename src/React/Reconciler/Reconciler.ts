import { ReactElement } from "../common";
import { getCurrentTime } from '../Scheduler'

import { FiberRoot } from '../Fiber/FiberRoot'
import { computeExpirationForFiber, ScheduleWork } from "./WorkLoop";
import { EmptyContextObject } from "../Fiber/FiberContext";
import { Fiber } from "../Fiber/Fiber";
import { createUpdate, enqueueUpdate } from "../UpdateQueue";
import { SuspenseConfig } from "../Fiber/FiberSuspenseConfig";

const requestCurrentSuspenseConfig = () => null

export function getContextForSubtree (
  parentComponent: any
) {
  if (!parentComponent) {
    return EmptyContextObject
  }
  // @todo 从父级组件中获取Context上下文渲染到子组件
  // 现在还不太清楚，暂定为{}好了
  return {}
}

export function updateContainer (
  element: ReactElement,
  fiberRoot: FiberRoot,
  parentComponent?: any,
  callback?: Function
  // FiberRootcontainer: FiberRoot,
  // expirationTime: ExpirationTime,
  // suspenseConfig: null | SuspenseConfig,
  // parentComponent?: ReactComponentElement<any, any>,
) {
  // 获取当前的顶层fiber节点
  const current = fiberRoot.current
  // 获取当前的time
  const currentTime = getCurrentTime()

  // @todo 现在还不知道是干嘛的
  const suspenseConfig = requestCurrentSuspenseConfig()

  // 计算过期时间
  const expirationTime = computeExpirationForFiber(
    currentTime,
    current,
    suspenseConfig
  )

  updateContainerAtExpirationTime(
    element,
    fiberRoot,
    parentComponent,
    expirationTime,
    suspenseConfig
  )
}

export function updateContainerAtExpirationTime (
  element: ReactElement,
  container: FiberRoot,
  parentComponent: any,
  expirationTime: number,
  suspenseConfig: SuspenseConfig | null,
  callback?: Function
) {
  // 当前fiber节点
  const current = container.current

  // @todo DEV模式调用devtool

  // @todo
  const context = getContextForSubtree(parentComponent)
  if (container.context === null) {
    // 如果当前fiberRoot没有上下文直接更新
    container.context = context
  } else {
    // 如果已有上下文在下次更新时更新上下文
    container.pendingContext = context
  }
  return ScheduleRootUpdate(
    current,
    element,
    expirationTime,
    suspenseConfig,
    callback
  )
}

// 更新根节点
export function ScheduleRootUpdate (
  current: Fiber,
  element: ReactElement,
  expirationTime: number,
  suspenseConfig: SuspenseConfig | null,
  callback?: Function
) {
  // update终于来了，创建一个update实例
  const update = createUpdate(expirationTime, suspenseConfig)
  // 唯一的参数就是react element
  update.payload = {
    element
  }
  // @todo 目前还未知这个处理的意义
  callback = callback === undefined ? null : callback as any

  // 将更新任务安排进入队列
  enqueueUpdate(
    current,
    update
  )

  ScheduleWork(
    current,
    expirationTime
  )
}
