import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import { useUI } from '../context/UIContext'

const COMMON_TOOLS = [
  'Vercel', 'Netlify', 'GitHub', 'GitLab', 'Supabase', 'Firebase',
  'AWS', 'Cloudflare', 'Render', 'Railway', 'npm', 'Docker',
  'Stripe', 'OpenAI', 'Anthropic', 'Linear', 'Notion', 'Slack'
]

const SEVERITIES = [
  { value: 'Low',      label: 'Low',      dot: '#10b981', desc: 'Minor — workaround exists' },
  { value: 'Medium',   label: 'Medium',   dot: '#f59e0b', desc: 'Noticeable impact' },
  { value: 'High',     label: 'High',     dot: '#ef6c00', desc: 'Blocking many users' },
  { value: 'Critical', label: 'Critical', dot: '#ef4444', desc: 'Service down' }
]

const STATUSES = [
  { value: 'Ongoing',  label: 'Ongoing',  dot: '#ef4444' },
  { value: 'Resolved', label: 'Resolved', dot: '#10b981' }
]

const DESC_MAX = 2000

function FileReport() {
  const [toolName, setToolName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('Low')
  const [status, setStatus] = useState('Ongoing')
  const [screenshot, setScreenshot] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useUI()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('tool_name', toolName.trim())
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('severity', severity)
      formData.append('status', status)
      if (screenshot) formData.append('screenshot', screenshot)

      await api.post('/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast('Report filed', { tone: 'success' })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <Link to="/" className="back-link">← Back to Feed</Link>

      <div className="form-container" style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.4px' }}>
            File a Report
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: '6px', fontSize: '14px' }}>
            Share a bug or outage so others can track it.
          </p>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tool name</label>
            <input
              type="text"
              list="tool-suggestions"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g. Vercel, GitHub, Supabase"
              required
              maxLength={60}
            />
            <datalist id="tool-suggestions">
              {COMMON_TOOLS.map((t) => <option key={t} value={t} />)}
            </datalist>
            <p className="field-hint">Pick from the list or type your own.</p>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, specific summary of the issue"
              required
              maxLength={120}
            />
            <p className="field-hint">{title.length}/120</p>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? Steps to reproduce, error messages, environment..."
              required
              rows={6}
              maxLength={DESC_MAX}
            />
            <p className="field-hint">{description.length}/{DESC_MAX}</p>
          </div>

          <div className="form-group">
            <label>Severity</label>
            <div className="segmented">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`seg ${severity === s.value ? 'seg-active' : ''}`}
                  onClick={() => setSeverity(s.value)}
                >
                  <span className="seg-dot" style={{ background: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
            <p className="field-hint">
              {SEVERITIES.find((s) => s.value === severity)?.desc}
            </p>
          </div>

          <div className="form-group">
            <label>Status</label>
            <div className="segmented">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`seg ${status === s.value ? 'seg-active' : ''}`}
                  onClick={() => setStatus(s.value)}
                >
                  <span className="seg-dot" style={{ background: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Screenshot <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => setScreenshot(e.target.files[0] || null)}
            />
            <p className="field-hint">JPG, PNG or GIF. Max 10 MB.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '12px' }}
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default FileReport
