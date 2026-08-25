<template>
  <PageWrapper :title="$t('focusGroup.analytics.title')" :side-gap="true">
    <template #subtitle>
      <p class="text-body-1 text-grey-darken-1">
        {{ $t('focusGroup.analytics.subtitle') }}
      </p>
    </template>

    <v-container class="pa-0">
      <div
        v-if="!loading && !sessions.length"
        class="text-center py-8 text-medium-emphasis"
      >
        <v-icon icon="mdi-chart-box-outline" size="48" class="mb-2" />
        <p class="text-body-2 mb-0">{{ $t('focusGroup.answers.empty') }}</p>
      </div>

      <v-row v-else>
        <v-col cols="12" md="4">
          <v-list density="compact" class="pa-0">
            <v-list-item
              v-for="session in sessions"
              :key="session.sessionId"
              :active="session.sessionId === selectedSessionId"
              rounded="lg"
              class="mb-1"
              @click="selectedSessionId = session.sessionId"
            >
              <v-list-item-title>
                {{ formatDate(session.startedAt) }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{
                  $t('focusGroup.answers.participantCount', {
                    count: participantCount(session),
                  })
                }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-col>

        <v-col v-if="selectedSession" cols="12" md="8">
          <div class="d-flex justify-end ga-2 mb-4">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-creation"
              class="text-none"
              :loading="analyzing"
              @click="onRunAnalysis"
            >
              {{ $t('focusGroup.analysis.runAnalysis') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-file-pdf-box"
              class="text-none"
              :disabled="!hasAnalysis"
              @click="onDownloadReport"
            >
              {{ $t('focusGroup.analytics.downloadReport') }}
            </v-btn>
          </div>

          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title>{{ $t('focusGroup.analytics.keywordsTitle') }}</v-card-title>
            <v-card-text>
              <ThemeCloud :entries="keywordCloudEntries" />
            </v-card-text>
          </v-card>

          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title>{{ $t('focusGroup.analytics.consensusTitle') }}</v-card-title>
            <v-card-text>
              <ConsensusHeatmap
                :topics="topics"
                :participants="participantsForSession"
                :matrix="consensusMatrix"
              />
            </v-card-text>
          </v-card>

          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title>{{ $t('focusGroup.analytics.engagementTitle') }}</v-card-title>
            <v-card-text>
              <ParticipantEngagement :entries="engagementEntries" />
            </v-card-text>
          </v-card>

          <v-card variant="outlined" rounded="lg">
            <v-card-title>{{ $t('focusGroup.analytics.deepAnalysisTitle') }}</v-card-title>
            <v-card-subtitle>
              {{ $t('focusGroup.analytics.deepAnalysisHint') }}
            </v-card-subtitle>
            <v-card-text>
              <p v-if="savedDeepAnalysis" class="text-body-2">
                {{ savedDeepAnalysis.text }}
              </p>

              <v-row dense>
                <v-col cols="12" md="5">
                  <v-text-field
                    v-model="deepAnalysisEndpoint"
                    density="compact"
                    variant="outlined"
                    :label="$t('focusGroup.analytics.deepAnalysisEndpoint')"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="deepAnalysisKey"
                    type="password"
                    density="compact"
                    variant="outlined"
                    :label="$t('focusGroup.analytics.deepAnalysisKey')"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="deepAnalysisModel"
                    density="compact"
                    variant="outlined"
                    :label="$t('focusGroup.analytics.deepAnalysisModel')"
                  />
                </v-col>
              </v-row>

              <v-alert
                v-if="deepAnalysisResult"
                type="info"
                variant="tonal"
                density="comfortable"
                class="mb-3"
              >
                {{ deepAnalysisResult }}
              </v-alert>

              <div class="d-flex ga-2">
                <v-btn
                  variant="tonal"
                  color="primary"
                  class="text-none"
                  :disabled="!canGenerateDeepAnalysis"
                  :loading="deepAnalysisLoading"
                  @click="onGenerateDeepAnalysis"
                >
                  {{ $t('focusGroup.analytics.deepAnalysisGenerate') }}
                </v-btn>
                <v-btn
                  v-if="deepAnalysisResult"
                  variant="text"
                  class="text-none"
                  @click="onSaveDeepAnalysis"
                >
                  {{ $t('focusGroup.analytics.deepAnalysisSave') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </PageWrapper>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageWrapper from '@/shared/views/template/PageWrapper.vue'
import ThemeCloud from '@/ux/FocusGroup/components/analytics/ThemeCloud.vue'
import ConsensusHeatmap from '@/ux/FocusGroup/components/analytics/ConsensusHeatmap.vue'
import ParticipantEngagement from '@/ux/FocusGroup/components/analytics/ParticipantEngagement.vue'
import { sortSessionsByStartedAt } from '@/ux/FocusGroup/utils/sessionSummary'
import { computeParticipation } from '@/ux/FocusGroup/utils/participation'

const store = useStore()
const route = useRoute()
const { t } = useI18n()

const test = computed(() => store.getters.test)
const rawSessions = ref({})
const themes = ref([])
const loading = ref(true)
const analyzing = ref(false)
const selectedSessionId = ref(null)

const sessions = computed(() => sortSessionsByStartedAt(rawSessions.value))
const selectedSession = computed(
  () => sessions.value.find((s) => s.sessionId === selectedSessionId.value) ?? null,
)
const topics = computed(() =>
  Array.isArray(test.value?.discussionGuide) ? test.value.discussionGuide : [],
)

const participantCount = (session) => Object.keys(session.participants ?? {}).length
const formatDate = (timestamp) => (timestamp ? new Date(timestamp).toLocaleString() : '')

const perTopicAnalysis = computed(() => selectedSession.value?.analysis?.perTopic ?? {})
const hasAnalysis = computed(() => Object.keys(perTopicAnalysis.value).length > 0)

const participantsForSession = computed(() =>
  Object.entries(selectedSession.value?.participants ?? {}).map(([id, p]) => ({
    id,
    name: p?.name || t('focusGroup.session.anonymous'),
  })),
)

// Rank-weighted keyword frequency across every topic's RAKE output — a
// keyword ranked first in a topic counts for more than one ranked last, and
// counts accumulate across topics.
const keywordCloudEntries = computed(() => {
  const weights = new Map()
  Object.values(perTopicAnalysis.value).forEach((topicAnalysis) => {
    ;(topicAnalysis?.keywords ?? []).forEach((term, index) => {
      const weight = topicAnalysis.keywords.length - index
      weights.set(term, (weights.get(term) ?? 0) + weight)
    })
  })
  return [...weights.entries()]
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20)
})

const consensusMatrix = computed(() => {
  const matrix = {}
  Object.entries(perTopicAnalysis.value).forEach(([topicId, topicAnalysis]) => {
    matrix[topicId] = topicAnalysis?.consensus?.alignment ?? {}
  })
  return matrix
})

const engagementEntries = computed(() => {
  const percentages = computeParticipation({ messages: selectedSession.value?.messages })
  const participants = selectedSession.value?.participants ?? {}
  return Object.entries(percentages)
    .map(([userId, percent]) => ({
      userId,
      percent,
      name: participants[userId]?.name || t('focusGroup.session.anonymous'),
    }))
    .sort((a, b) => b.percent - a.percent)
})

const onRunAnalysis = async () => {
  if (!selectedSession.value) return
  analyzing.value = true
  try {
    const result = await store.dispatch('runFocusGroupAnalysis', {
      studyId: test.value?.id,
      answersDocId: test.value?.answersDocId,
      sessionId: selectedSession.value.sessionId,
    })
    if (!result) return
    rawSessions.value = {
      ...rawSessions.value,
      [selectedSession.value.sessionId]: {
        ...rawSessions.value[selectedSession.value.sessionId],
        analysis: {
          ...rawSessions.value[selectedSession.value.sessionId]?.analysis,
          perTopic: result.perTopic,
        },
      },
    }
  } finally {
    analyzing.value = false
  }
}

// --- Tier 3: opt-in "Deep Analysis" via the researcher's own LLM endpoint ---
// Endpoint/key/model are session-only client state — never dispatched to the
// store or written to Firestore. Only the generated text is ever persisted.
const deepAnalysisEndpoint = ref('')
const deepAnalysisKey = ref('')
const deepAnalysisModel = ref('gpt-4o-mini')
const deepAnalysisResult = ref('')
const deepAnalysisLoading = ref(false)
const savedDeepAnalysis = computed(() => selectedSession.value?.analysis?.deepAnalysis ?? null)
const canGenerateDeepAnalysis = computed(
  () => hasAnalysis.value && deepAnalysisEndpoint.value.trim() && deepAnalysisKey.value.trim(),
)

function buildDeepAnalysisPrompt() {
  const lines = []
  topics.value.forEach((topic) => {
    const analysis = perTopicAnalysis.value[topic.id]
    if (!analysis) return
    lines.push(
      `Topic: ${topic.title || topic.id}\nKeywords: ${(analysis.keywords ?? []).join(', ')}\nSummary: ${analysis.summary ?? ''}`,
    )
  })
  return [
    'You are assisting a UX researcher in synthesizing a focus group session.',
    'Given the per-topic keywords and summaries below, write a short, well-organized synthesis paragraph highlighting the most important patterns across topics.',
    '',
    lines.join('\n\n'),
  ].join('\n')
}

const onGenerateDeepAnalysis = async () => {
  deepAnalysisLoading.value = true
  try {
    const response = await axios.post(
      deepAnalysisEndpoint.value.trim(),
      {
        model: deepAnalysisModel.value.trim() || 'gpt-4o-mini',
        messages: [{ role: 'user', content: buildDeepAnalysisPrompt() }],
      },
      { headers: { Authorization: `Bearer ${deepAnalysisKey.value.trim()}` } },
    )
    deepAnalysisResult.value = response.data?.choices?.[0]?.message?.content ?? ''
    store.commit('SET_TOAST', {
      message: t('focusGroup.analytics.deepAnalysisSuccess'),
      type: 'success',
    })
  } catch {
    store.commit('SET_TOAST', {
      message: t('errors.globalError'),
      type: 'error',
    })
  } finally {
    deepAnalysisLoading.value = false
  }
}

const onSaveDeepAnalysis = async () => {
  const deepAnalysis = {
    text: deepAnalysisResult.value,
    model: deepAnalysisModel.value.trim(),
    generatedAt: Date.now(),
  }
  await store.dispatch('saveFocusGroupDeepAnalysis', {
    answersDocId: test.value?.answersDocId,
    sessionId: selectedSession.value.sessionId,
    deepAnalysis,
  })
  rawSessions.value = {
    ...rawSessions.value,
    [selectedSession.value.sessionId]: {
      ...rawSessions.value[selectedSession.value.sessionId],
      analysis: {
        ...rawSessions.value[selectedSession.value.sessionId]?.analysis,
        deepAnalysis,
      },
    },
  }
}

// --- PDF export (jsPDF + autoTable, mirrors ExportPanel.vue's pattern) ---
const onDownloadReport = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const M = 48
  let y = M

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(test.value?.testTitle || 'Focus Group Report', M, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(
    `${formatDate(selectedSession.value.startedAt)} — ${participantCount(selectedSession.value)} participants`,
    M,
    y,
  )
  y += 20
  doc.setTextColor(30)

  topics.value.forEach((topic) => {
    const analysis = perTopicAnalysis.value[topic.id]
    if (!analysis) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(topic.title || topic.id, M, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const summaryLines = doc.splitTextToSize(analysis.summary || '—', 500)
    doc.text(summaryLines, M, y)
    y += summaryLines.length * 12 + 6
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Keywords: ${(analysis.keywords ?? []).join(', ')}`, M, y)
    y += 12
    doc.text(`Consensus: ${Math.round((analysis.consensus?.score ?? 0) * 100)}%`, M, y)
    y += 20
    doc.setTextColor(30)
  })

  if (topics.value.some((topic) => perTopicAnalysis.value[topic.id])) {
    y += 10
  }

  autoTable(doc, {
    startY: y,
    head: [['Theme', 'Source', 'Keywords']],
    body: themes.value.map((theme) => [
      theme.label,
      theme.source,
      (theme.keywords ?? []).join(', '),
    ]),
    styles: { fontSize: 9 },
    margin: { left: M, right: M },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : y,
    head: [['Participant', 'Engagement']],
    body: engagementEntries.value.map((entry) => [entry.name, `${entry.percent}%`]),
    styles: { fontSize: 9 },
    margin: { left: M, right: M },
  })

  doc.save(`focus-group-report-${selectedSession.value.sessionId}.pdf`)
}

onMounted(async () => {
  if (!test.value) await store.dispatch('getStudy', { id: route.params.id })
  try {
    const answer = await store.dispatch(
      'getFocusGroupSessionAnswers',
      test.value?.answersDocId,
    )
    rawSessions.value = answer.sessions
    themes.value = answer.themes ?? []
    const first = sortSessionsByStartedAt(rawSessions.value)[0]
    selectedSessionId.value = first?.sessionId ?? null
  } finally {
    loading.value = false
  }
})
</script>
