import type { Atom, WritableAtom, createStore } from "jotai/vanilla"

type Store = ReturnType<typeof createStore>

type AnyWritableAtom = WritableAtom<unknown, any[], unknown>

export type SliceState = Record<string, Atom<unknown>>
export type SliceActions = Record<string, AnyWritableAtom>

export interface AtomSlice<
  State extends SliceState = SliceState,
  Actions extends SliceActions = SliceActions,
> {
  readonly state: State
  readonly actions: Actions
}

type SetterName<K extends string> = `set${Capitalize<K>}`

type Write<T> = T extends WritableAtom<unknown, infer Args, infer Result>
  ? (...args: Args) => Result
  : never

export type SliceSetters<State extends SliceState> = {
  [K in keyof State & string as State[K] extends AnyWritableAtom
    ? SetterName<K>
    : never]: Write<State[K]>
}

export type SliceActionFunctions<Actions extends SliceActions> = {
  [K in keyof Actions]: Write<Actions[K]>
}

export type BoundAtomSlice<
  State extends SliceState,
  Actions extends SliceActions,
> = SliceSetters<State> & SliceActionFunctions<Actions>

const isWritable = (anAtom: Atom<unknown>): anAtom is AnyWritableAtom =>
  "write" in anAtom

const setterName = <K extends string>(key: K): SetterName<K> =>
  `set${key.charAt(0).toUpperCase()}${key.slice(1)}` as SetterName<K>

/**
 * Groups related state atoms and action atoms. Like an atom, a slice is only
 * a definition and holds no values; values live in a store.
 *
 * Each writable state atom gets a setter named `set${Key}`. Actions are
 * write-only atoms (`atom(null, write)`) and are exposed under their own key.
 */
export function atomSlice<
  State extends SliceState,
  Actions extends SliceActions = {},
>(config: { state: State; actions?: Actions }): AtomSlice<State, Actions> {
  const state = config.state
  const actions = config.actions ?? ({} as Actions)

  const keys = new Set<string>()
  const addKey = (key: string) => {
    if (keys.has(key)) {
      throw new Error(`[jotai-slice] Duplicate key "${key}" in atomSlice`)
    }
    keys.add(key)
  }
  for (const [key, anAtom] of Object.entries(state)) {
    addKey(key)
    if (isWritable(anAtom)) {
      addKey(setterName(key))
    }
  }
  for (const key of Object.keys(actions)) {
    addKey(key)
  }

  return { state, actions }
}

const boundSlices = new WeakMap<AtomSlice, WeakMap<Store, object>>()

/**
 * Returns the setters and actions of a slice bound to a store. The result is
 * cached per slice and store, so every function keeps the same identity.
 */
export function bindAtomSlice<
  State extends SliceState,
  Actions extends SliceActions,
>(
  slice: AtomSlice<State, Actions>,
  store: Store,
): BoundAtomSlice<State, Actions> {
  let byStore = boundSlices.get(slice)
  if (byStore === undefined) {
    byStore = new WeakMap()
    boundSlices.set(slice, byStore)
  }
  let bound = byStore.get(store)
  if (bound === undefined) {
    const functions: Record<string, (...args: unknown[]) => unknown> = {}
    for (const [key, anAtom] of Object.entries(slice.state)) {
      if (isWritable(anAtom)) {
        functions[setterName(key)] = (...args) => store.set(anAtom, ...args)
      }
    }
    for (const [key, anAtom] of Object.entries(slice.actions)) {
      functions[key] = (...args) => store.set(anAtom, ...args)
    }
    bound = Object.freeze(functions)
    byStore.set(store, bound)
  }
  return bound as BoundAtomSlice<State, Actions>
}
