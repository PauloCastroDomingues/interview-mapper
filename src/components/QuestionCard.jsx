'use client'
/* eslint-disable @next/next/no-img-element */
import { useState, useRef } from 'react'

const MAX_IMAGES_PER_QUESTION = 6
const MAX_FILE_MB = 8
const MAX_IMAGE_SIZE = 920
const JPEG_QUALITY = 0.72

async function compressImage(file, fallbackName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_SIZE) / width)
            width = MAX_IMAGE_SIZE
          } else {
            width = Math.round((width * MAX_IMAGE_SIZE) / height)
            height = MAX_IMAGE_SIZE
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        resolve({
          name: file.name || fallbackName,
          dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function getClipboardImageFiles(event) {
  const files = Array.from(event.clipboardData?.files || [])
  if (files.length) return files.filter(file => file.type?.startsWith('image/'))

  return Array.from(event.clipboardData?.items || [])
    .filter(item => item.type?.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter(Boolean)
}

export default function QuestionCard({
  num,
  question,
  hint,
  isArea,
  isCustom,
  areaLabel,
  answerKey,
  answer,
  onChange,
  onUpdateCustom,
  onRemoveCustom,
}) {
  const [open, setOpen] = useState(!!(answer?.text || answer?.images?.length || isCustom))
  const [loading, setLoad] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const text = answer?.text || ''
  const images = answer?.images || []
  const answered = text.trim() || images.length > 0
  const displayQuestion = question?.trim() || 'Pergunta personalizada sem título'

  async function addImages(rawFiles, source = 'arquivo') {
    setError('')

    const imageFiles = Array.from(rawFiles || []).filter(file => file?.type?.startsWith('image/'))
    const remaining = MAX_IMAGES_PER_QUESTION - images.length

    if (!imageFiles.length) return false
    if (remaining <= 0) {
      setError(`Limite de ${MAX_IMAGES_PER_QUESTION} imagens por pergunta atingido.`)
      return true
    }
    if (imageFiles.length > remaining) {
      setError(`Só cabem mais ${remaining} imagem(ns) nesta pergunta. O restante foi ignorado.`)
    }

    const validFiles = imageFiles
      .slice(0, remaining)
      .filter(file => file.size <= MAX_FILE_MB * 1024 * 1024)

    if (validFiles.length < Math.min(imageFiles.length, remaining)) {
      setError(`Algumas imagens passaram de ${MAX_FILE_MB}MB e foram ignoradas.`)
    }
    if (!validFiles.length) return true

    setOpen(true)
    setLoad(true)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const compressed = await Promise.all(
        validFiles.map((file, index) => compressImage(file, `${source}-${timestamp}-${index + 1}.jpg`))
      )
      onChange(answerKey, { text, images: [...images, ...compressed] })
    } catch {
      setError('Não foi possível processar uma das imagens.')
    } finally {
      setLoad(false)
    }

    return true
  }

  async function handleFiles(e) {
    await addImages(e.target.files, 'print')
    e.target.value = ''
  }

  async function handlePaste(e) {
    const pastedImages = getClipboardImageFiles(e)
    if (!pastedImages.length) return

    e.preventDefault()
    await addImages(pastedImages, 'print-colado')
  }

  async function handleDrop(e) {
    e.preventDefault()
    await addImages(e.dataTransfer?.files, 'print-arrastado')
  }

  function removeImage(i) {
    const next = images.filter((_, idx) => idx !== i)
    onChange(answerKey, { text, images: next })
  }

  return (
    <div className={`rounded-lg border bg-white transition-colors ${answered ? 'border-sky-200 ring-1 ring-sky-100' : 'border-gray-200'}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={() => setOpen(o => !o)}
          >
            <span className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
              isCustom ? 'bg-emerald-50 text-emerald-700' : isArea ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {num}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-gray-900">{displayQuestion}</p>
              {hint && (
                <p className="mt-1 text-xs leading-snug text-gray-500">{hint}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {isArea && areaLabel && (
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    {areaLabel}
                  </span>
                )}
                {isCustom && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Personalizada
                  </span>
                )}
                {images.length > 0 && (
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                    {images.length} print{images.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </button>
          {isCustom && onRemoveCustom && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemoveCustom()
              }}
              className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              Remover
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="mt-0.5 rounded-md px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            {open ? 'Fechar' : 'Abrir'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4" onPaste={handlePaste}>
          {isCustom && onUpdateCustom && (
            <div className="mt-3 grid gap-2 rounded-md border border-emerald-100 bg-emerald-50/60 p-3">
              <input
                className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500"
                value={question}
                onChange={e => onUpdateCustom({ q: e.target.value })}
              />
              <textarea
                className="min-h-16 w-full resize-y rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none placeholder:text-gray-400 focus:border-emerald-500"
                placeholder="Contexto opcional para orientar a entrevista."
                value={hint || ''}
                onChange={e => onUpdateCustom({ hint: e.target.value })}
              />
            </div>
          )}

          <textarea
            className="mt-3 min-h-28 w-full resize-y rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Resposta, decisões, regras e observações relevantes."
            value={text}
            onChange={e => onChange(answerKey, { text: e.target.value, images })}
          />

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, i) => (
                <div key={`${img.name}-${i}`} className="group relative rounded-md border border-gray-200 bg-gray-50 p-2">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="aspect-[4/3] w-full cursor-pointer rounded border border-gray-200 object-cover"
                    onClick={() => window.open(img.dataUrl, '_blank')}
                    title="Abrir imagem"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 hidden rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm group-hover:block"
                    title="Remover imagem"
                  >
                    Remover
                  </button>
                  <p className="mt-1 truncate text-[11px] text-gray-500">{img.name}</p>
                </div>
              ))}
            </div>
          )}

          <div
            className="mt-3 flex flex-col gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            tabIndex={0}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prints e evidências</p>
              <p className="mt-0.5 text-xs text-gray-500">Imagens coladas, arrastadas ou anexadas entram no PDF da entrevista.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Adicionar print'}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
