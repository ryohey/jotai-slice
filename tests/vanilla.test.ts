import { atom, createStore } from "jotai/vanilla"
import { describe, expect, expectTypeOf, it } from "vitest"
import { atomSlice, bindAtomSlice } from "../src/vanilla.js"

const countAtom = atom(0)
const state = {
  count: countAtom,
  label: atom("a"),
  doubled: atom((get) => get(countAtom) * 2),
}

const counterSlice = atomSlice({
  state,
  actions: {
    increment: atom(null, (_get, set, by: number) =>
      set(state.count, (c) => c + by),
    ),
    getCount: atom(null, (get) => get(state.count)),
  },
})

describe("atomSlice", () => {
  it("keeps the given atoms", () => {
    expect(counterSlice.state.count).toBe(state.count)
    expect(Object.keys(counterSlice.actions)).toEqual(["increment", "getCount"])
  })

  it("defaults to no actions", () => {
    expect(atomSlice({ state: { a: atom(0) } }).actions).toEqual({})
  })

  it("throws on a key that collides with a generated setter", () => {
    expect(() =>
      atomSlice({
        state: { count: atom(0) },
        actions: { setCount: atom(null, () => {}) },
      }),
    ).toThrow('Duplicate key "setCount"')
  })
})

describe("bindAtomSlice", () => {
  it("creates setters for writable state atoms only", () => {
    const bound = bindAtomSlice(counterSlice, createStore())
    expect(Object.keys(bound).sort()).toEqual(
      ["getCount", "increment", "setCount", "setLabel"].sort(),
    )
    expectTypeOf(bound.setCount).toEqualTypeOf<
      (update: number | ((prev: number) => number)) => void
    >()
    expectTypeOf(bound.increment).toEqualTypeOf<(by: number) => void>()
    expectTypeOf(bound.getCount).toEqualTypeOf<() => number>()
    // @ts-expect-error read-only atoms have no setter
    bound.setDoubled
  })

  it("writes to the bound store", () => {
    const store = createStore()
    const { setCount, increment, getCount } = bindAtomSlice(
      counterSlice,
      store,
    )
    setCount(2)
    increment(3)
    expect(store.get(state.count)).toBe(5)
    expect(store.get(state.doubled)).toBe(10)
    expect(getCount()).toBe(5)
  })

  it("returns the same functions for the same store", () => {
    const store = createStore()
    expect(bindAtomSlice(counterSlice, store)).toBe(
      bindAtomSlice(counterSlice, store),
    )
  })

  it("keeps stores isolated", () => {
    const a = createStore()
    const b = createStore()
    bindAtomSlice(counterSlice, a).setCount(1)
    expect(a.get(state.count)).toBe(1)
    expect(b.get(state.count)).toBe(0)
  })
})
