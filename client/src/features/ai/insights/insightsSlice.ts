import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { InsightType } from './api/insightsApi'

interface InsightsState {
  /** Currently expanded/selected insight in the UI. */
  selectedInsightId: string | null
  /** Last insight type whose generate button was pressed (for per-type spinners). */
  pendingType: InsightType | null
}

const initialState: InsightsState = {
  selectedInsightId: null,
  pendingType: null,
}

const insightsSlice = createSlice({
  name: 'insights',
  initialState,
  reducers: {
    selectInsight(state, action: PayloadAction<string | null>) {
      state.selectedInsightId = action.payload
    },
    setPendingType(state, action: PayloadAction<InsightType | null>) {
      state.pendingType = action.payload
    },
  },
})

export const { selectInsight, setPendingType } = insightsSlice.actions
export default insightsSlice.reducer
