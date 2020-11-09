import { disableLegacyContext } from "../common";
import { Fiber } from "./Fiber";
import { createCursor, StackCursor } from "./FiberStack";
import { push } from "./FiberStack";

export const EmptyContextObject = {}

// 一个指针指向当前merged context对象
let contextStackCursor: StackCursor<object> = createCursor(EmptyContextObject)
// 指针指向上下文是否发生了变化
let didPerformWorkStackCursor: StackCursor<boolean> = createCursor(false)
// 跟踪上一个上下文对象
// let previewsContext: object = EmptyContextObject


export function pushTopLevelContextObject (
  fiber: Fiber,
  context: object,
  didChange: boolean
): void {
  if (disableLegacyContext) {
    return 
  } else {
    push(contextStackCursor, context, fiber)
    push(didPerformWorkStackCursor, didChange, fiber)
  }
}