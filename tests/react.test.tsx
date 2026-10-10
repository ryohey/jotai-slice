import { act, render, renderHook } from "@testing-library/react"
import { Provider } from "jotai/react"
import { atom, createStore } from "jotai/vanilla"
import type { ReactNode } from "react"
import { describe, expect, expectTypeOf, it } from "vitest"
import { useAtomSlice } from "../src/react.js"
import { atomSlice } from "../src/vanilla.js"

const createSlice = () => {
  const state = {
    count: atom(0),
    label: atom("a"),
    asyncValue: atom(async () => 1),
  }
  return atomSlice({
    state,
    actions: {
      reset: atom(null, (_get, set) => {
        set(state.count, 0)
        set(state.label, "a")
      }),
    },
  })
}

describe("useAtomSlice", () => {
  it("reads values and writes through setters and actions", () => {
    const slice = createSlice()
    const { result } = renderHook(() => {
      const { count, label, setCount, setLabel, reset } = useAtomSlice(slice)
      return { count, label, setCount, setLabel, reset }
    })
    expect(result.current.count).toBe(0)
    act(() => result.current.setCount(2))
    act(() => result.current.setLabel("b"))
    expect(result.current.count).toBe(2)
    expect(result.current.label).toBe("b")
    act(() => result.current.reset())
    expect(result.current.count).toBe(0)
    expect(result.current.label).toBe("a")
  })

  it("types values as awaited atom values", () => {
    const slice = createSlice()
    const { result } = renderHook(() => useAtomSlice(slice))
    expectTypeOf<typeof result.current.count>().toEqualTypeOf<number>()
    expectTypeOf<
      typeof result.current.asyncValue
    >().toEqualTypeOf<number>()
  })

  it("subscribes only to the values that are read", () => {
    const slice = createSlice()
    const store = createStore()
    let renders = 0
    const Label = () => {
      renders++
      const { label } = useAtomSlice(slice)
      return <>{label}</>
    }
    render(
      <Provider store={store}>
        <Label />
      </Provider>,
    )
    const mounted = renders
    act(() => store.set(slice.state.count, 1))
    expect(renders).toBe(mounted)
    act(() => store.set(slice.state.label, "b"))
    expect(renders).toBe(mounted + 1)
  })

  it("keeps the same setters and actions across renders", () => {
    const slice = createSlice()
    const { result, rerender } = renderHook(() => {
      const { setCount, reset } = useAtomSlice(slice)
      return { setCount, reset }
    })
    const first = result.current
    rerender()
    expect(result.current.setCount).toBe(first.setCount)
    expect(result.current.reset).toBe(first.reset)
  })

  it("uses the store from Provider or options", () => {
    const slice = createSlice()
    const providerStore = createStore()
    const optionStore = createStore()
    providerStore.set(slice.state.count, 1)
    optionStore.set(slice.state.count, 2)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={providerStore}>{children}</Provider>
    )
    const fromProvider = renderHook(() => useAtomSlice(slice).count, {
      wrapper,
    })
    const fromOptions = renderHook(
      () => useAtomSlice(slice, { store: optionStore }).count,
      { wrapper },
    )
    expect(fromProvider.result.current).toBe(1)
    expect(fromOptions.result.current).toBe(2)
  })
})
