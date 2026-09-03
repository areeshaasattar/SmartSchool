export interface AIRequestContext {
  schoolId: string
  userId: string
  roles: string[]
  requestType: string
  payload: Record<string, unknown>
  authorizedContext: Record<string, unknown>
}

export interface AIResponse {
  requestType: string
  result: Record<string, unknown>
  sources: Record<string, unknown>[]
  status: 'ok' | 'error'
}

export class AIServiceClientError extends Error {
  constructor(message: string, public readonly statusCode = 502) {
    super(message)
  }
}

export async function processAIRequest(context: AIRequestContext): Promise<AIResponse> {
  const serviceUrl = process.env.AI_SERVICE_URL
  const serviceKey = process.env.AI_SERVICE_KEY

  if (!serviceUrl || !serviceKey) {
    throw new AIServiceClientError('AI service is not configured', 503)
  }

  let response: Response
  try {
    response = await fetch(`${serviceUrl.replace(/\/$/, '')}/ai/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': serviceKey },
      body: JSON.stringify(context),
    })
  } catch {
    throw new AIServiceClientError('AI service is unavailable')
  }

  if (!response.ok) {
    throw new AIServiceClientError('AI service rejected the request')
  }

  return response.json() as Promise<AIResponse>
}
