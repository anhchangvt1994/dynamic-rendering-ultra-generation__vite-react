import { Fragment, memo } from 'react'
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import {
  useGetEvolutionChainQuery,
  useGetPokemonSpeciesQuery,
  useGetPokemonFormQuery,
} from 'app/apis/pokemon'
import { functionGenerator } from 'utils/EnvHelper'
import {
  getEvolutionStages,
  getEvolutionArtwork,
  idFromUrl,
} from './species.mjs'
import { titleCase } from 'components/pokemon-page/format.mjs'
import { Pokeball } from 'components/common/FieldIcon'

const EvolutionStyle = styled.section`
  margin-bottom: 16px;
  padding: 16px 12px;
  color: #fff;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}

  h3 {
    margin: 0 4px 10px;
    font-size: 15px;
    font-weight: 700;
  }
  .chain {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .stage {
    display: grid;
    gap: 8px;
    justify-items: center;
  }
  .arrow {
    flex: none;
    width: 14px;
    height: 14px;
    fill: none;
    stroke: rgba(255, 255, 255, 0.55);
    stroke-width: 2.5;
  }

  .mon {
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 2px;
    width: 84px;
    padding: 6px 2px 8px;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
    transition:
      background 160ms ease-out,
      transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  a.mon:hover,
  a.mon:focus-visible {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  a.mon:active {
    transform: scale(0.96);
  }
  a.mon:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 2px;
  }
  .mon[aria-current='page'] {
    background: color-mix(in srgb, var(--tier-a) 18%, transparent);
    box-shadow: inset 0 0 0 1.5px var(--tier-a);
  }
  .mon img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));
  }
  .mon .n {
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
    text-align: center;
    line-height: 1.25;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .mon .c {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    max-width: 100%;
    font-size: 10px;
    color: rgba(235, 247, 241, 0.75);
    text-align: center;
    line-height: 1.3;
  }
  .evolution-art {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
  }
  .evolution-art > svg {
    width: 24px;
    height: 24px;
    opacity: 0.6;
  }
  .form-label {
    font-size: 10px;
    color: #c6d8e9;
  }
  .retry-form {
    background: #ffffff15;
    color: white;
    border: 1px solid #ffffff30;
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 9px;
  }
  .evolution-items {
    display: flex;
    justify-content: center;
    gap: 2px;
  }
  .mon .evolution-item {
    width: 26px;
    height: 26px;
    image-rendering: pixelated;
    filter: none;
  }
  .single {
    margin: 0 4px;
    font-size: 14px;
    color: rgba(235, 247, 241, 0.75);
  }

  /* branching families (e.g. Eevee): later stages wrap in a grid */
  &[data-branching='true'] .chain {
    flex-direction: column;
  }
  &[data-branching='true'] .arrow {
    transform: rotate(90deg);
  }
  &[data-branching='true'] .stage {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px 6px;
    justify-content: center;
    align-items: start;
    width: 100%;
  }
  &[data-branching='true'] .stage .mon {
    width: 100%;
    max-width: 100px;
    margin-inline: auto;
  }
  &[data-branching='true'] .stage[data-count='1'] {
    grid-template-columns: minmax(0, 100px);
  }
  &[data-branching='true'] .stage[data-count='2'] {
    grid-template-columns: repeat(2, minmax(0, 100px));
  }
`

const toPath = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

function EvolutionMon({ mon, current }: { mon: any; current: boolean }) {
  const {
    currentData: form,
    isError,
    refetch,
  } = useGetPokemonFormQuery(mon.form || '', { skip: !mon.form })
  // Form IDs and Pokémon IDs differ. Resolve the form's Pokémon resource,
  // rather than showing the base species artwork or guessing an image ID.
  const artworkId = mon.form ? idFromUrl(form?.pokemon?.url) : mon.id
  const target = mon.form ? form?.pokemon?.name : mon.name
  const formLabel = mon.form
    ? titleCase(mon.form.replace(`${mon.name}-`, ''))
    : ''
  const body = (
    <>
      <span className="evolution-art">
        {artworkId ? (
          <img
            src={getEvolutionArtwork(artworkId, form)}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Pokeball />
        )}
      </span>
      <span className="n">{titleCase(mon.name)}</span>
      {formLabel && <span className="form-label">{formLabel}</span>}
      {mon.condition && (
        <span className="c">
          {mon.items?.length > 0 && (
            <span className="evolution-items">
              {mon.items.map((item) => (
                <img
                  key={item.name}
                  className="evolution-item"
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.name}.png`}
                  width={26}
                  height={26}
                  alt=""
                  title={item.label}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden'
                  }}
                />
              ))}
            </span>
          )}
          {mon.condition}
        </span>
      )}
      {mon.form && !form && isError && (
        <button type="button" className="retry-form" onClick={() => refetch()}>
          Tải lại ảnh dạng
        </button>
      )}
    </>
  )
  return current || !target ? (
    <div className="mon" aria-current={current ? 'page' : undefined}>
      {body}
    </div>
  ) : (
    <LinkCustom className="mon" to={toPath(target)}>
      {body}
    </LinkCustom>
  )
}

const PokemonEvolution = memo(
  ({ pokemon, color }: { pokemon: any; color: { a: string; b: string } }) => {
    const speciesId = idFromUrl(pokemon?.species?.url)
    const { data: species } = useGetPokemonSpeciesQuery(speciesId, {
      skip: !speciesId,
    })
    const chainId = idFromUrl(species?.evolution_chain?.url)
    const { data: chain } = useGetEvolutionChainQuery(chainId, {
      skip: !chainId,
    })
    if (!chain?.chain) return null

    const stages = getEvolutionStages(chain.chain, {
      speciesId,
      pokemonName: pokemon.name,
      isDefault: pokemon.is_default,
      formNames: (pokemon.forms || []).map((form) => form.name),
    })
    const branching = stages.some((stage) => stage.length > 1)

    return (
      <EvolutionStyle
        data-branching={branching}
        style={{ '--tier-a': color.a } as CSSProperties}
      >
        <h3>Tiến hóa</h3>
        {!stages.length ? (
          <p className="single">Chưa có dữ liệu tiến hóa cho dạng này.</p>
        ) : stages.length === 1 ? (
          <p className="single">Pokémon này không tiến hóa.</p>
        ) : (
          <div className="chain">
            {stages.map((stage, depth) => (
              <Fragment key={depth}>
                {depth > 0 && (
                  <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                )}
                <div className="stage" data-count={stage.length}>
                  {stage.map((mon) => (
                    <EvolutionMon
                      key={`${mon.id}-${mon.form || 'default'}`}
                      mon={mon}
                      current={mon.id === speciesId}
                    />
                  ))}
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </EvolutionStyle>
    )
  }
)

PokemonEvolution.displayName = 'PokemonEvolution'
export default PokemonEvolution
