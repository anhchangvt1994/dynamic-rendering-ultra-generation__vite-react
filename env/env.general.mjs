export default {
  prefix: '',
  data: {
    greeting: 'React 18',
    dev: process.env.NODE_ENV === 'development',
    PROD: process.env.NODE_ENV === 'production',
  },
}
