import { evaluateRecordingStaleness } from '@/ux/FocusGroup/utils/recordingWatchdog'

const baseParams = {
  now: 100000,
  segmentStartedAt: 90000,
  lastChunkAt: 99000,
  recentChunkSizes: [5000, 5200, 4800],
  cameraTrackState: 'live',
  microphoneTrackState: 'live',
}

describe('evaluateRecordingStaleness', () => {
  it('is not stale for healthy signals', () => {
    expect(evaluateRecordingStaleness(baseParams)).toEqual({
      stale: false,
      reason: null,
    })
  })

  it('flags a camera track that has ended', () => {
    expect(
      evaluateRecordingStaleness({ ...baseParams, cameraTrackState: 'ended' }),
    ).toEqual({ stale: true, reason: 'camera-track-ended' })
  })

  it('flags a microphone track that has ended', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        microphoneTrackState: 'ended',
      }),
    ).toEqual({ stale: true, reason: 'microphone-track-ended' })
  })

  it('ignores a track that is merely null (not required)', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        cameraTrackState: null,
        microphoneTrackState: 'live',
      }),
    ).toEqual({ stale: false, reason: null })
  })

  it('flags no-chunk-timeout once the gap since the last chunk exceeds the threshold', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        now: 99000 + 8000,
        lastChunkAt: 99000,
        noChunkTimeoutMs: 8000,
      }),
    ).toEqual({ stale: true, reason: 'no-chunk-timeout' })
  })

  it('does not flag no-chunk-timeout just under the threshold', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        now: 99000 + 7999,
        lastChunkAt: 99000,
        noChunkTimeoutMs: 8000,
      }),
    ).toEqual({ stale: false, reason: null })
  })

  it('falls back to segmentStartedAt when no chunk has arrived yet', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        lastChunkAt: 0,
        segmentStartedAt: 90000,
        now: 90000 + 8000,
        noChunkTimeoutMs: 8000,
      }),
    ).toEqual({ stale: true, reason: 'no-chunk-timeout' })
  })

  it('flags chunk-flatline when the last N chunks are all near-empty', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        recentChunkSizes: [5000, 50, 30, 10],
        flatlineStreakLimit: 3,
        flatlineMinBytes: 200,
      }),
    ).toEqual({ stale: true, reason: 'chunk-flatline' })
  })

  it('does not flag chunk-flatline if any recent chunk is healthy-sized', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        recentChunkSizes: [50, 5000, 30],
        flatlineStreakLimit: 3,
        flatlineMinBytes: 200,
      }),
    ).toEqual({ stale: false, reason: null })
  })

  it('does not flag chunk-flatline before enough samples have arrived', () => {
    expect(
      evaluateRecordingStaleness({
        ...baseParams,
        recentChunkSizes: [50],
        flatlineStreakLimit: 3,
        flatlineMinBytes: 200,
      }),
    ).toEqual({ stale: false, reason: null })
  })
})
