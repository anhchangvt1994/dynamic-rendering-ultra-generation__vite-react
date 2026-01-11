import { configureStore } from '@reduxjs/toolkit'
import pokemonApi from 'app/apis/pokemon'

const store = configureStore({
  reducer: {
    [pokemonApi.reducerPath]: pokemonApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(pokemonApi.middleware),
})

export default store
