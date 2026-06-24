import { SECTIONS, AREAS, getAllQuestionsForSection, getAnswerForQuestion } from './questions'

const AI_PROMPT = `Você é um Product Owner sênior, especialista em discovery, documentação de processos, requisitos funcionais, integrações e handoff para times de desenvolvimento.

Você receberá uma entrevista de mapeamento de processo com respostas, perguntas específicas por área, perguntas personalizadas e evidências visuais. Sua tarefa é transformar esse material em documentação executiva e acionável.

Regras de análise:
- Use somente o conteúdo do PDF. Quando precisar inferir algo, marque claramente como inferência.
- Não invente sistemas, campos, regras, integrações ou decisões que não estejam sustentados pelas respostas.
- Diferencie fatos observados, hipóteses, riscos e perguntas em aberto.
- Trate prints e evidências visuais como parte da documentação: descreva o que cada imagem sugere, quais campos aparecem e quais pontos precisam de validação humana.
- Se um print estiver ilegível ou incompleto, liste exatamente o que precisa ser confirmado.
- Escreva de forma objetiva, profissional e pronta para compartilhar com produto, operação, dados e desenvolvimento.

Entregue obrigatoriamente nesta estrutura:
1. Resumo executivo do processo em 5 a 8 linhas.
2. Escopo do mapeamento: início, fim, fora de escopo e objetivo do PO.
3. Mapa AS-IS: fluxo passo a passo com ator, sistema, entrada, ação, saída e decisão.
4. Regras de negócio: condições, exceções, aprovações, alçadas, SLAs e thresholds.
5. Dados e integrações: fontes, campos obrigatórios, identificadores, transformações, destino, fonte da verdade e restrições de acesso.
6. Evidências visuais: o que cada print comprova e onde ele apoia o fluxo.
7. Riscos e fragilidades: classifique por impacto, probabilidade, evidência e mitigação sugerida.
8. Oportunidades de melhoria: priorize por impacto, esforço e urgência.
9. Backlog sugerido: épicos, histórias de usuário e critérios de aceite em formato "Dado/Quando/Então".
10. Perguntas em aberto: liste o que precisa ser validado antes de especificar ou desenvolver.
11. Recomendações para o time de desenvolvimento: eventos, APIs, logs, testes, monitoramento, migração e pontos de atenção.

Formato esperado:
- Use Markdown com títulos claros.
- Use tabelas quando houver comparação ou priorização.
- Seja específico. Prefira "validar status X no sistema Y antes de avançar" em vez de "melhorar validação".
- Ao final, inclua um checklist de próximos passos para o PO.`

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function asParagraphs(value = '') {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function slugify(value = 'entrevista') {
  return String(value || 'entrevista')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'entrevista'
}

function getAreaLabels(selectedAreas = []) {
  return selectedAreas.map(id => AREAS.find(area => area.id === id)?.label).filter(Boolean)
}

function getQuestionBlocks(interview) {
  const { selectedAreas = [], customQuestions = {}, answers = {} } = interview

  return SECTIONS.map(section => {
    const questions = getAllQuestionsForSection(section.id, selectedAreas, customQuestions)
      .map((item, index) => {
        const answer = getAnswerForQuestion(answers, item, section.id, index)
        return { item, answer }
      })
      .filter(({ answer }) => answer?.text?.trim() || answer?.images?.length > 0)

    return { section, questions }
  }).filter(block => block.questions.length > 0)
}

function formatDate(iso) {
  if (!iso) return '-'
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

function metaRows(interview) {
  const { meta = {}, selectedAreas = [] } = interview
  const areas = getAreaLabels(selectedAreas).join(', ') || 'Geral'

  return [
    ['Processo', meta.processo || '-'],
    ['Objetivo do PO', meta.objetivo || '-'],
    ['Entrevistado', meta.entrevistado || '-'],
    ['Entrevistador', meta.entrevistador || '-'],
    ['Data', formatDate(meta.data)],
    ['Duração', meta.duracao || '-'],
    ['Área(s)', areas],
  ]
}

function summaryRows(summary = {}) {
  return [
    ['Principais descobertas', summary.descobertas],
    ['Riscos identificados', summary.riscos],
    ['Oportunidades', summary.oportunidades],
    ['Dúvidas em aberto', summary.duvidas],
    ['Próximos passos', summary.passos],
  ].filter(([, value]) => value?.trim())
}

export function generateExportText(interview) {
  const blocks = getQuestionBlocks(interview)
  let out = `PROMPT PARA IA\n\n${AI_PROMPT}\n\n`

  out += `ENTREVISTA DE MAPEAMENTO\n\n`
  metaRows(interview).forEach(([label, value]) => {
    out += `${label}: ${value}\n`
  })

  blocks.forEach(({ section, questions }) => {
    out += `\n## ${section.label}\n\n`
    questions.forEach(({ item, answer }, index) => {
      const badges = [
        item.isArea ? item.areaLabel : '',
        item.isCustom ? 'Personalizada' : '',
      ].filter(Boolean)
      out += `${index + 1}. ${item.q}${badges.length ? ` [${badges.join(' | ')}]` : ''}\n`
      if (answer?.text?.trim()) out += `${answer.text.trim()}\n`
      if (answer?.images?.length) {
        out += `Imagens anexadas: ${answer.images.map(image => image.name).join(', ')}\n`
      }
      out += '\n'
    })
  })

  const summary = summaryRows(interview.summary)
  if (summary.length) {
    out += '\n## Síntese do entrevistador\n\n'
    summary.forEach(([label, value]) => {
      out += `${label}\n${value.trim()}\n\n`
    })
  }

  return out
}

function buildHtml(interview) {
  const { meta = {}, stats = {} } = interview
  const blocks = getQuestionBlocks(interview)
  const summary = summaryRows(interview.summary)
  const title = meta.processo || meta.entrevistado || 'Entrevista de mapeamento'

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(buildPdfFilename(interview))}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 16mm;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: #111827;
      color: #fff;
      font-size: 12px;
    }
    .toolbar button {
      border: 1px solid #374151;
      border-radius: 6px;
      background: #fff;
      color: #111827;
      font-weight: 700;
      padding: 7px 12px;
      cursor: pointer;
    }
    h1, h2, h3 { margin: 0; color: #111827; }
    h1 { font-size: 24px; line-height: 1.1; letter-spacing: 0; }
    h2 {
      margin-top: 28px;
      padding-bottom: 7px;
      border-bottom: 1px solid #d1d5db;
      font-size: 16px;
    }
    h3 { margin-top: 16px; font-size: 13px; }
    p { margin: 6px 0 0; }
    .muted { color: #6b7280; }
    .cover {
      border-bottom: 3px solid #111827;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 14px;
    }
    .kpi {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
      background: #f9fafb;
    }
    .kpi strong { display: block; font-size: 16px; }
    .meta {
      width: 100%;
      margin-top: 12px;
      border-collapse: collapse;
      border: 1px solid #e5e7eb;
    }
    .meta th, .meta td {
      padding: 8px 9px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      text-align: left;
    }
    .meta th {
      width: 34%;
      background: #f9fafb;
      color: #374151;
      font-size: 11px;
      text-transform: uppercase;
    }
    .prompt {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      padding: 12px;
      break-inside: avoid;
      white-space: pre-wrap;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
    }
    .question {
      margin-top: 13px;
      padding: 11px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      break-inside: avoid;
    }
    .question-title {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-weight: 700;
      color: #111827;
    }
    .badge {
      display: inline-block;
      margin-left: 4px;
      border-radius: 4px;
      background: #eef2ff;
      color: #3730a3;
      padding: 2px 5px;
      font-size: 10px;
      font-weight: 700;
    }
    .answer {
      margin-top: 8px;
      color: #1f2937;
    }
    .images {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    figure {
      margin: 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 6px;
      background: #f9fafb;
      break-inside: avoid;
    }
    figure img {
      display: block;
      width: 100%;
      max-height: 110mm;
      object-fit: contain;
      border-radius: 5px;
      background: #fff;
    }
    figcaption {
      margin-top: 4px;
      color: #6b7280;
      font-size: 10px;
      word-break: break-word;
    }
    .summary-item {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      break-inside: avoid;
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .sheet {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Interview Mapper - PDF com prompt de IA</span>
    <button onclick="window.print()">Imprimir / salvar PDF</button>
  </div>
  <main class="sheet">
    <section class="cover">
      <p class="muted">Interview Mapper</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="muted">Dossiê de mapeamento para análise de IA, documentação de produto e handoff técnico.</p>
      <div class="kpis">
        <div class="kpi"><span class="muted">Perguntas</span><strong>${escapeHtml(stats.totalQuestions ?? '-')}</strong></div>
        <div class="kpi"><span class="muted">Respondidas</span><strong>${escapeHtml(stats.answeredQuestions ?? '-')}</strong></div>
        <div class="kpi"><span class="muted">Progresso</span><strong>${escapeHtml(stats.progressPct ?? 0)}%</strong></div>
      </div>
      <table class="meta">
        <tbody>
          ${metaRows(interview).map(([label, value]) => `
            <tr>
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Prompt para IA</h2>
      <div class="prompt">${escapeHtml(AI_PROMPT)}</div>
    </section>

    ${blocks.map(({ section, questions }) => `
      <section>
        <h2>${escapeHtml(section.label)}</h2>
        <p class="muted">${escapeHtml(section.desc)}</p>
        ${questions.map(({ item, answer }, index) => {
          const badges = [
            item.isArea ? item.areaLabel : '',
            item.isCustom ? 'Personalizada' : '',
          ].filter(Boolean)
          return `
            <article class="question">
              <div class="question-title">
                <span>${index + 1}.</span>
                <span>
                  ${escapeHtml(item.q || 'Pergunta personalizada')}
                  ${badges.map(badge => `<span class="badge">${escapeHtml(badge)}</span>`).join('')}
                </span>
              </div>
              ${item.hint ? `<p class="muted">${escapeHtml(item.hint)}</p>` : ''}
              ${answer?.text?.trim() ? `<div class="answer">${asParagraphs(answer.text.trim())}</div>` : ''}
              ${answer?.images?.length ? `
                <div class="images">
                  ${answer.images.map(image => `
                    <figure>
                      <img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name || 'Print anexado')}">
                      <figcaption>${escapeHtml(image.name || 'Print anexado')}</figcaption>
                    </figure>
                  `).join('')}
                </div>
              ` : ''}
            </article>
          `
        }).join('')}
      </section>
    `).join('')}

    ${summary.length ? `
      <section>
        <h2>Síntese do entrevistador</h2>
        ${summary.map(([label, value]) => `
          <article class="summary-item">
            <h3>${escapeHtml(label)}</h3>
            <div>${asParagraphs(value.trim())}</div>
          </article>
        `).join('')}
      </section>
    ` : ''}
  </main>
  <script>
    window.addEventListener('load', () => {
      window.setTimeout(() => window.print(), 500)
    })
  </script>
</body>
</html>`
}

function downloadHtml(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildFilename(interview) {
  const name = slugify(interview.meta?.entrevistado || interview.meta?.processo || 'entrevista')
  const date = interview.meta?.data || new Date().toISOString().split('T')[0]
  return `entrevista-${name}-${date}.txt`
}

export function buildPdfFilename(interview) {
  const name = slugify(interview.meta?.processo || interview.meta?.entrevistado || 'entrevista')
  const date = interview.meta?.data || new Date().toISOString().split('T')[0]
  return `entrevista-${name}-${date}.pdf`
}

export function exportInterviewPdf(interview) {
  if (typeof window === 'undefined') return

  const html = buildHtml(interview)
  const printWindow = window.open('', '_blank', 'width=1100,height=800')

  if (!printWindow) {
    downloadHtml(buildPdfFilename(interview).replace(/\.pdf$/, '.html'), html)
    throw new Error('O navegador bloqueou a janela do PDF. Baixei um HTML imprimível para abrir e salvar como PDF.')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
}
