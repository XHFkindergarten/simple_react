/**
 * suspense config for fiber
 */

import ReactSharedInternals from "../Shared/ReactSharedInternals";


export interface SuspenseConfig {
  timeoutMs: number
  busyDelayMs?: number,
  busyMinDurationMs?: number
}

/**
 * 获取当前的 suspense config
 */
export function requestCurrentSuspenseConfig (): SuspenseConfig | null {
  return ReactSharedInternals.ReactCurrentBatchConfig.suspense
}