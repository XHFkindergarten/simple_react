/**
 * fiber 相关的过期时间
 */

import { ExpirationTime, ReactPriorityLevel } from "../common";
import { expirationTimeToMs } from "./FiberExpiration";

// 低优先级
export const LOW_PRIORITY_EXPIRATION = 5000
export const LOW_PRIORITY_BATCH_SIZE = 250

// 高优先级
export const HIGH_PRIORITY_EXPIRATION = 150 // dev模式应该为500
export const HIGH_PRIORITY_BATCH_SIZE = 100

// 根据过期时间推断优先级
export function inferPriorityFromExpirationTime (
  currentTime: number,
  expirationTime: number
): ReactPriorityLevel {
  if (expirationTime === ExpirationTime.Sync) {
    return ReactPriorityLevel.ImmediatePriority
  }

  if (expirationTime === ExpirationTime.Never || expirationTime === ExpirationTime.Idle) {
    return ReactPriorityLevel.IdlePriority
  }

  // 剩余的时间
  const msUntil = 
    expirationTimeToMs(expirationTime) - expirationTimeToMs(currentTime)
  if (msUntil <= 0) {
    return ReactPriorityLevel.ImmediatePriority
  }

  if (msUntil <= 0) {
    return ReactPriorityLevel.ImmediatePriority
  }
  if (msUntil < HIGH_PRIORITY_EXPIRATION + HIGH_PRIORITY_BATCH_SIZE) {
    // 剩余时间已经不足一个 high expiration + batch
    // 将优先级提升到用户阻塞级别
    return ReactPriorityLevel.UserBlockingPriority
  }
  // 时间还绰绰有余
  if (msUntil <= LOW_PRIORITY_EXPIRATION + LOW_PRIORITY_BATCH_SIZE) {
    return ReactPriorityLevel.NormalPriority
  }
  // default
  return ReactPriorityLevel.IdlePriority
}