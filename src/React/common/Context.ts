// 上下文

export enum ExcutionContext {
  NoContext = 0b000000,
  BatchedContext = 0b000001,
  EventContext = 0b000010,
  DiscreteEventContext = 0b000100,
  LegacyUnbatchedContext = 0b001000,
  RenderContext = 0b010000,
  CommitContext = 0b100000
}