import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DuplicatesState {
  selectedContactForTwoGroup: { [groupId: number]: number | null };
}

const initialState: DuplicatesState = {
  selectedContactForTwoGroup: {},
};

const duplicatesSlice = createSlice({
  name: "duplicates",
  initialState,
  reducers: {
    setSelectedContact: (
      state: DuplicatesState,
      action: PayloadAction<{ groupId: number; contactId: number | null }>
    ) => {
      const { groupId, contactId } = action.payload;
      if (contactId === null) {
        delete state.selectedContactForTwoGroup[groupId];
      } else {
        // Toggle selection - if same contact is selected, deselect it
        if (state.selectedContactForTwoGroup[groupId] === contactId) {
          delete state.selectedContactForTwoGroup[groupId];
        } else {
          state.selectedContactForTwoGroup[groupId] = contactId;
        }
      }
    },
    clearAllSelections: (state: DuplicatesState) => {
      state.selectedContactForTwoGroup = {};
    },
    clearSelectionsByGroupIds: (
      state: DuplicatesState,
      action: PayloadAction<number[]>
    ) => {
      action.payload.forEach((groupId: number) => {
        delete state.selectedContactForTwoGroup[groupId];
      });
    },
  },
});

export const {
  setSelectedContact,
  clearAllSelections,
  clearSelectionsByGroupIds,
} = duplicatesSlice.actions;
export default duplicatesSlice.reducer;
