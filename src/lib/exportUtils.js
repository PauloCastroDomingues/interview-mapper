import { SECTIONS, AREAS, getAllQuestionsForSection, getAnswerForQuestion } from './questions'

const HIDDEN_PROMPT = `╔══════════════════════════════════════════════════════════════════════╗
║         INSTRUÇÕES DE ANÁLISE — LEIA ANTES DO CONTEÚDO ABAIXO       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Você recebeu notas de uma entrevista de mapeamento de processo      ║
║  interno. Analise tudo e estruture sua resposta com as seções:       ║
║                                                                      ║
║  ## 1. Resumo do Processo                                            ║
║  Descreva o processo em 4-6 linhas, de forma clara e objetiva.      ║
║                                                                      ║
║  ## 2. Fluxo Passo a Passo                                           ║
║  Liste cada etapa numerada com: quem executa, o quê faz e           ║
║  com qual sistema. Inclua pontos de decisão e ramificações.          ║
║                                                                      ║
║  ## 3. Integrações e Fontes de Dados                                 ║
║  Mapeie: origem → transformações → destino final dos dados.         ║
║                                                                      ║
║  ## 4. Riscos Identificados                                          ║
║  Classifique cada risco como Alto / Médio / Baixo com justificativa. ║
║                                                                      ║
║  ## 5. Oportunidades de Melhoria                                     ║
║  Ordene por impacto vs. esforço de implementação.                   ║
║                                                                      ║
║  ## 6. Perguntas em Aberto                                           ║
║  Liste o que ainda precisa ser investigado ou validado.             ║
║                                                                      ║
║  ## 7. Recomendações para o Time de Desenvolvimento                  ║
║  O que documentar, quais specs criar e por onde começar.            ║
║                                                                      ║
║  Seja técnico, objetivo e use formatação clara por seções.          ║
╚══════════════════════════════════════════════════════════════════════╝

`

export function generateExportText(interview) {
  const { meta = {}, selectedAreas = [], answers = {}, summary = {} } = interview
  const areaLabels = selectedAreas.map(id => AREAS.find(a => a.id === id)?.label).filter(Boolean)

  let out = HIDDEN_PROMPT

  out += `${'═'.repeat(68)}\n`
  out += `  ENTREVISTA DE MAPEAMENTO DE PROCESSO\n`
  out += `${'═'.repeat(68)}\n\n`
  out += `Entrevistado : ${meta.entrevistado || '—'}\n`
  out += `Entrevistador: ${meta.entrevistador || '—'}\n`
  out += `Data         : ${meta.data || '—'}\n`
  out += `Duração      : ${meta.duracao || '—'}\n`
  out += `Área(s)      : ${areaLabels.join(', ') || 'Geral'}\n\n`

  SECTIONS.forEach(section => {
    const questions = getAllQuestionsForSection(section.id, selectedAreas)
    const hasAnswers = questions.some((_, qi) => {
      const ans = getAnswerForQuestion(answers, questions[qi], section.id, qi)
      return ans?.text?.trim() || ans?.images?.length > 0
    })
    if (!hasAnswers) return

    out += `\n${'─'.repeat(68)}\n`
    out += `  ${section.label.toUpperCase()}\n`
    out += `${'─'.repeat(68)}\n\n`

    questions.forEach((item, qi) => {
      const ans = getAnswerForQuestion(answers, item, section.id, qi)
      if (!ans?.text?.trim() && !ans?.images?.length) return
      const badge = item.isArea ? ` [${item.areaLabel}]` : ''
      out += `❓ ${item.q}${badge}\n`
      if (ans?.text?.trim()) out += `   ${ans.text.trim().replace(/\n/g, '\n   ')}\n`
      if (ans?.images?.length) {
        out += `   📎 ${ans.images.length} imagem(ns) anexada(s): ${ans.images.map(img => img.name).join(', ')}\n`
      }
      out += `\n`
    })
  })

  const summaryFields = [
    ['🎯 Principais descobertas', summary.descobertas],
    ['⚠️  Riscos identificados',  summary.riscos],
    ['💡 Oportunidades',          summary.oportunidades],
    ['❓ Dúvidas em aberto',      summary.duvidas],
    ['👣 Próximos passos',        summary.passos],
  ]
  const hasSummary = summaryFields.some(([, v]) => v?.trim())
  if (hasSummary) {
    out += `\n${'─'.repeat(68)}\n`
    out += `  RESUMO PÓS-ENTREVISTA\n`
    out += `${'─'.repeat(68)}\n\n`
    summaryFields.forEach(([label, val]) => {
      if (!val?.trim()) return
      out += `${label}\n${val.trim()}\n\n`
    })
  }

  return out
}

export function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildFilename(interview) {
  const name = (interview.meta?.entrevistado || 'entrevista').replace(/\s+/g, '_').toLowerCase()
  const date = (interview.meta?.data || new Date().toISOString().split('T')[0])
  return `entrevista_${name}_${date}.txt`
}
