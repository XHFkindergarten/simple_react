/**
 * Tracing
 * 跟踪记录用户交互
 */

export type Interaction = {
  __count: number,
  id: number,
  name: string,
  timestamp: number
}

export type InteractionsRef = {
  current: Set<Interaction>
}

// 当前被标记过的交互 set
// 新的交互会被添加进去
let interactionsRef: InteractionsRef = {
  current: new Set()
}

export {
  interactionsRef as __interactionsRef
}
