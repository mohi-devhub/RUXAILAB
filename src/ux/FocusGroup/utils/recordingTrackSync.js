/**
 * Which media slots a recording `kind` (from resolveRecordingMode) actually
 * needs. Used to scope track-presence/drift checks to only what matters —
 * an audio-only config must never care whether the camera track changed.
 *
 * @param {'audio+video'|'video'|'audio'|null} kind
 * @returns {{ camera: boolean, microphone: boolean }}
 */
export function requiredTrackSlots(kind) {
  return {
    camera: kind === 'video' || kind === 'audio+video',
    microphone: kind === 'audio' || kind === 'audio+video',
  }
}

/**
 * Snapshot of the live MediaStreamTrack identities, for comparing against a
 * previously-recorded snapshot to detect a publish/unpublish/replace.
 *
 * @param {{ cameraTrack: MediaStreamTrack|null, microphoneTrack: MediaStreamTrack|null }} params
 * @returns {{ camera: string|null, microphone: string|null }}
 */
export function trackIdsFor({ cameraTrack, microphoneTrack }) {
  return {
    camera: cameraTrack?.id ?? null,
    microphone: microphoneTrack?.id ?? null,
  }
}

/**
 * Whether every track slot a `kind` requires currently has a live id. False
 * means a segment shouldn't start yet (or should be retried shortly).
 *
 * @param {{ currentTrackIds: { camera: string|null, microphone: string|null }, kind: 'audio+video'|'video'|'audio'|null }} params
 * @returns {boolean}
 */
export function requiredTracksReady({ currentTrackIds, kind }) {
  const required = requiredTrackSlots(kind)
  if (required.camera && !currentTrackIds.camera) return false
  if (required.microphone && !currentTrackIds.microphone) return false
  return required.camera || required.microphone
}

/**
 * Whether a track a running segment depends on has drifted since the
 * segment started recording it — covers a late publish (null -> id), an
 * unpublish/end (id -> null), and a replace/reacquire (id -> different id).
 * Only slots the `kind` actually requires are considered.
 *
 * @param {{ recordedTrackIds: { camera: string|null, microphone: string|null }, currentTrackIds: { camera: string|null, microphone: string|null }, kind: 'audio+video'|'video'|'audio'|null }} params
 * @returns {boolean}
 */
export function haveRequiredTracksDrifted({
  recordedTrackIds,
  currentTrackIds,
  kind,
}) {
  const required = requiredTrackSlots(kind)
  if (required.camera && recordedTrackIds.camera !== currentTrackIds.camera) {
    return true
  }
  if (
    required.microphone &&
    recordedTrackIds.microphone !== currentTrackIds.microphone
  ) {
    return true
  }
  return false
}
