/**
 * 当前 fiber
 */

import { Fiber } from "../Fiber/Fiber";

 const ReactCurrentOwner: {
   current: Fiber | null
 } = {
   current: null
 }

 export default ReactCurrentOwner