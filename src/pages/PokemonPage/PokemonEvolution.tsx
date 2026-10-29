import { Fragment, memo } from 'react'
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import {
  useGetEvolutionChainQuery,
  useGetPokemonSpeciesQuery,
} from 'app/apis/pokemon'
import { functionGenerator } from 'utils/EnvHelper'
import { getPokemonFallbackImage } from './navigation.mjs'
import { flattenEvolution, idFromUrl } from './species.mjs'

const EvolutionStyle = styled.section`
  margin-bottom: 16px;
  padding: 12px 10px 14px;
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
    font-size: 13px;
    font-weight: 700;
    text-transform: capitalize;
    text-align: center;
    line-height: 1.25;
  }
  .mon .c {
    font-size: 12px;
    color: rgba(235, 247, 241, 0.75);
    text-align: center;
    line-height: 1.3;
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
    grid-template-columns: repeat(auto-fit, minmax(84px, 108px));
    justify-content: center;
    align-items: start;
    width: 100%;
  }
`

const toPath = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

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

    const stages = flattenEvolution(chain.chain)
    const branching = stages.some((stage) => stage.length > 1)

    return (
      <EvolutionStyle
        data-branching={branching}
        style={{ '--tier-a': color.a } as CSSProperties}
      >
        <h3>Tiến hóa</h3>
        {stages.length === 1 ? (
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
                <div className="stage">
                  {stage.map((mon) => {
                    const current = mon.id === speciesId
                    const body = (
                      <>
                        <img
                          src={getPokemonFallbackImage(mon.id)}
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="n">{mon.name.replace(/-/g, ' ')}</span>
                        {mon.condition && (
                          <span className="c">{mon.condition}</span>
                        )}
                      </>
                    )
                    return current ? (
                      <div key={mon.id} className="mon" aria-current="page">
                        {body}
                      </div>
                    ) : (
                      <LinkCustom
                        key={mon.id}
                        className="mon"
                        to={toPath(mon.name)}
                      >
                        {body}
                      </LinkCustom>
                    )
                  })}
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
