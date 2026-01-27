import { configureStore } from '@reduxjs/toolkit'
import blogApi from 'app/apis/blog'
import pokemonApi from 'app/apis/pokemon'

const store = configureStore({
  reducer: {
    [pokemonApi.reducerPath]: pokemonApi.reducer,
    [blogApi.reducerPath]: blogApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(pokemonApi.middleware)
      .concat(blogApi.middleware),
})

export default store
