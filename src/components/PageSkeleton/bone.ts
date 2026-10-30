import { css } from 'styled-components'

/**
 * Shared skeleton pieces. A `.bone` is a block of the size its real
 * content will take, with one soft sweep of light running across it.
 * Light pages use the default tone; dark surfaces set `data-tone="dark"`
 * on the skeleton root or on any block inside it.
 */
export const boneCss = css`
  .bone {
    --bone: #e3e9f0;
    --shine: #f5f8fb;
    display: block;
    flex: none;
    border-radius: 8px;
    background: linear-gradient(
        100deg,
        var(--bone) 35%,
        var(--shine) 50%,
        var(--bone) 65%
      )
      var(--bone);
    background-size: 300% 100%;
    animation: bone-sweep 1.6s ease-in-out infinite;
  }
  &[data-tone='dark'] .bone,
  [data-tone='dark'] .bone {
    --bone: rgba(255, 255, 255, 0.08);
    --shine: rgba(255, 255, 255, 0.17);
  }
  .bone--round {
    border-radius: 50%;
  }
  .bone--pill {
    border-radius: 999px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @keyframes bone-sweep {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bone {
      animation: none;
    }
  }
`
