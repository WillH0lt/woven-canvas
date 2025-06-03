import { createStore } from 'zustand/vanilla'

interface IColorState {
  color: string
}

interface IColorActions {
  setColor: (color: string) => void
}

export const useColorStore = createStore<IColorState & IColorActions>((set) => ({
  color: '#000000',
  setColor: (color: string) => {
    console.log('Setting color:', color)
    set({ color })
  },
}))

export const { getState, setState, subscribe } = useColorStore
