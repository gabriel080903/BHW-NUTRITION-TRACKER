import { useState } from 'react'
import { motion } from 'framer-motion'

// Credentials — update these to change account passwords
// In production: replace with server-side bcrypt verification
const ACCOUNTS = {
  admin:    { id:1, password:'bhw2026!',  role:'Admin',          displayRole:'Administrator'    },
  bhwstaff: { id:2, password:'staff2026', role:'BHW',            displayRole:'BHW Staff'        },
  parent:   { id:3, password:'parent123', role:'Parent/Guardian', displayRole:'Parent/Guardian'  },
}

export default function Login({ onLogin }) {
  const [form,    setForm]    = useState({ username: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))

    const username = form.username.trim().toLowerCase()
    const account  = ACCOUNTS[username]

    if (!account || account.password !== form.password) {
      setError('Invalid username or password.')
      setLoading(false)
      return
    }

    const session = {
      id:       account.id,
      username,
      role:     account.role,
      loginAt:  new Date().toISOString(),
    }
    localStorage.setItem('bhw_user', JSON.stringify(session))
    onLogin(session)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-800/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-400 rounded-2xl shadow-lg shadow-emerald-900/50 mb-4">
            <svg className="w-9 h-9 text-emerald-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">BHW Nutrition Tracker</h1>
          <p className="text-emerald-400 text-sm font-medium mt-1">Barangay Health System · React + Vite</p>
        </div>

        {/* Login card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-6">Sign in to continue</h2>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                className="mb-4 px-4 py-3 bg-red-500/20 border border-red-400/30 rounded-xl text-sm text-red-300 font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </motion.div>
            )}

            <div className="mb-4">
              <label className="block text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
              <input type="text" name="username" value={form.username} onChange={handleChange}
                autoComplete="username" placeholder="Enter username" disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all disabled:opacity-50" />
            </div>

            <div className="mb-6">
              <label className="block text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  autoComplete="current-password" placeholder="Enter password" disabled={loading}
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all disabled:opacity-50" />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors text-base">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg> Signing in…</>
              ) : '🔐 Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-emerald-600 text-xs mt-4">
          Contact your administrator for access credentials
        </p>
      </motion.div>
    </div>
  )
}
