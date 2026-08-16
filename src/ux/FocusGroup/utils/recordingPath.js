/**
 * Storage path for a Focus Group per-topic recording segment. Uses the
 * `focusgroup_.*` special path-segment convention (mirrors `heuristic_.*`,
 * `stimulus_.*`) so storage.rules can grant facilitator/participant write
 * access without depending on `canAnswerStudy`, which has no FOCUS_GROUP case.
 *
 * @param {Object} params
 * @param {string} params.studyId
 * @param {string} params.userId
 * @param {string} params.topicId
 * @param {string} params.mimeType - the MediaRecorder blob's mime type.
 * @param {number} [params.now] - injectable for deterministic tests.
 * @returns {string}
 */
export function buildRecordingStoragePath({
  studyId,
  userId,
  topicId,
  mimeType,
  now = Date.now(),
}) {
  const extension = mimeType?.includes('mp4') ? 'mp4' : 'webm'
  return `tests/${studyId}/focusgroup_${userId}/topic_${topicId}/${now}.${extension}`
}

/**
 * Which of audio/video this session is configured to record, and whether
 * recording applies at all to the given role. Kept pure/testable — the
 * MediaRecorder/LiveKit track wiring that calls this lives in the view,
 * where it isn't unit-testable (no camera/mic in Jest).
 *
 * @param {Object} params
 * @param {boolean} params.recordAudio
 * @param {boolean} params.recordVideo
 * @param {boolean} params.canPublish - false for observers (subscribe-only).
 * @returns {{ shouldRecord: boolean, kind: 'audio'|'video'|'audio+video'|null }}
 */
export function resolveRecordingMode({ recordAudio, recordVideo, canPublish }) {
  if (!canPublish || (!recordAudio && !recordVideo)) {
    return { shouldRecord: false, kind: null }
  }
  if (recordAudio && recordVideo) return { shouldRecord: true, kind: 'audio+video' }
  if (recordVideo) return { shouldRecord: true, kind: 'video' }
  return { shouldRecord: true, kind: 'audio' }
}
