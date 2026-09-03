import { processAIRequest } from '../../src/modules/ai/services/aiServiceClient'

describe('AI service client', () => {
  const context = {
    schoolId: 'school-1',
    userId: 'user-1',
    roles: ['teacher'],
    requestType: 'school_policy_query',
    payload: {},
    authorizedContext: {},
  }

  beforeEach(() => {
    process.env.AI_SERVICE_URL = 'http://ai-service:8000/'
    process.env.AI_SERVICE_KEY = 'shared-key'
  })

  it('sends the already-authorized context with the internal service key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ requestType: context.requestType, result: {}, sources: [], status: 'ok' }),
    })
    global.fetch = fetchMock

    await processAIRequest(context)

    expect(fetchMock).toHaveBeenCalledWith('http://ai-service:8000/ai/process', expect.objectContaining({
      headers: expect.objectContaining({ 'X-Service-Key': 'shared-key' }),
      body: JSON.stringify(context),
    }))
  })
})
