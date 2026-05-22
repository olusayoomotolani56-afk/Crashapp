import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import { relativeTime } from '../utils/time'

function Feed() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [tool, setTool] = useState('')
  const [status, setStatus] = useState('')
  const { user, isAuth } = useAuth()
  const { toast } = useUI()
  const navigate = useNavigate()

  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/reports', {
        params: { q: search, tool, status }
      })
      setReports(res.data)
    } catch {
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [search, tool, status])

  const handleUpvote = async (reportId, hasUpvoted) => {
    if (!isAuth) {
      toast('Log in to upvote reports', { tone: 'warn' })
      navigate('/login')
      return
    }
    try {
      if (hasUpvoted) {
        await api.delete(`/api/reports/${reportId}/upvote`)
      } else {
        await api.post(`/api/reports/${reportId}/upvote`)
      }
      fetchReports()
    } catch (err) {
      toast(err.response?.data?.error || 'Something went wrong', { tone: 'error' })
    }
  }

  const severityClass = (severity) => {
    switch (severity) {
      case 'Low': return 'badge badge-low'
      case 'Medium': return 'badge badge-medium'
      case 'High': return 'badge badge-high'
      case 'Critical': return 'badge badge-critical'
      default: return 'badge'
    }
  }

  const renderSkeleton = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 13, width: '30%', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 999 }} />
            <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 999 }} />
          </div>
          <div className="skeleton" style={{ height: 12, width: '40%', marginTop: 14 }} />
        </div>
      ))}
    </>
  )

  if (error) return (
    <div className="page-container">
      <p className="error-msg">{error}</p>
    </div>
  )

  const visibleReports = isAuth ? reports : reports.slice(0, 3)

  return (
    <div className="page-container">
      <div className="feed-hero">
        <h1>Latest Outages & Bugs</h1>
        <p>Track and report issues with your favorite developer tools.</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍  Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by tool"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        renderSkeleton()
      ) : reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
          <p style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: isAuth ? 16 : 0 }}>
            No reports match your filters yet.
          </p>
          {isAuth && (
            <Link to="/reports/new">
              <button className="btn-primary">+ File the First Report</button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {visibleReports.map((report) => (
            <div key={report.id} className="card">
              <div className="report-card">
                <div className="report-card-body">
                  <Link to={`/reports/${report.id}`}>
                    <h3 className="report-title">{report.title}</h3>
                  </Link>
                  <div className="report-tool">{report.tool_name}</div>
                  <div>
                    <span className={severityClass(report.severity)}>{report.severity}</span>
                    <span className={`badge ${report.status === 'Ongoing' ? 'badge-ongoing' : 'badge-resolved'}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="report-meta">
                    By <Link to={`/users/${report.user_id}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
                      {report.author_name}
                    </Link> • <span title={new Date(report.created_at).toLocaleString()}>
                      {relativeTime(report.created_at)}
                    </span>
                  </p>
                </div>
                {user && user.id === report.user_id ? (
                  <span className="upvote-btn upvote-btn-disabled" title="You cannot upvote your own report">
                    ▲ {report.upvote_count}
                  </span>
                ) : (
                  <button
                    className={`upvote-btn ${report.has_upvoted ? 'upvoted' : ''}`}
                    onClick={() => handleUpvote(report.id, report.has_upvoted)}
                  >
                    ▲ {report.upvote_count}
                  </button>
                )}
              </div>
            </div>
          ))}

          {!isAuth && reports.length > 3 && (
            <div className="card" style={{
              textAlign: 'center',
              padding: '40px 24px',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #eef0ff 100%)',
              border: '2px dashed #c7c4ff'
            }}>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>
                {reports.length - 3} more reports waiting
              </h3>
              <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '14px' }}>
                Sign up to see every outage, upvote issues you've hit, and file your own reports.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register"><button className="btn-primary">Sign Up Free</button></Link>
                <Link to="/login"><button className="btn-outline">Log In</button></Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Feed
