'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface AuditFormData {
  moisture_content: string
  size_grade: string
  defect_score: string
  colour_uniformity: string
  avg_weight_grams: string
  pesticide_residue: string
  storage_condition: string
  packaging_type: string
  auditor_notes: string
}

interface AuditRecord {
  id: string
  fpo_yield_id: string
  overall_grade: string
  is_certified: boolean
  certified_at?: string
  moisture_content?: number
  size_grade?: string
  defect_score?: number
  colour_uniformity?: number
  pesticide_residue?: string
  storage_condition?: string
  packaging_type?: string
  auditor_notes?: string
  image_urls: string[]
  created_at: string
  fpo_yield?: {
    crop_type: string
    variety?: string
    available_quantity: number
    price_per_kg: number
    location_name?: string
    fpo?: { full_name: string; location?: string; phone?: string }
  }
  auditor?: { full_name: string }
}

interface QualityAuditFormProps {
  fpoYieldId: string
  auditorId: string
  onSuccess?: (audit: AuditRecord) => void
}

// ─────────────────────────────────────────────────────────────────
// Grade badge styling
// ─────────────────────────────────────────────────────────────────
const gradeConfig: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  'A+': { label: 'A+  Premium', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', icon: '🏆' },
  'A':  { label: 'A   Grade A',  bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-300',   icon: '✅' },
  'B':  { label: 'B   Grade B',  bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-300',  icon: '⚡' },
  'C':  { label: 'C   Grade C',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-300',  icon: '⚠️' },
  'Rejected': { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', icon: '❌' },
}

// ─────────────────────────────────────────────────────────────────
// Quality Certificate Card (buyer-facing view)
// ─────────────────────────────────────────────────────────────────
function QualityCertificate({ audit }: { audit: AuditRecord }) {
  const grade = gradeConfig[audit.overall_grade] ?? gradeConfig['B']
  const yield_ = audit.fpo_yield

  return (
    <div className="bg-white rounded-2xl border-2 border-green-200 shadow-lg overflow-hidden">
      {/* Certificate Header */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase opacity-80 mb-1">AgriKart</div>
            <h2 className="text-xl font-extrabold tracking-tight">Quality Certificate</h2>
          </div>
          <div className={`px-4 py-2 rounded-xl font-black text-2xl ${grade.bg} ${grade.text} border-2 ${grade.border} shadow-sm`}>
            {grade.icon} {audit.overall_grade}
          </div>
        </div>
        {audit.is_certified && (
          <div className="mt-3 flex items-center gap-2 text-sm bg-white/20 rounded-lg px-3 py-1.5 w-fit">
            <span className="text-green-200">✓</span>
            <span>Certified {audit.certified_at ? new Date(audit.certified_at).toLocaleDateString('en-IN') : ''}</span>
          </div>
        )}
      </div>

      {/* Crop Details */}
      {yield_ && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500 font-medium mb-0.5">Crop</div>
              <div className="font-bold text-gray-900 capitalize">
                {yield_.crop_type} {yield_.variety ? `(${yield_.variety})` : ''}
              </div>
            </div>
            <div>
              <div className="text-gray-500 font-medium mb-0.5">Available</div>
              <div className="font-bold text-gray-900">{yield_.available_quantity} MT</div>
            </div>
            <div>
              <div className="text-gray-500 font-medium mb-0.5">Price</div>
              <div className="font-bold text-gray-900">₹{yield_.price_per_kg}/kg</div>
            </div>
            <div>
              <div className="text-gray-500 font-medium mb-0.5">FPO</div>
              <div className="font-bold text-gray-900">{yield_.fpo?.full_name ?? '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="px-6 py-4">
        <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">Quality Metrics</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Moisture Content" value={audit.moisture_content != null ? `${audit.moisture_content}%` : '—'} icon="💧" />
          <MetricCard label="Size Grade" value={audit.size_grade ?? '—'} icon="📏" />
          <MetricCard label="Defect Score" value={audit.defect_score != null ? `${audit.defect_score}/10` : '—'} icon="🔍" low={audit.defect_score != null && audit.defect_score > 5} />
          <MetricCard label="Colour Uniformity" value={audit.colour_uniformity != null ? `${audit.colour_uniformity}%` : '—'} icon="🎨" />
          <MetricCard label="Pesticide Test" value={audit.pesticide_residue ?? 'Not Tested'} icon="🧪" low={audit.pesticide_residue === 'Fail'} />
          <MetricCard label="Packaging" value={audit.packaging_type ?? '—'} icon="📦" />
        </div>
      </div>

      {/* Photo Evidence */}
      {audit.image_urls?.length > 0 && (
        <div className="px-6 pb-4">
          <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Photo Evidence</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {audit.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Audit photo ${i + 1}`}
                className="w-24 h-24 object-cover rounded-xl border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auditor Notes */}
      {audit.auditor_notes && (
        <div className="px-6 pb-4">
          <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Auditor Notes</h3>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{audit.auditor_notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>Audited by {audit.auditor?.full_name ?? '—'}</span>
        <span>{new Date(audit.created_at).toLocaleDateString('en-IN')}</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, low }: { label: string; value: string; icon: string; low?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className={`text-sm font-bold ${low ? 'text-red-600' : 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export default function QualityAuditForm({ fpoYieldId, auditorId, onSuccess }: QualityAuditFormProps) {
  const [step, setStep] = useState<'form' | 'uploading' | 'certificate'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([])
  const [savedAudit, setSavedAudit] = useState<AuditRecord | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<AuditFormData>({
    moisture_content: '',
    size_grade: '',
    defect_score: '',
    colour_uniformity: '',
    avg_weight_grams: '',
    pesticide_residue: 'Not Tested',
    storage_condition: '',
    packaging_type: '',
    auditor_notes: '',
  })

  const update = (field: keyof AuditFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  // ── Image upload to Supabase Storage ────────────────────────
  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setStep('uploading')
    setError('')

    const newImages: { url: string; name: string }[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 8 * 1024 * 1024) {
        setError(`File '${file.name}' exceeds 8MB limit`)
        continue
      }

      const ext = file.name.split('.').pop()
      const path = `audits/${fpoYieldId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('crop-audits')
        .upload(path, file, { contentType: file.type })

      if (uploadErr) {
        setError(`Upload failed: ${uploadErr.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('crop-audits').getPublicUrl(path)
      newImages.push({ url: publicUrl, name: file.name })
    }

    setUploadedImages((prev) => [...prev, ...newImages])
    setStep('form')
  }, [fpoYieldId])

  // ── Form submission ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/quality-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fpo_yield_id: fpoYieldId,
          auditor_id: auditorId,
          moisture_content: form.moisture_content ? parseFloat(form.moisture_content) : undefined,
          size_grade: form.size_grade || undefined,
          defect_score: form.defect_score ? parseFloat(form.defect_score) : undefined,
          colour_uniformity: form.colour_uniformity ? parseFloat(form.colour_uniformity) : undefined,
          avg_weight_grams: form.avg_weight_grams ? parseFloat(form.avg_weight_grams) : undefined,
          pesticide_residue: form.pesticide_residue,
          storage_condition: form.storage_condition || undefined,
          packaging_type: form.packaging_type || undefined,
          auditor_notes: form.auditor_notes || undefined,
          image_urls: uploadedImages.map((img) => img.url),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Submission failed')

      setSavedAudit(data.data)
      onSuccess?.(data.data)
      setStep('certificate')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render — Form view
  // ─────────────────────────────────────────────────────────────
  if (step === 'certificate' && savedAudit) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Audit Submitted!</h2>
          <p className="text-gray-500 text-sm mt-1">The quality certificate is now visible to buyers.</p>
        </div>
        <QualityCertificate audit={savedAudit} />
        <button
          onClick={() => { setStep('form'); setSavedAudit(null); setUploadedImages([]) }}
          className="mt-4 w-full text-sm text-gray-500 hover:text-green-600 font-medium transition-colors py-2"
        >
          ← Submit another audit
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">🔬</div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Quality Audit Form</h2>
            <p className="text-xs text-gray-500">FPO Agent — Crop Inspection Record</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Complete this audit to issue a verifiable Quality Certificate for buyers. All fields are optional but improve accuracy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Physical Metrics ────────────────────── */}
        <Section title="Physical Metrics" icon="📊">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Moisture Content (%)" hint="0–100">
              <input
                type="number" min="0" max="100" step="0.1"
                value={form.moisture_content}
                onChange={(e) => update('moisture_content', e.target.value)}
                placeholder="e.g. 12.5"
                className="input-audit"
              />
            </Field>

            <Field label="Size Grade">
              <select
                value={form.size_grade}
                onChange={(e) => update('size_grade', e.target.value)}
                className="input-audit"
              >
                <option value="">Select grade</option>
                {['Extra Large', 'Large', 'Medium', 'Small', 'Mixed'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>

            <Field label="Defect Score" hint="0 = none, 10 = severe">
              <input
                type="number" min="0" max="10" step="0.1"
                value={form.defect_score}
                onChange={(e) => update('defect_score', e.target.value)}
                placeholder="e.g. 2.5"
                className="input-audit"
              />
            </Field>

            <Field label="Colour Uniformity (%)">
              <input
                type="number" min="0" max="100" step="1"
                value={form.colour_uniformity}
                onChange={(e) => update('colour_uniformity', e.target.value)}
                placeholder="e.g. 85"
                className="input-audit"
              />
            </Field>

            <Field label="Avg. Weight (grams)" hint="per unit">
              <input
                type="number" min="0" step="0.1"
                value={form.avg_weight_grams}
                onChange={(e) => update('avg_weight_grams', e.target.value)}
                placeholder="e.g. 180"
                className="input-audit"
              />
            </Field>

            <Field label="Pesticide Test">
              <select
                value={form.pesticide_residue}
                onChange={(e) => update('pesticide_residue', e.target.value)}
                className="input-audit"
              >
                <option value="Not Tested">Not Tested</option>
                <option value="Pass">✅ Pass</option>
                <option value="Fail">❌ Fail</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Storage & Packaging ─────────────────── */}
        <Section title="Storage & Packaging" icon="📦">
          <div className="space-y-3">
            <Field label="Storage Condition">
              <input
                type="text"
                value={form.storage_condition}
                onChange={(e) => update('storage_condition', e.target.value)}
                placeholder="e.g. Dry warehouse, 25°C"
                className="input-audit"
              />
            </Field>
            <Field label="Packaging Type">
              <input
                type="text"
                value={form.packaging_type}
                onChange={(e) => update('packaging_type', e.target.value)}
                placeholder="e.g. Jute bags, 50kg"
                className="input-audit"
              />
            </Field>
          </div>
        </Section>

        {/* ── Section 3: Photo Evidence ───────────────────────── */}
        <Section title="Photo Evidence" icon="📷">
          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleImageUpload(e.dataTransfer.files) }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              step === 'uploading'
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
            }`}
          >
            {step === 'uploading' ? (
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                <span className="w-4 h-4 border-2 border-green-400 border-t-green-600 rounded-full animate-spin" />
                Uploading...
              </div>
            ) : (
              <>
                <div className="text-3xl mb-2">📸</div>
                <p className="text-sm font-semibold text-gray-700">Click or drag photos here</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP · Max 8MB each</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />

          {/* Uploaded thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setUploadedImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Section 4: Notes ────────────────────────────────── */}
        <Section title="Auditor Notes" icon="📝">
          <textarea
            value={form.auditor_notes}
            onChange={(e) => update('auditor_notes', e.target.value)}
            placeholder="Any additional observations about this crop batch..."
            rows={3}
            className="input-audit resize-none"
          />
        </Section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || step === 'uploading'}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-md shadow-green-600/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting Audit...
            </>
          ) : (
            <>
              🔬 Submit Quality Audit
            </>
          )}
        </button>
      </form>

      {/* Inline styles for shared classes */}
      <style jsx>{`
        .input-audit {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          color: #1f2937;
          background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .input-audit:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
        }
        .input-audit::placeholder {
          color: #9ca3af;
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-gray-800 text-sm tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Export the certificate view separately for buyer pages
// ─────────────────────────────────────────────────────────────────
export { QualityCertificate }
