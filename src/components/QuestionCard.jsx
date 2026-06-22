'use client'
/* eslint-disable @next/next/no-img-element */
import { useState, useRef } from 'react'

const MAX_IMAGES_PER_QUESTION = 6
const MAX_FILE_MB = 8
const MAX_IMAGE_SIZE = 760
const JPEG_QUALITY = 0.66

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) { height = Math.round((height * MAX_IMAGE_SIZE) / width); width = MAX_IMAGE_SIZE }
          else { width = Math.round((width * MAX_IMAGE_SIZE) / height); height = MAX_IMAGE_SIZE }
        }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve({ name: file.name, dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY) })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function QuestionCard({ num, question, hint, isArea, areaLabel, answerKey, answer, onChange }) {
  const [open, setOpen]   = useState(!!(answer?.text || answer?.images?.length))
  const [loading, setLoad] = useState(false)
  const [error, setError]  = useState('')
  const fileRef           = useRef(null)

  const text   = answer?.text   || ''
  const images = answer?.images || []

  async function handleFiles(e) {
    setError('')

    const selectedFiles = Array.from(e.target.files || [])
    const remaining = MAX_IMAGES_PER_QUESTION - images.length
    if (remaining <= 0) {
      setError(`Limite de ${MAX_IMAGES_PER_QUESTION} imagens por pergunta atingido.`)
      e.target.value = ''
      return
    }

    if (selectedFiles.length > remaining) {
      setError(`Só cabem mais ${remaining} imagem(ns) nesta pergunta. O restante foi ignorado.`)
    }

    const files = selectedFiles.slice(0, remaining)
    if (!files.length) return

    const validFiles = files.filter(file => file.size <= MAX_FILE_MB * 1024 * 1024)
    if (validFiles.length < files.length) {
      setError(`Alguns arquivos passaram de ${MAX_FILE_MB}MB e foram ignorados.`)
    }

    if (!validFiles.length) {
      e.target.value = ''
      return
    }

    setLoad(true)
    try {
      const compressed = await Promise.all(validFiles.map(compressImage))
      onChange(answerKey, { text, images: [...images, ...compressed] })
    } catch {
      setError('Não foi possível processar uma das imagens selecionadas.')
    } finally {
      setLoad(false)
      e.target.value = ''
    }
  }

  function removeImage(i) {
    const next = images.filter((_, idx) => idx !== i)
    onChange(answerKey, { text, images: next })
  }

  const answered = text.trim() || images.length > 0

  return (
    <div className={`rounded-xl border transition-all ${answered ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`mt-0.5 min-w-[24px] h-6 rounded-full flex items-center justify-center text-xs font-semibold
          ${isArea ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
          {num}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug">{question}</p>
          {hint && (
            <p className="mt-0.5 text-xs text-gray-400 leading-snug">{hint}</p>
          )}
          {isArea && areaLabel && (
            <span className="inline-block mt-1 text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
              {areaLabel}
            </span>
          )}
        </div>
        <span className={`text-gray-400 text-lg mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}>
          ›
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <textarea
            className="w-full mt-3 min-h-[90px] text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-blue-400 placeholder:text-gray-300"
            placeholder="Anote a resposta aqui..."
            value={text}
            onChange={e => onChange(answerKey, { text: e.target.value, images })}
          />

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer"
                    onClick={() => window.open(img.dataUrl, '_blank')}
                    title="Clique para ampliar"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center shadow"
                    title="Remover imagem"
                  >
                    ×
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5 w-20 truncate">{img.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* Image upload button */}
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin text-sm">⌛</span>
              ) : (
                <span>📎</span>
              )}
              {loading ? 'Processando...' : 'Adicionar print / imagem'}
            </button>
            {images.length > 0 && (
              <span className="text-xs text-gray-400">{images.length} imagem(ns) anexada(s)</span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
