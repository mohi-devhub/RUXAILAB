import {
  buildRecordingStoragePath,
  resolveRecordingMode,
} from '@/ux/FocusGroup/utils/recordingPath'

describe('buildRecordingStoragePath', () => {
  it('builds a focusgroup_-prefixed path scoped to the study/user/topic', () => {
    const path = buildRecordingStoragePath({
      studyId: 'study-1',
      userId: 'user-1',
      topicId: 'topic-1',
      mimeType: 'video/webm',
      now: 1700000000000,
    })
    expect(path).toBe('tests/study-1/focusgroup_user-1/topic_topic-1/1700000000000.webm')
  })

  it('picks the mp4 extension when the recorder produced mp4', () => {
    const path = buildRecordingStoragePath({
      studyId: 'study-1',
      userId: 'user-1',
      topicId: 'topic-1',
      mimeType: 'video/mp4;codecs=avc1',
      now: 1,
    })
    expect(path.endsWith('.mp4')).toBe(true)
  })

  it('defaults to webm when the mime type is missing or unrecognized', () => {
    const path = buildRecordingStoragePath({
      studyId: 'study-1',
      userId: 'user-1',
      topicId: 'topic-1',
      mimeType: undefined,
      now: 1,
    })
    expect(path.endsWith('.webm')).toBe(true)
  })
})

describe('resolveRecordingMode', () => {
  it('does not record when neither audio nor video is configured', () => {
    expect(
      resolveRecordingMode({ recordAudio: false, recordVideo: false, canPublish: true }),
    ).toEqual({ shouldRecord: false, kind: null })
  })

  it('does not record observers even if the session config wants it', () => {
    expect(
      resolveRecordingMode({ recordAudio: true, recordVideo: true, canPublish: false }),
    ).toEqual({ shouldRecord: false, kind: null })
  })

  it('records audio+video when both are enabled', () => {
    expect(
      resolveRecordingMode({ recordAudio: true, recordVideo: true, canPublish: true }),
    ).toEqual({ shouldRecord: true, kind: 'audio+video' })
  })

  it('records video only', () => {
    expect(
      resolveRecordingMode({ recordAudio: false, recordVideo: true, canPublish: true }),
    ).toEqual({ shouldRecord: true, kind: 'video' })
  })

  it('records audio only', () => {
    expect(
      resolveRecordingMode({ recordAudio: true, recordVideo: false, canPublish: true }),
    ).toEqual({ shouldRecord: true, kind: 'audio' })
  })
})
