import { SuspenseConfig } from "../Fiber/FiberSuspenseConfig"

/**
 * 批处理 配置对象
 */
const ReactCurrentBatchConfig: {
  suspense: SuspenseConfig | null
} = {
  suspense: null
}

export default ReactCurrentBatchConfig