import { css } from 'styled-components'

export default {
  prefix: 'style',
  data: {
    color: {
      dark: '#020100',
      yellow: '#f1d302',
      blue: '#235789',
      white: '#fdfffc',
    },
    screen: {
      mobile: '320px',
      tablet: '768px',
      laptop: '1024px',
      desktop: '2560px',
    },
    mixins: {
      liquid_glass: css`
        background: rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        box-shadow: 0 4px 30px rgba(0, 152, 104, 0.3);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      `,
    },
  },
}
