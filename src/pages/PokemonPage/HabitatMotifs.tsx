type Colors = { light: string; accent: string; dark: string; petal: string }

function artwork(type: string, { light, accent, dark, petal }: Colors) {
  switch (type) {
    case 'electric':
      return (
        <>
          <ellipse
            cx="160"
            cy="70"
            rx="123"
            ry="25"
            stroke={accent}
            strokeWidth="2"
          />
          <ellipse
            cx="160"
            cy="70"
            rx="109"
            ry="18"
            strokeDasharray="18 7 3 7"
            opacity="0.7"
          />
          <path
            d="M47 72L63 61H88M232 61H257L273 72M93 88H122L134 82M186 82L198 88H227"
            strokeWidth="2"
          />
          <g fill={dark} stroke={light}>
            <path d="M45 66L53 61L61 66V77L53 82L45 77ZM259 66L267 61L275 66V77L267 82L259 77Z" />
            <circle cx="53" cy="71" r="2" fill={accent} />
            <circle cx="267" cy="71" r="2" fill={accent} />
          </g>
          <g stroke={light} strokeWidth="2.2" strokeLinejoin="miter">
            <path
              className="electric-arc"
              d="M42 58L60 37L55 55L72 49L54 76L59 59Z"
              fill={accent}
              fillOpacity="0.2"
            />
            <path
              className="electric-arc arc-delayed"
              d="M251 49L269 30L264 48L280 44L263 70L267 52Z"
              fill={accent}
              fillOpacity="0.2"
            />
            <path
              className="electric-arc arc-late"
              d="M92 87L112 80L126 91L148 82L171 91L190 81L215 87"
            />
          </g>
        </>
      )
    case 'fire':
      return (
        <g fill={accent} stroke={light} strokeWidth="0.8">
          <path
            className="flame"
            d="M49 80Q32 68 49 48Q44 61 55 63Q58 52 62 49Q76 72 60 82Z"
          />
          <path
            className="flame flora-delayed"
            d="M253 76Q240 62 255 39Q250 57 264 58Q265 52 269 49Q282 71 267 79Z"
          />
          <path
            d="M49 78Q46 70 55 64Q53 73 60 78Z"
            fill={light}
            stroke="none"
          />
          <path
            d="M255 74Q253 65 262 61Q260 70 267 75Z"
            fill={light}
            stroke="none"
          />
        </g>
      )
    case 'water':
      return (
        <>
          <g stroke={light} opacity="0.65">
            <path d="M58 82Q53 73 57 63M62 82Q68 74 65 69M255 80Q249 69 254 60M260 81Q267 72 264 66" />
          </g>
          <path d="M79 85Q87 70 96 85Z" fill={light} fillOpacity="0.45" />
          <path d="M83 84L87 76L91 84" stroke={dark} opacity="0.5" />
        </>
      )
    case 'grass':
      return (
        <g fill={accent}>
          <path d="M39 76Q23 57 48 50Q57 65 39 76ZM274 72Q263 48 291 47Q294 67 274 72Z" />
          <path d="M36 70L47 56M275 67L286 52" stroke={light} strokeWidth="1" />
          <path
            d="M127 88Q139 78 147 85Q140 94 127 88Z"
            fill={light}
            opacity="0.45"
          />
        </g>
      )
    case 'ice':
      return (
        <g fill={light} stroke={accent} strokeWidth="1">
          <path d="M72 84L79 62L87 77L85 87ZM236 83L244 60L252 79L248 87ZM115 91L121 79L129 89Z" />
          <path d="M79 62L80 86M244 60L244 86" stroke={dark} opacity="0.45" />
          <path
            d="M93 82L107 73L130 82M198 77L216 65L231 74"
            fill="none"
            opacity="0.55"
          />
        </g>
      )
    case 'fighting':
      return (
        <>
          <ellipse cx="160" cy="70" rx="112" ry="21" strokeWidth="2" />
          <path
            d="M63 74L81 60M239 60L257 74M104 89L112 81M208 81L216 89"
            stroke={light}
            strokeWidth="3"
          />
          <path
            d="M65 53L57 42M71 51V38M77 53L85 43M243 81L235 91M250 83V96M257 80L265 89"
            stroke={light}
            strokeWidth="1.7"
          />
          <path
            d="M84 73L96 66L105 73L94 81ZM214 73L224 65L236 73L224 81Z"
            fill={accent}
          />
        </>
      )
    case 'poison':
      return (
        <>
          <path
            d="M41 76Q53 94 73 84T109 86M219 86Q239 97 253 86T282 77"
            strokeWidth="4"
            opacity="0.7"
          />
          <g fill={dark} stroke={light} strokeOpacity="0.7">
            <circle className="poison-bubble" cx="57" cy="57" r="9" />
            <circle
              className="poison-bubble bubble-delayed"
              cx="262"
              cy="64"
              r="7"
            />
            <circle className="mote" cx="74" cy="43" r="3" />
            <circle className="mote" cx="244" cy="46" r="3.5" />
          </g>
          <path d="M52 55Q54 50 59 52M258 62Q260 59 264 61" stroke={light} />
          <ellipse
            cx="93"
            cy="84"
            rx="14"
            ry="4"
            fill={accent}
            fillOpacity="0.3"
          />
          <ellipse
            cx="234"
            cy="84"
            rx="12"
            ry="3"
            fill={accent}
            fillOpacity="0.3"
          />
        </>
      )
    case 'ground':
      return (
        <>
          <path
            d="M43 73Q66 56 98 70T158 75M172 76Q219 55 272 72M73 84Q103 75 135 86M186 88Q224 74 252 83"
            stroke={light}
            opacity="0.75"
          />
          <path d="M100 62Q122 56 142 62M169 89L191 85" opacity="0.5" />
          <g fill={light} stroke="none">
            {[
              [58, 79],
              [82, 62],
              [227, 65],
              [257, 77],
              [148, 88],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="1.5" />
            ))}
          </g>
        </>
      )
    case 'flying':
      return (
        <>
          <g fill={light} fillOpacity="0.48" strokeOpacity="0.6">
            <path d="M34 74Q22 64 36 60Q32 47 46 48Q51 36 61 48Q76 44 78 58Q93 64 79 73Z" />
            <path d="M236 75Q225 66 240 60Q234 46 249 48Q256 38 265 50Q280 46 282 61Q298 68 280 76Z" />
          </g>
          <g className="wind-streak" stroke={light} opacity="0.75">
            <path d="M35 44H73Q86 44 79 36M241 39H276Q288 39 281 31" />
            <path d="M66 88Q107 96 136 88M186 88Q217 79 252 88" />
          </g>
        </>
      )
    case 'psychic':
      return (
        <g stroke={light}>
          <ellipse
            cx="160"
            cy="70"
            rx="95"
            ry="18"
            strokeDasharray="19 6 2 6"
          />
          <ellipse cx="160" cy="70" rx="64" ry="12" opacity="0.55" />
          <path d="M47 64Q61 46 76 64Q61 81 47 64ZM244 64Q259 46 274 64Q259 81 244 64Z" />
          <circle className="mote" cx="62" cy="64" r="4" fill={light} />
          <circle className="mote" cx="259" cy="64" r="4" fill={light} />
          <path d="M109 84L117 78L125 84L117 90ZM196 84L204 78L212 84L204 90Z" />
        </g>
      )
    case 'bug':
      return (
        <>
          <g opacity="0.65" stroke={light} strokeWidth="0.8">
            <path d="M246 49L271 71L240 80ZM246 49L255 75M271 71L244 64M240 80L259 61M245 59Q254 58 261 65M243 70Q253 66 266 70" />
          </g>
          <path d="M54 80V66M67 83V73" stroke={light} strokeWidth="2" />
          <path
            d="M43 66Q54 47 65 66ZM60 73Q68 59 76 73Z"
            fill={accent}
            stroke={light}
          />
          <g fill={light} stroke="none">
            <circle cx="51" cy="61" r="1.5" />
            <circle cx="58" cy="62" r="1" />
            <circle className="mote" cx="81" cy="51" r="1.6" />
          </g>
        </>
      )
    case 'rock':
      return (
        <g fill={accent} stroke={light} strokeWidth="0.8">
          <path d="M41 79L47 58L61 49L77 65L74 83ZM236 82L243 61L259 55L277 78L265 87ZM115 92L122 81L139 84L147 93Z" />
          <path
            d="M47 58L61 67L77 65M61 49V67L74 83M243 61L257 72L277 78M259 55L257 72L265 87"
            fill="none"
            stroke={dark}
            opacity="0.7"
          />
        </g>
      )
    case 'ghost':
      return (
        <g fill={accent} fillOpacity="0.28" stroke={light} strokeOpacity="0.75">
          <path
            className="ghost-wisp"
            d="M46 76Q32 65 47 52Q56 47 54 36Q74 51 61 64Q57 72 66 78Q55 73 46 76Z"
          />
          <path
            className="ghost-wisp wisp-delayed"
            d="M250 77Q236 65 250 53Q263 48 260 37Q280 51 267 64Q262 73 272 79Q259 74 250 77Z"
          />
          <circle cx="51" cy="58" r="1.5" fill={light} />
          <circle cx="59" cy="57" r="1.5" fill={light} />
          <path d="M96 86Q116 75 132 86M192 87Q211 74 230 85" opacity="0.5" />
        </g>
      )
    case 'dragon':
      return (
        <g stroke={light}>
          <path
            d="M44 81L49 48L61 42L75 49L79 80M241 80L246 48L260 41L273 48L277 81"
            fill={dark}
          />
          <path
            d="M54 55L62 50L69 56L62 62ZM253 55L261 50L268 56L261 62Z"
            fill={accent}
          />
          <path d="M52 70L61 65L71 72M250 71L260 65L270 71M110 86L118 78L126 86L134 79L143 87M180 86L188 79L196 86L204 78L212 86" />
        </g>
      )
    case 'dark':
      return (
        <>
          <ellipse
            className="eclipse-halo"
            cx="160"
            cy="70"
            rx="116"
            ry="21"
            fill={dark}
            fillOpacity="0.75"
            stroke={light}
            strokeOpacity="0.3"
          />
          <path
            d="M70 40A13 13 0 1 0 83 61A14 14 0 0 1 70 40Z"
            fill={light}
            stroke="none"
            opacity="0.8"
          />
          <path
            d="M38 78Q61 59 88 77M227 78Q257 53 282 75"
            stroke={dark}
            strokeWidth="5"
          />
          <path d="M249 45V54M245 49H254" stroke={light} />
        </>
      )
    case 'steel':
      return (
        <>
          <ellipse
            cx="160"
            cy="70"
            rx="121"
            ry="24"
            stroke={light}
            strokeWidth="2"
          />
          <ellipse cx="160" cy="70" rx="105" ry="17" strokeDasharray="34 5" />
          <path
            d="M72 57L88 63M248 57L232 63M72 83L88 77M248 83L232 77M116 49L123 56M204 49L197 56"
            strokeWidth="2"
          />
          {[
            [53, 70],
            [88, 85],
            [232, 85],
            [267, 70],
          ].map(([x, y]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <path d="M-5-2L0-5L5-2V3L0 6L-5 3Z" fill={dark} stroke={light} />
              <path d="M-2 0H2" stroke={light} />
            </g>
          ))}
        </>
      )
    case 'fairy':
      return (
        <g stroke={light}>
          <path
            d="M48 73Q62 48 82 69M238 69Q258 48 273 73M96 89Q160 104 226 89"
            strokeDasharray="2 5"
          />
          {[
            [61, 55],
            [260, 54],
            [105, 88],
            [217, 87],
          ].map(([x, y], index) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <path
                className="mote"
                d="M0-7L2-2L7 0L2 2L0 7L-2 2L-7 0L-2-2Z"
                fill={index % 2 ? petal : light}
              />
            </g>
          ))}
          <g fill={petal} stroke="none">
            <ellipse
              cx="83"
              cy="79"
              rx="5"
              ry="2"
              transform="rotate(-20 83 79)"
            />
            <ellipse
              cx="238"
              cy="81"
              rx="5"
              ry="2"
              transform="rotate(22 238 81)"
            />
          </g>
        </g>
      )
    default:
      return (
        <g fill={light} stroke="none" opacity="0.55">
          {[
            [73, 72],
            [247, 75],
          ].map(([x, y]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <ellipse cy="4" rx="7" ry="4.5" />
              <circle cx="-7" cy="-3" r="2.6" />
              <circle cx="-2" cy="-6" r="2.6" />
              <circle cx="4" cy="-6" r="2.6" />
              <circle cx="9" cy="-2" r="2.6" />
            </g>
          ))}
        </g>
      )
  }
}

export function HabitatMotif({
  type,
  colors,
  secondary = false,
}: {
  type: string
  colors: Colors
  secondary?: boolean
}) {
  return (
    <g
      data-motif={type}
      fill="none"
      stroke={colors.accent}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={secondary ? 0.85 : 0.95}
    >
      {artwork(type, colors)}
    </g>
  )
}

export function HabitatFusion({
  fusion,
  colors,
  secondary,
}: {
  fusion: string | null
  colors: Colors
  secondary: Colors | null
}) {
  if (!fusion || !secondary) return null
  let shapes
  switch (fusion) {
    case 'frozen-lagoon':
      shapes = (
        <g fill={secondary.light} fillOpacity="0.6" stroke={secondary.accent}>
          <path d="M69 74L86 66L105 74L96 84L76 83ZM210 79L227 68L246 75L238 85ZM129 89L142 81L157 86L149 94Z" />
        </g>
      )
      break
    case 'storm-water':
    case 'thundercloud':
      shapes = (
        <g stroke={secondary.light} strokeWidth="1.7">
          <path
            className="electric-arc"
            d="M64 84L82 79L91 85L107 81M214 84L233 78L249 83"
          />
          <path
            d="M48 45L43 52M75 40L70 47M249 36L244 43M279 49L274 56"
            opacity="0.6"
          />
        </g>
      )
      break
    case 'tidal-shore':
      shapes = (
        <path
          d="M42 78Q73 99 132 96M202 95Q249 96 280 78"
          stroke={secondary.accent}
          strokeWidth="5"
          opacity="0.7"
        />
      )
      break
    case 'toxic-garden':
    case 'toxic-undergrowth':
      shapes = (
        <g stroke={secondary.light} strokeWidth="1">
          {[
            [77, 74],
            [236, 80],
            [111, 88],
          ].map(([x, y]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <path d="M0 0V10" strokeWidth="2" />
              <path d="M-10 0Q0-17 10 0Z" fill={secondary.accent} />
              <circle cx="-3" cy="-5" r="1.4" fill={secondary.light} />
              <circle cx="4" cy="-3" r="1" fill={secondary.light} />
            </g>
          ))}
        </g>
      )
      break
    case 'firestorm':
      shapes = (
        <g className="wind-streak" stroke={colors.light} opacity="0.75">
          <path d="M37 78Q52 88 77 80T119 83M204 84Q221 73 244 80T283 70M48 36Q64 29 79 36M243 30Q259 24 276 31" />
        </g>
      )
      break
    case 'magnetic-core':
      shapes = (
        <g stroke={secondary.light} strokeWidth="3">
          <path d="M75 53V64Q83 76 91 64V53M230 53V64Q238 76 246 64V53" />
          <path d="M75 53V58M246 53V58" stroke={colors.accent} />
          <path
            d="M98 60Q160 42 223 60"
            strokeWidth="0.8"
            strokeDasharray="3 5"
          />
        </g>
      )
      break
    case 'soulfire':
      shapes = (
        <g fill={secondary.accent} stroke={secondary.light} fillOpacity="0.45">
          <path
            className="ghost-wisp"
            d="M83 80Q70 68 85 51Q82 68 94 70Q99 78 92 83Z"
          />
          <path
            className="ghost-wisp wisp-delayed"
            d="M227 82Q215 69 231 51Q227 68 239 71Q244 80 235 85Z"
          />
        </g>
      )
      break
    case 'eclipse':
      shapes = (
        <ellipse
          className="eclipse-halo"
          cx="160"
          cy="70"
          rx="97"
          ry="16"
          fill={secondary.dark}
          fillOpacity="0.5"
          stroke={colors.light}
          strokeOpacity="0.55"
        />
      )
      break
    case 'sky-ruins':
      shapes = (
        <g fill={colors.accent} stroke={colors.light}>
          <path className="mote" d="M82 40L89 31L98 42L91 50Z" />
          <path className="mote" d="M220 35L229 24L237 36L228 45Z" />
        </g>
      )
      break
    case 'canyon':
      shapes = (
        <>
          <path
            d="M69 71L105 64L127 75L164 67L190 82L237 72"
            stroke={colors.dark}
            strokeWidth="4"
          />
          <path
            d="M69 69L105 62L127 73L164 65L190 80L237 70"
            stroke={secondary.light}
            strokeWidth="1"
          />
        </>
      )
      break
    case 'blizzard':
      shapes = (
        <g stroke={colors.light} strokeWidth="1.1">
          {[
            [82, 43],
            [239, 38],
            [264, 84],
          ].map(([x, y]) => (
            <path
              className="mote"
              key={x}
              d={`M${x - 5} ${y}h10M${x - 3} ${y - 4}l6 8M${x + 3} ${y - 4}l-6 8`}
            />
          ))}
        </g>
      )
      break
    case 'enchanted-garden':
      shapes = (
        <path
          d="M86 58Q160 26 237 58M101 90Q159 103 219 90"
          stroke={secondary.light}
          strokeDasharray="2 6"
          opacity="0.65"
        />
      )
      break
    default:
      return null
  }
  return (
    <g
      data-fusion={fusion}
      fill="none"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes}
    </g>
  )
}
