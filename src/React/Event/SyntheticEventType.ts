import { SyntheticEvent } from "react";
import { Fiber } from "../Fiber/Fiber";
import { DispatchConfig } from "./PluginModuleType";

/**
 * React 合成事件
 */

export type ReactSyntheticEvent = {
  dispatchConfig: DispatchConfig,
  getPooled: (
    dispatchConfig: DispatchConfig,
    targetInst: Fiber,
    nativeTarget: Event,
    nativeEventTarget: EventTarget
  ) => ReactSyntheticEvent,
  isPersistent: () => boolean
} & SyntheticEvent