/**
 * 事件的优先级
 */

export type EventPriority = 0 | 1 | 2

// 离散事件
export const DiscreteEvent: EventPriority = 0
// 用户阻塞事件
export const UserBlockingEvent: EventPriority = 1
// 持续事件
export const ContinuousEvent: EventPriority = 2