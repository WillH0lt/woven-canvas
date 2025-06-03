// import { create } from 'zustand'

// // import { createStore } from 'zustand/vanilla'

// interface IColorState {
//   color: string
// }

// interface IColorActions {
//   setColor: (color: string) => void
// }

// // export const useColorStore = create<IColorState & IColorActions>((set) => ({
// //   color: '#000000',
// //   setColor: (color: string) => {
// //     console.log('Setting color:', color)
// //     set({ color })
// //   },
// // }))

// create((...a) => ({
//   ...createBearSlice(...a),
//   ...createFishSlice(...a),
//   ...createBearFishSlice(...a),
// }))

// export const { getState, setState, subscribe } = useColorStore
