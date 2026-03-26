import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']

const EMPTY = {
  firstName:'', middleName:'', lastName:'',
  birthDate:'', gender:'', place:'', purok:'', contact:'',
  bloodType:'Unknown', medicalHistory:'',
  allergies:'', medications:'',
  emergencyName:'', emergencyContact:'',
}

// Parse CSV text → array of resident objects
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g,''))

  const map = key => {
    const variants = {
      firstName:   ['firstname','first name','first','fname','given name'],
      lastName:    ['lastname','last name','last','lname','surname','family name'],
      middleName:  ['middlename','middle name','middle','mname'],
      birthDate:   ['birthdate','birth date','dob','date of birth','birthday'],
      gender:      ['gender','sex'],
      place:       ['place','address','barangay','brgy','location'],
      purok:       ['purok','zone','sitio','purok/zone'],
      contact:     ['contact','phone','mobile','telephone','number','cellphone'],
      bloodType:   ['bloodtype','blood type','blood'],
      medicalHistory: ['medicalhistory','medical history','medical','condition','conditions','diagnosis'],
      allergies:   ['allergies','allergy'],
      medications: ['medications','medication','medicine','meds'],
      emergencyName:    ['emergencyname','emergency name','emergency contact name'],
      emergencyContact: ['emergencycontact','emergency contact','emergency number'],
    }
    for (const [field, names] of Object.entries(map._cache || (map._cache = Object.fromEntries(Object.entries(map._raw || {}))))) {
      if (names.includes(key)) return field
    }
    return null
  }

  // Build column → field mapping
  const colMap = {}
  const fieldVariants = {
    firstName:   ['firstname','first name','first','fname','given name','givenname'],
    lastName:    ['lastname','last name','last','lname','surname','family name','familyname'],
    middleName:  ['middlename','middle name','middle','mname'],
    birthDate:   ['birthdate','birth date','dob','date of birth','birthday'],
    gender:      ['gender','sex'],
    place:       ['place','address','barangay','brgy','location'],
    purok:       ['purok','zone','sitio','purok/zone'],
    contact:     ['contact','phone','mobile','telephone','number','cellphone'],
    bloodType:   ['bloodtype','blood type','blood'],
    medicalHistory: ['medicalhistory','medical history','medical','condition','conditions','diagnosis','history'],
    allergies:   ['allergies','allergy'],
    medications: ['medications','medication','medicine','meds'],
    emergencyName:    ['emergencyname','emergency name','emergency contact name'],
    emergencyContact: ['emergencycontact','emergency contact','emergency number','emergencyphone'],
  }

  headers.forEach((h, i) => {
    for (const [field, variants] of Object.entries(fieldVariants)) {
      if (variants.includes(h)) { colMap[i] = field; break }
    }
  })

  const results = []
  for (let li = 1; li < lines.length; li++) {
    // Handle quoted CSV fields
    const row = []
    let inQuote = false, cur = ''
    for (const ch of lines[li] + ',') {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { row.push(cur.trim()); cur = '' }
      else { cur += ch }
    }

    const obj = { ...EMPTY }
    row.forEach((val, i) => {
      if (colMap[i]) obj[colMap[i]] = val
    })

    // Only include rows with at least first or last name
    if (obj.firstName || obj.lastName) {
      results.push({
        ...obj,
        id: Date.now() + li,
        registrationDate: new Date().toISOString(),
        allergies:   obj.allergies ? obj.allergies.split(/[;,]/).map(s=>s.trim()).filter(Boolean) : [],
        medications: obj.medications ? obj.medications.split(/[;,]/).map(s=>s.trim()).filter(Boolean) : [],
        bloodType:   obj.bloodType || 'Unknown',
        vax: [], status: 'active',
        lastUpdated: new Date().toISOString(),
        history: [],
      })
    }
  }
  return results
}

export default function ResidentForm({ onSave, onImport, editResident, onCancelEdit }) {
  const [form, setForm]         = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [saved,  setSaved]      = useState(false)
  const [tab, setTab]           = useState('single') // 'single' | 'bulk'
  const [csvPreview, setCsvPreview] = useState([])
  const [csvError, setCsvError]     = useState('')
  const [importing, setImporting]   = useState(false)
  const fileRef = useRef()

  // Sync form when editResident changes — this is the fix for one-character-at-a-time typing
  // We do NOT use key= prop (which remounts the whole component every edit)
  // Instead we use useEffect to populate form fields when switching to edit mode
  const prevEditId = useRef(null)
  useEffect(() => {
    if (editResident && editResident.id !== prevEditId.current) {
      prevEditId.current = editResident.id
      setForm({
        ...editResident,
        allergies:   Array.isArray(editResident.allergies)   ? editResident.allergies.join(', ')   : editResident.allergies   || '',
        medications: Array.isArray(editResident.medications) ? editResident.medications.join(', ') : editResident.medications || '',
      })
      setErrors({})
      setSaved(false)
    } else if (!editResident && prevEditId.current !== null) {
      prevEditId.current = null
      setForm(EMPTY)
      setErrors({})
      setSaved(false)
    }
  }, [editResident])

  const isEditing = !!editResident

  const set = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName?.trim()) e.firstName = 'Required'
    if (!form.lastName?.trim())  e.lastName  = 'Required'
    if (!form.gender)            e.gender    = 'Required'
    if (!form.birthDate)         e.birthDate = 'Required'
    return e
  }

  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form, isEditing ? editResident.id : null)
    if (!isEditing) { setForm(EMPTY); setErrors({}) }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const handleCSVFile = e => {
    const file = e.target.files[0]
    if (!file) return
    setCsvError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result)
        if (parsed.length === 0) { setCsvError('No valid rows found. Make sure headers include firstName and lastName columns.'); return }
        setCsvPreview(parsed)
      } catch {
        setCsvError('Failed to parse CSV file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleBulkImport = () => {
    if (!csvPreview.length) return
    setImporting(true)
    setTimeout(() => {
      onImport(csvPreview)
      setCsvPreview([])
      setImporting(false)
    }, 300)
  }

  const Field = ({ label, name, type='text', placeholder, required, children }) => (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children || (
        <input type={type} name={name} value={form[name]||''} onChange={set} placeholder={placeholder}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all ${errors[name]?'border-red-300 bg-red-50':'border-slate-200'}`}/>
      )}
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
        <h2 className="text-white font-extrabold text-base tracking-tight">
          {isEditing ? '✏️ Edit Resident' : '➕ Add Resident'}
        </h2>
        <p className="text-emerald-200 text-xs mt-0.5">
          {isEditing ? 'Update resident information' : 'Fill in resident details below'}
        </p>
      </div>

      {/* ── FORM ── */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" name="firstName" required placeholder="Juan"/>
            <Field label="Last Name"  name="lastName"  required placeholder="Dela Cruz"/>
          </div>
          <Field label="Middle Name" name="middleName" placeholder="Santos (optional)"/>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth Date" name="birthDate" type="date" required/>
            <Field label="Gender" name="gender" required>
              <select name="gender" value={form.gender||''} onChange={set}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${errors.gender?'border-red-300':'border-slate-200'}`}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Barangay / Place" name="place" placeholder="e.g. Brgy. San Jose"/>
            <Field label="Purok / Zone" name="purok" placeholder="e.g. Purok 1, Zone 3"/>
          </div>

          <Field label="Contact Number" name="contact" type="tel" placeholder="09XX-XXX-XXXX"/>

          <Field label="Blood Type" name="bloodType">
            <select name="bloodType" value={form.bloodType||'Unknown'} onChange={set}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all">
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Medical History / Notes" name="medicalHistory">
            <textarea name="medicalHistory" value={form.medicalHistory||''} onChange={set} rows={3}
              placeholder="e.g. Hypertension, Diabetes..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none"/>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Allergies"   name="allergies"   placeholder="e.g. Penicillin"/>
            <Field label="Medications" name="medications" placeholder="e.g. Amlodipine"/>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"   name="emergencyName"    placeholder="Contact name"/>
              <Field label="Number" name="emergencyContact" type="tel" placeholder="09XX-XXX-XXXX"/>
            </div>
          </div>

          <div className={`flex gap-2 ${isEditing ? 'flex-row' : ''}`}>
            {isEditing && (
              <button type="button" onClick={onCancelEdit}
                className="flex-1 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            )}
            <motion.button type="submit" whileTap={{scale:0.97}}
              className={`flex-1 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-sm ${
                saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}>
              {saved ? '✅ Saved!' : isEditing ? '💾 Update Resident' : '+ Add Resident'}
            </motion.button>
          </div>
        </form>
    </div>
  )
}
