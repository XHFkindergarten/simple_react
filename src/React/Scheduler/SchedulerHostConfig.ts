/**
 * Schedule 适配 native 环境
 */

import { getCurrentTime } from "./index"
import { isFunction, isUndefined } from "../utils"

// 取消 timeout 的方法
export let cancelHostTimeout

// 设定一个 timeout
export let requestHostTimeout

export let requestHostCallback

let taskTimeoutID: NodeJS.Timeout | -1 = -1

if (
  isUndefined(window) ||
  !isFunction(MessageChannel)
) {

  let _callback: Function | null = null

  let _timeoutId: NodeJS.Timeout | null = null

  const _flushCallback = function () {
    if (_callback !== null) {
      try {
        const currentTime = getCurrentTime()
        const hasRemainingTime = true

        _callback(hasRemainingTime, currentTime)

        _callback = null
      } catch (e) {
        setTimeout(_flushCallback, 0)
        throw (e)
      }
    }
  }

  cancelHostTimeout = function () {
    clearTimeout(_timeoutId as NodeJS.Timeout)
  }

  requestHostTimeout = function (cb, ms) {
    _timeoutId = setTimeout(cb, ms)
  }

  requestHostCallback = function (cb) {
    if (_callback !== null) {
      setTimeout(requestHostCallback, 0, cb)
    } else {
      _callback = cb
      setTimeout(_flushCallback, 0)
    }
  }

} else {
  cancelHostTimeout = function () {
    clearTimeout(taskTimeoutID as NodeJS.Timeout)
    taskTimeoutID = -1
  }

  requestHostTimeout = function (cb, ms) {
    taskTimeoutID = setTimeout(() => {
      cb(getCurrentTime())
    }, ms)
  }
}

