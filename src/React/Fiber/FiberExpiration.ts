import { ExpirationTime } from "../common"
import { LOW_PRIORITY_BATCH_SIZE } from "./FiberExpirationTime"

// 每一个单元时间长度 ms
export const UNIT_SIZE = 10

export const MAGIC_NUMBER_OFFSET = ExpirationTime.Batched - 1


/**
 * 一个单位的 expiration time 代表了 10ms
 */
export function msToExpirationTime(ms: number): number {
  return MAGIC_NUMBER_OFFSET - ((ms / UNIT_SIZE) | 0)
}

export function expirationTimeToMs (expirationTime: number): number {
  return (MAGIC_NUMBER_OFFSET - expirationTime) * UNIT_SIZE
}



// 根据当前时间、过期时间、batch时间片长度来计算过期时间
export function computeExpirationBucket(
  currentTime: number,
  timeoutMs: number,
  bucketTime: number
): number {
  return MAGIC_NUMBER_OFFSET - ceiling(
    MAGIC_NUMBER_OFFSET - currentTime + timeoutMs / UNIT_SIZE,
    bucketTime / UNIT_SIZE
  )
}


// 向上取整（即使是整数倍也还是会向上再+1个整数倍）
function ceiling (num: number, precision: number) : number {
  return (((num / precision) | 0) + 1) * precision
}

// 根据SuspenseConfig计算expirationTime
// 其实本质也是利用过期时间片和低优先级的batch周期来计算
export function computeSuspenseExpiration(
  currentTime: number,
  timeoutMs: number
): number {
  return computeExpirationBucket(
    currentTime,
    timeoutMs,
    LOW_PRIORITY_BATCH_SIZE
  )
}
