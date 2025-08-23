import { configureStore } from "@reduxjs/toolkit";
import duplicatesSlice from "./slices/duplicatesSlice";

export const store = configureStore({
  reducer: {
    duplicates: duplicatesSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
