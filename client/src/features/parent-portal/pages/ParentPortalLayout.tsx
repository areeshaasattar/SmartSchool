import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../../store'
import { selectChild } from '../../../store'
import api from '../../../services/api'

interface Child {
  id: string
  firstName: string
  lastName: string
  classId: string | null
  sectionId: string | null
}

const ParentPortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch()
  const selectedChildId = useSelector((state: RootState) => state.parentPortal.selectedChildId)
  const location = useLocation()
  const [childrenList, setChildrenList] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await api.get('/parent-portal/children')
        setChildrenList(response.data.children || [])
        if (response.data.children?.length > 0 && !selectedChildId) {
          dispatch(selectChild(response.data.children[0].id))
        }
      } catch (error) {
        console.error('Failed to fetch children:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchChildren()
  }, [dispatch, selectedChildId])

  const handleChildChange = (childId: string) => {
    dispatch(selectChild(childId))
  }

  const navItems = [
    { path: '/portal', label: 'Dashboard', icon: '📊' },
    { path: '/portal/attendance', label: 'Attendance', icon: '📅' },
    { path: '/portal/homework', label: 'Homework', icon: '📝' },
    { path: '/portal/results', label: 'Results', icon: '📈' },
    { path: '/portal/fees', label: 'Fees', icon: '💰' },
    { path: '/portal/messages', label: 'Messages', icon: '✉️' },
    { path: '/portal/leave', label: 'Leave', icon: '🏖️' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading portal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with children selector */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-gray-900">Parent Portal</h1>

            {childrenList.length > 0 && (
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Select Child:</label>
                <select
                  value={selectedChildId || ''}
                  onChange={(e) => handleChildChange(e.target.value)}
                  className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {childrenList.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/portal' && location.pathname.startsWith(item.path))
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default ParentPortalLayout
