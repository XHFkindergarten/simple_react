import { Update, UpdateQueue } from "../UpdateQueue";

export type Hook = {
  memorizedState: any,

  baseState: any,
  baseUpdate: Update<any> | null,
  queue: UpdateQueue<any> | null,

  next: Hook | null
}