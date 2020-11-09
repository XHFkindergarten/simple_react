/**
 * 时间管理
 */
export const Sync = 0

const MAX_SIGNED_31_BIT_INT = 1073741823 // Math.pow(2, 30) - 1

// 完成工作需要的时间
export enum ExpirationTime {
  NoWork = 0,
  Never = 1,
  Idle = 2,
  Sync = MAX_SIGNED_31_BIT_INT,
  Batched = Sync - 1
}

export enum PriorityLevel {
  NoPriority = 0,
  ImmediatePriority = 1,
  UserBlockingPriority = 2,
  NormalPriority = 3,
  LowPriority = 4,
  IdlePriority = 5
}

// 链式的回调
export type ScheduleCallback = (isSync: boolean) => ScheduleCallback | null