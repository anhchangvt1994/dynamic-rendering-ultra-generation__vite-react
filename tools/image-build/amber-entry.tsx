// Loaded by tools/image-build/amber.ts through the dev server: draws one
// finished amber stone with the app's own component, for the build to shoot.
import { createRoot } from 'react-dom/client'
import AmberCard from 'pages/BagPage/crafting/AmberCard'

export function bake(
  host: HTMLElement,
  { speciesId, name, required }: { speciesId: number; name: string; required: number }
) {
  const root = createRoot(host)
  root.render(
    <AmberCard
      speciesId={speciesId}
      name={name}
      count={required}
      required={required}
      complete
    />
  )
  return () => root.unmount()
}
