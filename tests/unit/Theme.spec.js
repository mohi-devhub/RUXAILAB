import Theme from '@/ux/FocusGroup/models/Theme'

describe('Theme', () => {
  it('fills in defaults and generates an id when constructed empty', () => {
    const theme = new Theme()
    expect(theme.id).toMatch(/^theme-/)
    expect(theme.label).toBe('')
    expect(theme.responseRefs).toEqual([])
    expect(theme.keywords).toEqual([])
    expect(theme.frequency).toBe(0)
    expect(theme.source).toBe('manual')
  })

  it('generates unique ids', () => {
    const a = Theme.generateId()
    const b = Theme.generateId()
    expect(a).not.toBe(b)
  })

  it('round-trips through Firestore', () => {
    const theme = new Theme({
      id: 'theme-1',
      label: 'Navigation confusion',
      responseRefs: [
        {
          sessionId: 'session-1',
          topicId: 'topic-1',
          messageId: 'm1',
          participantId: 'user-1',
          excerpt: 'I could not find the menu',
        },
      ],
    })
    const data = theme.toFirestore()
    const restored = Theme.fromFirestore(data)

    expect(restored.id).toBe('theme-1')
    expect(restored.label).toBe('Navigation confusion')
    expect(restored.responseRefs).toHaveLength(1)
    expect(restored.responseRefs[0].excerpt).toBe('I could not find the menu')
  })

  it('defaults responseRefs to an empty array when missing', () => {
    const theme = new Theme({ label: 'Empty theme' })
    expect(theme.responseRefs).toEqual([])
  })

  it('round-trips an NLP-suggested theme, including keywords and frequency', () => {
    const theme = new Theme({
      id: 'nlp-theme-0',
      label: 'navigation confusion',
      keywords: ['navigation', 'confusion'],
      frequency: 3,
      source: 'nlp',
      responseRefs: [],
    })
    const restored = Theme.fromFirestore(theme.toFirestore())

    expect(restored.source).toBe('nlp')
    expect(restored.keywords).toEqual(['navigation', 'confusion'])
    expect(restored.frequency).toBe(3)
  })

  it('treats any non-"nlp" source as manual', () => {
    expect(new Theme({ source: 'nlp' }).source).toBe('nlp')
    expect(new Theme({ source: 'manual' }).source).toBe('manual')
    expect(new Theme({}).source).toBe('manual')
    expect(new Theme({ source: 'bogus' }).source).toBe('manual')
  })
})
