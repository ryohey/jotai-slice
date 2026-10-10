import { useAtomValue, useStore } from "jotai/react"
import type { Atom } from "jotai/vanilla"
import {
  type AtomSlice,
  type BoundAtomSlice,
  bindAtomSlice,
  type SliceActions,
  type SliceState,
} from "./vanilla.js"

type Options = Parameters<typeof useStore>[0]
type Store = ReturnType<typeof useStore>

export type SliceValues<State extends SliceState> = {
  readonly [K in keyof State]: State[K] extends Atom<infer Value>
    ? Awaited<Value>
    : never
}

export type AtomSliceView<
  State extends SliceState,
  Actions extends SliceActions,
> = SliceValues<State> & BoundAtomSlice<State, Actions>

const views = new WeakMap<AtomSlice, WeakMap<Store, object>>()

const createView = (slice: AtomSlice, store: Store) => {
  const view = { ...bindAtomSlice(slice, store) }
  for (const [key, anAtom] of Object.entries(slice.state)) {
    Object.defineProperty(view, key, {
      enumerable: true,
      // Subscribes to the atom only when the value is read. Read values at the
      // top level of the component, e.g. by destructuring the result.
      get: () => useAtomValue(anAtom, { store }),
    })
  }
  return Object.freeze(view)
}

/**
 * Returns the values, setters and actions of a slice.
 *
 * Each value is a getter that calls `useAtomValue` when it is read, so the
 * component subscribes only to the values it reads. Because reading a value
 * calls a hook, read values unconditionally at the top level of the component
 * (destructure the result), never inside callbacks or conditions. Setters and
 * actions are plain functions with stable identities and can be used anywhere.
 */
export function useAtomSlice<
  State extends SliceState,
  Actions extends SliceActions,
>(
  slice: AtomSlice<State, Actions>,
  options?: Options,
): AtomSliceView<State, Actions> {
  const store = useStore(options)
  let byStore = views.get(slice)
  if (byStore === undefined) {
    byStore = new WeakMap()
    views.set(slice, byStore)
  }
  let view = byStore.get(store)
  if (view === undefined) {
    view = createView(slice, store)
    byStore.set(store, view)
  }
  return view as AtomSliceView<State, Actions>
}
