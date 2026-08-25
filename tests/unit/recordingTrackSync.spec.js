import {
  requiredTrackSlots,
  trackIdsFor,
  requiredTracksReady,
  haveRequiredTracksDrifted,
} from '@/ux/FocusGroup/utils/recordingTrackSync'

describe('requiredTrackSlots', () => {
  it('requires both for audio+video', () => {
    expect(requiredTrackSlots('audio+video')).toEqual({
      camera: true,
      microphone: true,
    })
  })

  it('requires only camera for video', () => {
    expect(requiredTrackSlots('video')).toEqual({
      camera: true,
      microphone: false,
    })
  })

  it('requires only microphone for audio', () => {
    expect(requiredTrackSlots('audio')).toEqual({
      camera: false,
      microphone: true,
    })
  })

  it('requires neither when null', () => {
    expect(requiredTrackSlots(null)).toEqual({
      camera: false,
      microphone: false,
    })
  })
})

describe('trackIdsFor', () => {
  it('reads ids off present tracks', () => {
    expect(
      trackIdsFor({
        cameraTrack: { id: 'cam-1' },
        microphoneTrack: { id: 'mic-1' },
      }),
    ).toEqual({ camera: 'cam-1', microphone: 'mic-1' })
  })

  it('defaults to null for missing tracks', () => {
    expect(trackIdsFor({ cameraTrack: null, microphoneTrack: null })).toEqual({
      camera: null,
      microphone: null,
    })
  })
})

describe('requiredTracksReady', () => {
  it('is true when every required slot has an id', () => {
    expect(
      requiredTracksReady({
        currentTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        kind: 'audio+video',
      }),
    ).toBe(true)
  })

  it('is false when a required slot is missing', () => {
    expect(
      requiredTracksReady({
        currentTrackIds: { camera: null, microphone: 'mic-1' },
        kind: 'audio+video',
      }),
    ).toBe(false)
  })

  it('ignores a slot the kind does not need', () => {
    expect(
      requiredTracksReady({
        currentTrackIds: { camera: null, microphone: 'mic-1' },
        kind: 'audio',
      }),
    ).toBe(true)
  })

  it('is false when nothing is required at all', () => {
    expect(
      requiredTracksReady({
        currentTrackIds: { camera: null, microphone: null },
        kind: null,
      }),
    ).toBe(false)
  })
})

describe('haveRequiredTracksDrifted', () => {
  it('detects a late publish (null -> id)', () => {
    expect(
      haveRequiredTracksDrifted({
        recordedTrackIds: { camera: null, microphone: 'mic-1' },
        currentTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        kind: 'audio+video',
      }),
    ).toBe(true)
  })

  it('detects an unpublish/end (id -> null)', () => {
    expect(
      haveRequiredTracksDrifted({
        recordedTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        currentTrackIds: { camera: null, microphone: 'mic-1' },
        kind: 'audio+video',
      }),
    ).toBe(true)
  })

  it('detects a replace/reacquire (id -> different id)', () => {
    expect(
      haveRequiredTracksDrifted({
        recordedTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        currentTrackIds: { camera: 'cam-2', microphone: 'mic-1' },
        kind: 'audio+video',
      }),
    ).toBe(true)
  })

  it('is false when nothing required has changed', () => {
    expect(
      haveRequiredTracksDrifted({
        recordedTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        currentTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        kind: 'audio+video',
      }),
    ).toBe(false)
  })

  it('ignores drift in a slot the kind does not need', () => {
    expect(
      haveRequiredTracksDrifted({
        recordedTrackIds: { camera: 'cam-1', microphone: 'mic-1' },
        currentTrackIds: { camera: 'cam-2', microphone: 'mic-1' },
        kind: 'audio',
      }),
    ).toBe(false)
  })
})
