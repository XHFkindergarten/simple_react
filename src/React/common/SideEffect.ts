export enum EffectTag {
  // React Dev Tools
  NoEffect = 0b0000000000000,
  PerformedWork = 0b0000000000001,

  Placement = 0b0000000000010,
  Update = 0b0000000000100,
  PlacementAndUpdate = 0b0000000000110,
  Deletion = 0b0000000001000,
  ContentReset = 0b0000000010000,
  Callback = 0b0000000100000,
  DidCapture = 0b0000001000000,
  Ref = 0b0000010000000,
  Snapshot = 0b0000100000000,
  Passive = 0b0001000000000,
  Hydrating = 0b0010000000000,
  HydratingAndUpdate = 0b0010000000100,

  // Passive & Update & Callback & Ref & Snapshot
  LifecycleEffectMask = 0b0001110100100,

  // Union of all host effects
  HostEffectMask = 0b0011111111111,

  Incomplete = 0b0100000000000,
  ShouldCapture = 0b1000000000000,
}

// Don't change these two values. They're used by React Dev Tools.
// export const NoEffect = /*              */ 0b0000000000000;
// export const PerformedWork = /*         */ 0b0000000000001;

// // You can change the rest (and add more).
// export const Placement = /*             */ 0b0000000000010;
// export const Update = /*                */ 0b0000000000100;
// export const PlacementAndUpdate = /*    */ 0b0000000000110;
// export const Deletion = /*              */ 0b0000000001000;
// export const ContentReset = /*          */ 0b0000000010000;
// export const Callback = /*              */ 0b0000000100000;
// export const DidCapture = /*            */ 0b0000001000000;
// export const Ref = /*                   */ 0b0000010000000;
// export const Snapshot = /*              */ 0b0000100000000;
// export const Passive = /*               */ 0b0001000000000;
// export const Hydrating = /*             */ 0b0010000000000;
// export const HydratingAndUpdate = /*    */ 0b0010000000100;

// // Passive & Update & Callback & Ref & Snapshot
// export const LifecycleEffectMask = /*   */ 0b0001110100100;

// // Union of all host effects
// export const HostEffectMask = /*        */ 0b0011111111111;

// export const Incomplete = /*            */ 0b0100000000000;
// export const ShouldCapture = /*         */ 0b1000000000000;