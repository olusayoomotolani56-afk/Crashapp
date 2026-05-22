import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import { relativeTime } from '../utils/time'

const SEVERITY_COLOR = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef6c00',
  Critical: '#ef4444'
}

function SingleReport() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authorAvatarFailed, setAuthorAvatarFailed] = useState(false)
  const { user, isAuth } = useAuth()
  const { confirm, toast } = useUI()
  const navigate = useNavigate()

  const fetchReport = async () => {
    try {
      const res = await api.get(`/api/reports/${id}`)
      setReport(res.data)
    } catch {
      setError('Report not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [id])

  const handleUpvote = async () => {
    if (!isAuth) {
      toast('Log in to upvote reports', { tone: 'warn' })
      navigate('/login')
      return
    }
    try {
      if (report.has_upvoted) {
        await api.delete(`/api/reports/${id}/upvote`)
      } else {
        await api.post(`/api/reports/${id}/upvote`)
      }
      fetchReport()
    } catch (err) {
      toast(err.response?.data?.error || 'Something went wrong', { tone: 'error' })
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this report?',
      message: 'This action can\'t be undone.',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return
    try {
      await api.delete(`/api/reports/${id}`)
      toast('Report deleted', { tone: 'success' })
      navigate('/')
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

  if (loading) return (
    <div className="page-container">
      <div className="skeleton-card">
        <div className="skeleton" style={{ height: 26, width: '70%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 100, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
      </div>
    </div>
  )

  if (error) return (
    <div className="page-container">
      <p className="error-msg">{error}</p>
      <Link to="/" className="back-link">← Back to Feed</Link>
    </div>
  )

  const isOwner = user && user.id === report.user_id
  const authorInitial = report.author_name?.[0]?.toUpperCase() || '?'
  const showAuthorAvatar = report.author_avatar_url && !authorAvatarFailed
  const severityColor = SEVERITY_COLOR[report.severity] || 'var(--brand)'

  return (
    <div className="page-container">
      <Link to="/" className="back-link">← Back to Feed</Link>

      <div className="report-detail" style={{ borderTop: `4px solid ${severityColor}` }}>
        <div className="report-detail-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="report-detail-title">{report.title}</h2>
            <div className="report-detail-tool">{report.tool_name}</div>
            <div>
              <span className={severityClass(report.severity)}>{report.severity}</span>
              <span className={`badge ${report.status === 'Ongoing' ? 'badge-ongoing' : 'badge-resolved'}`}>
                {report.status}
              </span>
            </div>
          </div>
          {isOwner ? (
            <span className="upvote-btn upvote-btn-disabled" title="You cannot upvote your own report">
              ▲ {report.upvote_count}
            </span>
          ) : (
            <button
              className={`upvote-btn ${report.has_upvoted ? 'upvoted' : ''}`}
              onClick={handleUpvote}
              title={report.has_upvoted ? 'Remove upvote' : 'Upvote this report'}
            >
              ▲ {report.upvote_count}
            </button>
          )}
        </div>

        {report.description ? (
          <div className="report-detail-body">{report.description}</div>
        ) : (
          <div className="report-detail-body" style={{ color: 'var(--soft)', fontStyle: 'italic' }}>
            No description provided.
          </div>
        )}

        {report.screenshot_url && (
          <img
            src={report.screenshot_url}
            alt="Screenshot"
            style={{
              maxWidth: '100%',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              border: '1px solid var(--line)'
            }}
          />
        )}

        <div className="report-detail-footer">
          <Link to={`/users/${report.user_id}`} className="author-chip">
            {showAuthorAvatar ? (
              <img
                src={report.author_avatar_url}
                alt={report.author_name}
                className="author-chip-avatar"
                onError={() => setAuthorAvatarFailed(true)}
              />
            ) : (
              <span className="author-chip-avatar author-chip-avatar-fallback">
                {authorInitial}
              </span>
            )}
            <div className="author-chip-text">
              <div className="author-chip-name">{report.author_name}</div>
              <div
                className="author-chip-time"
                title={new Date(report.created_at).toLocaleString()}
              >
                {relativeTime(report.created_at)}
              </div>
            </div>
          </Link>

          {isOwner && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to={`/reports/${id}/edit`}>
                <button className="btn-outline">Edit</button>
              </Link>
              <button onClick={handleDelete} className="btn-danger">Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SingleReport
