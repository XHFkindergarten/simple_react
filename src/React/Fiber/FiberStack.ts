import { Fiber } from "./Fiber"

/**
 * Fiber Stack
 * 执行栈
 */
export type StackCursor<T> = {
  current: T
}

// 用一个数组来存储所有的指针指向的value
const valueStack: any[] = []

// __DEV__下要另外记录一个fiber栈
// let fiberStack: Array<Fiber|null> = []

let index = -1

// 创建一个指针
export function createCursor<T>(defaultValue: T): StackCursor<T> {
  return {
    current: defaultValue
  }
}

// 栈是否为空
export function isEmpty () {
  return index === -1
}

// 进栈操作
export function push<T> (
  cursor: StackCursor<T>,
  value: T,
  fiber: Fiber
): void {
  // 计数 + value存储
  valueStack[++index] = value

  cursor.current = value
}

// 出栈操作
export function pop<T> (
  cursor: StackCursor<T>,
  fiber: Fiber
): void {
  if (index < 0) return
  // 这里比较奇怪的就是指针的current会自动指向被pop出来的节点
  cursor.current = valueStack[index]
  valueStack[index--] = null
}
