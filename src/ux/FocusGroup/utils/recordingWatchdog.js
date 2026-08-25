/**
 * Pure staleness evaluation for an in-flight recording segment. Called on a
 * fixed interval with the latest observed signals (see
 * FocusGroupSessionView.vue's checkRecordingHealth). Never touches
 * MediaRecorder/MediaStreamTrack itself, so it's fully unit-testable.
 *
 * Deliberately does NOT treat a `muted` track as staleness — with this app's
 * default LiveKit room config (stopMicTrackOnMute: false), an intentionally
 * muted track is expected, legitimate behavior, not corruption. Only a
 * genuinely `'ended'` track, or chunk-timing anomalies that event-driven
 * track sync can't see (e.g. a backgrounded tab silently starving frame
 * delivery), count as stale.
 *
 * @param {Object} params
 * @param {number} params.now
 * @param {number} params.segmentStartedAt
 * @param {number} params.lastChunkAt - timestamp of the most recent ondataavailable, or 0 if none yet.
 * @param {number[]} params.recentChunkSizes - last N ondataavailable byte sizes, oldest -> newest.
 * @param {'live'|'ended'|null} params.cameraTrackState - null when the camera isn't required.
 * @param {'live'|'ended'|null} params.microphoneTrackState - null when the microphone isn't required.
 * @param {number} [params.noChunkTimeoutMs]
 * @param {number} [params.flatlineStreakLimit] - consecutive near-empty chunks before treating it as stale.
 * @param {number} [params.flatlineMinBytes] - a chunk below this size counts toward the flatline streak.
 * @returns {{ stale: boolean, reason: 'camera-track-ended'|'microphone-track-ended'|'no-chunk-timeout'|'chunk-flatline'|null }}
 */
export function evaluateRecordingStaleness({
  now,
  segmentStartedAt,
  lastChunkAt,
  recentChunkSizes,
  cameraTrackState,
  microphoneTrackState,
  noChunkTimeoutMs = 8000,
  flatlineStreakLimit = 3,
  flatlineMinBytes = 200,
}) {
  if (cameraTrackState === 'ended') {
    return { stale: true, reason: 'camera-track-ended' }
  }
  if (microphoneTrackState === 'ended') {
    return { stale: true, reason: 'microphone-track-ended' }
  }

  const sinceLastSignal = now - (lastChunkAt || segmentStartedAt)
  if (sinceLastSignal >= noChunkTimeoutMs) {
    return { stale: true, reason: 'no-chunk-timeout' }
  }

  const recent = recentChunkSizes.slice(-flatlineStreakLimit)
  if (
    recent.length >= flatlineStreakLimit &&
    recent.every((size) => size < flatlineMinBytes)
  ) {
    return { stale: true, reason: 'chunk-flatline' }
  }

  return { stale: false, reason: null }
}
