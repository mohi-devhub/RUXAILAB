import { admin, functions } from '../f.firebase.js'
import { runAnalysisPipeline } from '../features/focusGroupAnalysis/index.js'

const ACCESS_LEVEL_ADMIN = 0

const error = (code, message) => new functions.https.HttpsError(code, message)

const getData = (request) => request?.data || request || {}

/** Facilitator = the study owner or a cooperator with accessLevel 0, mirroring
 * the role resolution in FocusGroupSessionView.vue's `accessLevel` computed. */
function isFacilitator({ study, uid, isSuperAdmin }) {
  if (isSuperAdmin) return true
  if (study?.testAdmin?.userDocId === uid) return true
  return study?.studyRoleMap?.[uid] === ACCESS_LEVEL_ADMIN
}

/** Replaces any NLP-suggested themes generated from this session on a prior
 * run, leaves every manually authored theme untouched. */
export function mergeThemes({ existingThemes, suggestedThemes, sessionId }) {
  const preserved = (existingThemes ?? []).filter((theme) => {
    const isNlpFromThisSession =
      theme.source === 'nlp' &&
      (theme.responseRefs ?? []).length > 0 &&
      (theme.responseRefs ?? []).every((ref) => ref.sessionId === sessionId)
    return !isNlpFromThisSession
  })
  return [...preserved, ...suggestedThemes]
}

export const runFocusGroupAnalysis = functions.onCall({
  handler: async (request) => {
    const uid = request?.auth?.uid
    if (!uid) throw error('unauthenticated', 'Authentication is required')

    const { studyId, answersDocId, sessionId } = getData(request)
    if (!studyId || !answersDocId || !sessionId) {
      throw error(
        'invalid-argument',
        'studyId, answersDocId, and sessionId are required',
      )
    }

    const db = admin.firestore()
    const [studySnap, userSnap] = await Promise.all([
      db.collection('tests').doc(studyId).get(),
      db.collection('users').doc(uid).get(),
    ])
    if (!studySnap.exists) throw error('not-found', 'Study not found')

    const study = studySnap.data()
    const isSuperAdmin = userSnap.exists && userSnap.data()?.accessLevel === 0
    if (!isFacilitator({ study, uid, isSuperAdmin })) {
      throw error(
        'permission-denied',
        'Only the facilitator can run session analysis',
      )
    }

    const answerRef = db.collection('answers').doc(answersDocId)
    const answerSnap = await answerRef.get()
    if (!answerSnap.exists) throw error('not-found', 'Answer document not found')

    const answer = answerSnap.data()
    const session = answer?.sessions?.[sessionId]
    if (!session) throw error('not-found', 'Session not found')

    const { perTopic, suggestedThemes } = runAnalysisPipeline({
      sessionId,
      messages: session.messages,
    })

    const themes = mergeThemes({
      existingThemes: answer.themes,
      suggestedThemes,
      sessionId,
    })

    await answerRef.update({
      [`sessions.${sessionId}.analysis`]: {
        perTopic,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      themes,
    })

    return { perTopic, suggestedThemes, themes }
  },
})
