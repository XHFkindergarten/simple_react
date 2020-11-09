// @todo mode是干啥的
// Mode 0b 二进制数
export enum Mode {
  NoMode = 0b0000,
  StrictMode = 0b0001,
  BatchedMode = 0b0010,
  ConcurrentMode = 0b0100,
  ProfileMode = 0b1000
}