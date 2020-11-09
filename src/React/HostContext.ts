import { Container } from "./common";
import { getChildNameSpace, getRootHostContext } from "./Dom/DomHostConfig";
import { Fiber } from "./Fiber/Fiber";
import { createCursor, pop, push, StackCursor } from "./Fiber/FiberStack";

/**
 * 根Fiber の 上下文
 */

// 空
type NoContextT = {}
const NO_CONTEXT: NoContextT = {}

// 根节点上下文(目前看来是用于namespce的)
export type HostContext = string

// 指向原生实例
let rootInstanceStackCursor: StackCursor<Container | NoContextT> = createCursor(NO_CONTEXT)

// 指向Fiber实例
let contextFiberStackCursor: StackCursor<Fiber | NoContextT> = createCursor(NO_CONTEXT)

// 指向上下文实例
let contextStackCursor: StackCursor<HostContext | NoContextT> = createCursor(NO_CONTEXT)

function pushHostContainer (
  fiber: Fiber,
  nextRootInstance: Container
) {
  // 
  push(rootInstanceStackCursor, nextRootInstance, fiber)
  // 指针指向fiber节点
  push(contextFiberStackCursor, fiber, fiber)
  
  // 最后，我们需要将host context放入栈中。
  // 但是，我们不能直接调用getRootHostContext然后push
  // 因为在render代码中的多个入口中都使用了这个函数
  // 其中的某处可能throw了错误，所以我们先push一个空的值
  // 这能让我们安全的处理这些错误
  // @question
  push(contextStackCursor, NO_CONTEXT, fiber)
  // 获取下一个将要渲染的dom元素的root context(namespace)
  const nextRootContext = getRootHostContext(nextRootInstance)
  pop(contextStackCursor, fiber)
  push(contextStackCursor, nextRootContext, fiber)
}

// 推出顶层容器
function popHostContainer (
  fiber: Fiber
): void {
  pop(contextStackCursor, fiber)
  pop(contextFiberStackCursor, fiber)
  pop(rootInstanceStackCursor, fiber)
}

// 当前reconcile的fiber对应的type改变
// 更新相应的上下文
function pushHostContext(fiber: Fiber) {
  const context: HostContext = requireContext(contextStackCursor.current)
  const nextContext = getChildNameSpace(context, fiber.type as string)

  // 如果没有变化，不需要做任何处理(都是字符串)
  if (nextContext === context) return

  push(contextFiberStackCursor, fiber, fiber)
  push(contextStackCursor, nextContext, fiber)
}

// 推出上下文
function popHostContext(fiber: Fiber): void {
  if (contextFiberStackCursor.current !== fiber) {
    // 如果参数fiber不是当前处理的fiber，不作处理
    return
  }
  pop(contextStackCursor, fiber)
  pop(contextFiberStackCursor, fiber)
}

function getHostContext(): HostContext {
  return requireContext(contextStackCursor.current)
}

function requireContext<Value> (c: Value | NoContextT): Value {
  return c as Value
}

function getRootHostContainer (): Container {
  const rootInstance = requireContext(rootInstanceStackCursor.current)
  return rootInstance
}

export {
  pushHostContext,
  popHostContext,
  getHostContext,
  pushHostContainer,
  getRootHostContainer,
  popHostContainer,
}