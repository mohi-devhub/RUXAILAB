import { ref, watch, onBeforeUnmount } from 'vue'
import { RoomEvent, Track } from 'livekit-client'

/**
 * Keeps refs to the LOCAL participant's currently-published camera/microphone
 * MediaStreamTracks in sync with LiveKit's actual publish state, for as long
 * as this client stays connected to the room — one set of listeners for the
 * whole session, not re-registered per topic. A consumer reading
 * `cameraTrack.value`/`microphoneTrack.value` always gets whatever is
 * genuinely live right now (or null), never a stale one-shot snapshot.
 *
 * @param {import('vue').Ref} roomRef - the LiveKit Room ref from useLiveKitRoom.
 * @returns {{ cameraTrack: import('vue').Ref<MediaStreamTrack|null>, microphoneTrack: import('vue').Ref<MediaStreamTrack|null> }}
 */
export function useLocalRecordingStream(roomRef) {
  const cameraTrack = ref(null)
  const microphoneTrack = ref(null)
  let attachedRoom = null

  const trackRefFor = (source) =>
    source === Track.Source.Camera
      ? cameraTrack
      : source === Track.Source.Microphone
        ? microphoneTrack
        : null

  function handleLocalTrackPublished(publication) {
    const targetRef = trackRefFor(publication?.source)
    if (targetRef) targetRef.value = publication?.track?.mediaStreamTrack ?? null
  }

  function handleLocalTrackUnpublished(publication) {
    const targetRef = trackRefFor(publication?.source)
    if (targetRef) targetRef.value = null
  }

  function seedFromCurrentPublications(room) {
    const localParticipant = room.localParticipant
    cameraTrack.value =
      localParticipant?.getTrackPublication(Track.Source.Camera)?.track
        ?.mediaStreamTrack ?? null
    microphoneTrack.value =
      localParticipant?.getTrackPublication(Track.Source.Microphone)?.track
        ?.mediaStreamTrack ?? null
  }

  function detach() {
    if (attachedRoom) {
      attachedRoom.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      attachedRoom.off(
        RoomEvent.LocalTrackUnpublished,
        handleLocalTrackUnpublished,
      )
      attachedRoom = null
    }
    cameraTrack.value = null
    microphoneTrack.value = null
  }

  watch(
    roomRef,
    (room) => {
      detach()
      if (room) {
        seedFromCurrentPublications(room)
        room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
        room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
        attachedRoom = room
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(detach)

  return { cameraTrack, microphoneTrack }
}
