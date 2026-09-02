import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// In-memory access token
let accessToken: string | null = null

// Active tenant (school) ID
let activeSchoolId: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function setActiveSchoolId(schoolId: string | null) {
  activeSchoolId = schoolId
  if (schoolId) {
    localStorage.setItem('activeSchoolId', schoolId)
  } else {
    localStorage.removeItem('activeSchoolId')
  }
}

export function getActiveSchoolId() {
  return activeSchoolId
}

// Restore from localStorage on load
const storedSchoolId = localStorage.getItem('activeSchoolId')
if (storedSchoolId) {
  activeSchoolId = storedSchoolId
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach access token and tenant header
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    if (activeSchoolId) {
      config.headers['X-School-Id'] = activeSchoolId
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor - auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken: newAccessToken } = response.data
          setAccessToken(newAccessToken)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          return api(originalRequest)
        } catch {
          // Refresh failed - clear tokens and redirect to login
          setAccessToken(null)
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('activeSchoolId')
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api
