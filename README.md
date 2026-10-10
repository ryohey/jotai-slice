# jotai-slice

Bundle jotai atoms into one hook without subscribing to all of them.

```sh
pnpm add jotai-slice
```

## Why

A custom hook is a good way to organize atoms. Components get a plain object and never touch the atoms:

```ts
function useEditor() {
  return {
    tool: useAtomValue(toolAtom),
    selection: useAtomValue(selectionAtom),
    setTool: useSetAtom(toolAtom),
  }
}
```

But every component that calls `useEditor()` subscribes to every atom in it. A toolbar that reads only `tool` still re-renders when `selection` changes. One hook per atom avoids this, but gives up the single hook.

jotai-slice keeps the single hook and subscribes lazily: a component subscribes to a value only when it reads it.

## Usage

```tsx
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { atomSlice, useAtomSlice } from "jotai-slice"

const toolAtom = atom<"pencil" | "eraser">("pencil")

const editorSlice = atomSlice({
  state: {
    tool: toolAtom,
    selection: atom<number[]>([]),
    theme: atomWithStorage("theme", "light"),
  },
  actions: {
    toggleTool: atom(null, (get, set) =>
      set(toolAtom, get(toolAtom) === "pencil" ? "eraser" : "pencil"),
    ),
  },
})

export const useEditor = () => useAtomSlice(editorSlice)

function Toolbar() {
  // Subscribes to `tool` only
  const { tool, setTool, toggleTool } = useEditor()
  // ...
}
```

- `state` takes any atoms: primitive, derived, `atomWithStorage`, or your own. Each writable atom gets a setter named `set${Key}`.
- `actions` takes write-only atoms (`atom(null, write)`) and exposes each as a function. An action can return a value.
- Setters and actions are plain functions bound to the store. They keep the same identity across renders and are safe to call anywhere.

## Rule

Reading a value calls `useAtomValue`. Destructure values at the top level of the component, never inside callbacks or conditions:

```tsx
const { tool } = useEditor() // OK

const editor = useEditor()
const onClick = () => console.log(editor.tool) // Breaks the Rules of Hooks
```

Lint rules and React Compiler cannot see these hook calls, so they cannot check this for you. Object rest and spread read every value, and so subscribe to all of them.

## API

| Import | Exports |
| --- | --- |
| `jotai-slice/vanilla` | `atomSlice`, `bindAtomSlice` |
| `jotai-slice/react` | `useAtomSlice` |
| `jotai-slice` | All of the above |

`atomSlice({ state, actions? })` defines a slice. Like an atom, a slice holds no values; they live in a store. The atoms stay available as `slice.state` and `slice.actions`. It throws if two keys collide, including generated setter names.

`useAtomSlice(slice, options?)` returns the values, setters and actions for the store from `Provider`, or for `options.store`.

`bindAtomSlice(slice, store)` returns the setters and actions without React.

To use one of a slice's atoms inside its own definition, declare the atom as a variable first, as `toolAtom` above. TypeScript cannot infer a slice that references itself.

## License

MIT
