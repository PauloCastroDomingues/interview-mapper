/**
 * Interview Mapper — Google Apps Script Backend
 * ==============================================
 * Opcional: sincroniza entrevistas com uma Google Sheet.
 *
 * SETUP:
 *  1. Abra https://script.google.com e crie um novo projeto.
 *  2. Cole este código e salve.
 *  3. Crie uma Google Sheet e copie o ID da URL (entre /d/ e /edit).
 *  4. Cole o ID abaixo em SHEET_ID.
 *  5. Vá em Implantar → Nova implantação → Aplicativo web.
 *     - Executar como: Eu mesmo
 *     - Quem pode acessar: Qualquer pessoa
 *  6. Copie a URL gerada e adicione no .env.local como NEXT_PUBLIC_GAS_URL.
 */

const SHEET_ID  = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI'
const SHEET_TAB = 'Entrevistas'

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID)
  let sheet = ss.getSheetByName(SHEET_TAB)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB)
    sheet.appendRow(['ID', 'Entrevistado', 'Entrevistador', 'Área(s)', 'Data', 'Progresso (%)', 'Criado em', 'Atualizado em', 'JSON Completo'])
    sheet.setFrozenRows(1)
  } else if (sheet.getLastColumn() === 8) {
    sheet.insertColumnBefore(8)
    sheet.getRange(1, 8).setValue('Atualizado em')
  }
  return sheet
}

function doPost(e) {
  try {
    const data      = JSON.parse(e.postData.contents)
    const { action, interview } = data

    if (action === 'save') {
      const sheet = getSheet()
      const rows  = sheet.getDataRange().getValues()
      const idx   = rows.findIndex(r => r[0] === interview.id)
      const areas = (interview.selectedAreas || []).join(', ')
      const row   = [
        interview.id,
        interview.meta?.entrevistado || '',
        interview.meta?.entrevistador || '',
        areas,
        interview.meta?.data || '',
        calcProgress(interview),
        interview.createdAt || new Date().toISOString(),
        interview.updatedAt || new Date().toISOString(),
        JSON.stringify(interview),
      ]

      if (idx > 0) {
        sheet.getRange(idx + 1, 1, 1, row.length).setValues([row])
      } else {
        sheet.appendRow(row)
      }
      return jsonResponse({ ok: true, id: interview.id })
    }

    if (action === 'delete') {
      const sheet = getSheet()
      const rows  = sheet.getDataRange().getValues()
      const idx   = rows.findIndex(r => r[0] === data.id)
      if (idx > 0) sheet.deleteRow(idx + 1)
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ ok: false, error: 'Unknown action' })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() })
  }
}

function doGet(e) {
  try {
    const sheet = getSheet()
    const rows  = sheet.getDataRange().getValues().slice(1) // skip header
    const interviews = rows
      .filter(r => r[0])
      .map(r => {
        try { return JSON.parse(r[8] || r[7]) } catch { return null }
      })
      .filter(Boolean)
    return jsonResponse({ ok: true, interviews })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() })
  }
}

function calcProgress(interview) {
  if (interview.stats && typeof interview.stats.progressPct === 'number') {
    return interview.stats.progressPct
  }

  // simplified — counts non-empty answer texts
  const answers = interview.answers || {}
  const done    = Object.values(answers).filter(a => a?.text?.trim() || a?.images?.length > 0).length
  return done > 0 ? Math.round((done / Math.max(Object.keys(answers).length, 1)) * 100) : 0
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
