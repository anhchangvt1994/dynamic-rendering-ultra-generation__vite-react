import { memo, useState } from 'react'
import styled from 'styled-components'
import { getFormImages, showNextImage } from './navigation.mjs'
import { formsOf } from './species.mjs'

const FormsStyle = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: -4px 0 16px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 0 12px 0 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.82);
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    transition:
      background 140ms ease-out,
      transform 120ms ease-out;
  }
  a:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }
  a:active {
    transform: scale(0.96);
  }
  a[aria-current='page'] {
    background: #ffda55;
    box-shadow: none;
    color: #172d45;
  }
  .more {
    min-height: 44px;
    padding: 0 14px;
    border: 1px dashed rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    background: none;
    color: rgba(255, 255, 255, 0.82);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .more:focus-visible,
  a:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 2px;
  }
  img {
    width: 36px;
    height: 36px;
    image-rendering: pixelated;
    object-fit: contain;
  }
  /* past the pixel sprite: smooth artwork */
  img[data-step] {
    image-rendering: auto;
  }
`

/**
 * Switch between a species' varieties (Mega, Gigantamax, regional forms).
 * Shown only when there is more than one; links back from a form to the
 * default too.
 */
const PokemonForms = memo(
  ({ species, current }: { species: any; current: string }) => {
    const forms = formsOf(species)
    const [expanded, setExpanded] = useState(false)
    if (!forms.length) return null
    const baseId = forms.find((form) => form.isDefault)?.id
    // long lists (Pikachu has 17) start folded, but always show the current
    const FOLD = 5
    const folded = !expanded && forms.length > FOLD + 1
    const shown = folded
      ? forms.filter((form, i) => i < FOLD || form.name === current)
      : forms
    return (
      <FormsStyle aria-label="Các dạng của Pokémon này">
        {shown.map((form) => (
          <LinkCustom
            key={form.name}
            to={`/pokemon/${form.name}`}
            aria-current={form.name === current ? 'page' : undefined}
          >
            <img
              src={getFormImages(form.id, baseId, { small: true })[0]}
              alt=""
              onError={(event) =>
                showNextImage(
                  event.currentTarget,
                  getFormImages(form.id, baseId, { small: true })
                )
              }
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
            />
            {form.label}
          </LinkCustom>
        ))}
        {folded && (
          <button
            type="button"
            className="more"
            aria-expanded="false"
            onClick={() => setExpanded(true)}
          >
            +{forms.length - shown.length} dạng khác
          </button>
        )}
      </FormsStyle>
    )
  }
)

PokemonForms.displayName = 'PokemonForms'
export default PokemonForms
