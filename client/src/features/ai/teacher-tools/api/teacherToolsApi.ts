import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type QuestionType = 'mcq' | 'short_answer' | 'essay'
export type DraftStatus = 'generated' | 'edited' | 'approved' | 'discarded'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  question: string
  type: QuestionType
  options?: string[]
  correctAnswer: string
  explanation: string
}

export interface GeneratedContent {
  questions: Question[]
}

export interface RequestParams {
  topic: string
  difficulty: Difficulty
  questionCount: number
  questionTypes: QuestionType[]
}

export interface AIDraft {
  _id: string
  draftType: 'quiz' | 'assignment_description'
  requestParams: RequestParams
  generatedContent: GeneratedContent
  status: DraftStatus
  reviewedAt?: string
  publishedAssignmentId?: string
  createdAt: string
  updatedAt: string
  classId?: { _id: string; grade: string; section: string }
  subjectId?: { _id: string; name: string; code: string }
  publishedAssignmentIdPopulated?: { _id: string; title: string; status: string }
  teacherId?: { profile: { firstName: string; lastName: string } }
}

export interface GenerateQuizDto {
  classId: string
  subjectId: string
  topic: string
  difficulty: Difficulty
  questionCount: number
  questionTypes: QuestionType[]
}

export interface PatchDraftDto {
  questions: Question[]
}

export interface ApproveDraftDto {
  title?: string
  dueDate: string
  maxMarks: number
  academicYearId: string
}

export interface ApproveDraftResponse {
  draft: AIDraft
  assignmentId: string
}

export const teacherToolsApi = createApi({
  reducerPath: 'teacherToolsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/ai/teacher-tools' }),
  tagTypes: ['Drafts'],
  endpoints: (build) => ({
    generateQuiz: build.mutation<AIDraft, GenerateQuizDto>({
      query: (body) => ({ url: '/quiz/generate', method: 'POST', body }),
      invalidatesTags: [{ type: 'Drafts', id: 'LIST' }],
    }),

    listDrafts: build.query<{
      drafts: AIDraft[]
      total: number
      page: number
      limit: number
      totalPages: number
    }, { status?: DraftStatus; page?: number; limit?: number }>({
      query: ({ status, page = 1, limit = 20 } = {}) => {
        const params = new URLSearchParams()
        if (status) params.set('status', status)
        params.set('page', String(page))
        params.set('limit', String(limit))
        return { url: '/drafts', params }
      },
      providesTags: (_result, _error, { status }) => [
        { type: 'Drafts', id: status ?? 'ALL' },
        { type: 'Drafts', id: 'LIST' },
      ],
    }),

    getDraft: build.query<AIDraft, string>({
      query: (id) => `/drafts/${id}`,
      providesTags: (result) => (result ? [{ type: 'Drafts', id: result._id }] : []),
    }),

    patchDraft: build.mutation<AIDraft, { id: string; body: PatchDraftDto }>({
      query: ({ id, body }) => ({ url: `/drafts/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Drafts', id }],
    }),

    discardDraft: build.mutation<AIDraft, string>({
      query: (id) => ({ url: `/drafts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Drafts', id }],
    }),

    approveDraft: build.mutation<ApproveDraftResponse, { id: string; body: ApproveDraftDto }>({
      query: ({ id, body }) => ({ url: `/drafts/${id}/approve`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Drafts', id }],
    }),
  }),
})

export const {
  useGenerateQuizMutation,
  useListDraftsQuery,
  useGetDraftQuery,
  usePatchDraftMutation,
  useDiscardDraftMutation,
  useApproveDraftMutation,
} = teacherToolsApi
