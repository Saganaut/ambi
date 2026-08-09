export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type PrettifyDeep<T> = T extends object
  ? // oxlint-disable-next-line typescript/no-explicit-any
    T extends (...args: any[]) => any
    ? T
    : { [K in keyof T]: PrettifyDeep<T[K]> }
  : T;
