import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TeacherToolsIndexPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/ai/teacher-tools/drafts', { replace: true })
  }, [navigate])

  return (
    <div className="rounded-xl bg-white p-10 text-center text-secondary-500">
      Loading…
    </div>
  )
}
