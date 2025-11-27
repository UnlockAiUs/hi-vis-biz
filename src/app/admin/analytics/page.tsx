/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/analytics/page.tsx
 * PURPOSE: Analytics dashboard with org overview, morale trends, pain themes, department comparison
 * FETCHES: /api/analytics/org, /api/analytics/departments
 * USES: recharts for LineChart, BarChart, PieChart
 */
'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface OrgAnalytics {
  overview: {
    totalMembers: number
    completedSessions: number
    pendingSessions: number
    sessionsThisWeek: number
    responseRate: number
  }
  metrics: {
    avgMorale: number | null
    avgWorkload: number | null
  }
  moraleTrend: { week: string; avgMorale: number; count: number }[]
  topPainThemes: { theme: string; count: number }[]
}

interface DepartmentAnalytics {
  id: string
  name: string
  memberCount: number
  completedSessions: number
  responseRate: number
  avgMorale: number | null
  avgWorkload: number | null
  topPainThemes: { theme: string; count: number }[]
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AnalyticsPage() {
  const [orgData, setOrgData] = useState<OrgAnalytics | null>(null)
  const [deptData, setDeptData] = useState<DepartmentAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'departments'>('overview')

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [orgRes, deptRes] = await Promise.all([
          fetch('/api/analytics/org'),
          fetch('/api/analytics/departments')
        ])

        if (!orgRes.ok) {
          const err = await orgRes.json()
          throw new Error(err.error || 'Failed to fetch org analytics')
        }
        if (!deptRes.ok) {
          const err = await deptRes.json()
          throw new Error(err.error || 'Failed to fetch department analytics')
        }

        const orgJson = await orgRes.json()
        const deptJson = await deptRes.json()

        setOrgData(orgJson)
        setDeptData(deptJson.departments || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Organization Overview
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'departments'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          By Department
        </button>
      </div>

      {activeTab === 'overview' && orgData && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Members"
              value={orgData.overview.totalMembers}
              color="blue"
            />
            <StatCard
              title="Completed Sessions"
              value={orgData.overview.completedSessions}
              color="green"
            />
            <StatCard
              title="Pending Sessions"
              value={orgData.overview.pendingSessions}
              color="yellow"
            />
            <StatCard
              title="Sessions This Week"
              value={orgData.overview.sessionsThisWeek}
              color="purple"
            />
            <StatCard
              title="Response Rate"
              value={`${orgData.overview.responseRate}%`}
              color="pink"
            />
          </div>

          {/* Morale & Workload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Average Morale</h2>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600">
                    {orgData.metrics.avgMorale !== null
                      ? orgData.metrics.avgMorale
                      : '—'}
                  </div>
                  <div className="text-gray-500 mt-2">out of 5</div>
                </div>
              </div>
              {orgData.metrics.avgMorale !== null && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${(orgData.metrics.avgMorale / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Average Workload</h2>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600">
                    {orgData.metrics.avgWorkload !== null
                      ? orgData.metrics.avgWorkload
                      : '—'}
                  </div>
                  <div className="text-gray-500 mt-2">out of 5</div>
                </div>
              </div>
              {orgData.metrics.avgWorkload !== null && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-600 h-3 rounded-full"
                      style={{ width: `${(orgData.metrics.avgWorkload / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Morale Trend Chart */}
          {orgData.moraleTrend.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Morale Trend (Last 30 Days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={orgData.moraleTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis domain={[0, 5]} />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return `Week of ${date.toLocaleDateString()}`
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgMorale"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Average Morale"
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Pain Themes */}
          {orgData.topPainThemes.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Top Pain Points</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={orgData.topPainThemes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="theme"
                      label={({ theme, percent }) =>
                        `${theme} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {orgData.topPainThemes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {orgData.topPainThemes.map((theme, index) => (
                    <div key={theme.theme} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium">{theme.theme}</span>
                      </div>
                      <span className="text-gray-600">{theme.count} mentions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Data State */}
          {orgData.moraleTrend.length === 0 && orgData.topPainThemes.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-gray-400 text-lg mb-2">No session data yet</div>
              <p className="text-gray-500">
                Analytics will appear here once employees complete their check-in sessions.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="space-y-6">
          {deptData.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-gray-400 text-lg mb-2">No departments found</div>
              <p className="text-gray-500">
                Create departments and assign members to see department-level analytics.
              </p>
            </div>
          ) : (
            <>
              {/* Department Comparison Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Department Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deptData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" domain={[0, 5]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="avgMorale"
                      fill="#3B82F6"
                      name="Avg Morale (0-5)"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="responseRate"
                      fill="#10B981"
                      name="Response Rate (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deptData.map((dept) => (
                  <div key={dept.id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">{dept.name}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Members</span>
                        <span className="font-medium">{dept.memberCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed Sessions</span>
                        <span className="font-medium">{dept.completedSessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Response Rate</span>
                        <span className="font-medium">{dept.responseRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Morale</span>
                        <span className="font-medium">
                          {dept.avgMorale !== null ? dept.avgMorale : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Workload</span>
                        <span className="font-medium">
                          {dept.avgWorkload !== null ? dept.avgWorkload : '—'}
                        </span>
                      </div>
                      {dept.topPainThemes.length > 0 && (
                        <div className="pt-3 border-t">
                          <div className="text-sm text-gray-500 mb-2">Top Pain Points:</div>
                          <div className="flex flex-wrap gap-2">
                            {dept.topPainThemes.map((theme) => (
                              <span
                                key={theme.theme}
                                className="px-2 py-1 bg-red-50 text-red-700 text-sm rounded"
                              >
                                {theme.theme} ({theme.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  color
}: {
  title: string
  value: string | number
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'pink'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    pink: 'bg-pink-50 text-pink-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[1]}`}>
        {value}
      </div>
    </div>
  )
}
