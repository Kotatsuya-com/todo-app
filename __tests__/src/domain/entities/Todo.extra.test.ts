import { TodoEntity, TodoStatus, TodoData } from '../../../../src/domain/entities/Todo'

// 固定日時でテスト（他のテストと整合）
beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2025-08-03T12:00:00Z'))
})

afterAll(() => {
  jest.useRealTimers()
})

const baseData: TodoData = {
  id: 'id-1',
  user_id: 'user-1',
  title: 'Title',
  body: 'Body',
  deadline: '2025-08-05',
  importance_score: 1000,
  status: 'open' as TodoStatus,
  created_at: '2025-08-01T00:00:00Z',
  updated_at: '2025-08-01T00:00:00Z',
  created_via: 'manual'
}

describe('TodoEntity extra coverage', () => {
  test('getDisplayTitle uses title or derives from body (HTML strip and trim)', () => {
    const htmlBody = '<p>これはとても長い本文です。HTMLは除去されます。</p>'
    const long = new TodoEntity({ ...baseData, title: null, body: htmlBody })
    const derived = long.getDisplayTitle()
    expect(derived.length).toBeGreaterThan(0)

    const shortBody = new TodoEntity({ ...baseData, title: null, body: '短い本文' })
    expect(shortBody.getDisplayTitle()).toBe('短い本文')

    const withTitle = new TodoEntity({ ...baseData, title: '優先タイトル' })
    expect(withTitle.getDisplayTitle()).toBe('優先タイトル')
  })

  test('getPlainTextBody and getTrimmedBody work as expected', () => {
    const entity = new TodoEntity({ ...baseData, body: '<b>ABC</b>DEF' })
    expect(entity.getPlainTextBody()).toBe('ABCDEF')
    expect(entity.getTrimmedBody(3)).toBe('ABC...')
  })

  test('getFormattedDeadline returns correct labels', () => {
    const noDeadline = new TodoEntity({ ...baseData, deadline: null })
    expect(noDeadline.getFormattedDeadline()).toBeNull()

    const overdue = new TodoEntity({ ...baseData, deadline: '2025-08-01' })
    expect(overdue.getFormattedDeadline()).toMatch('日前期限切れ')

    const today = new TodoEntity({ ...baseData, deadline: '2025-08-03' })
    expect(today.getFormattedDeadline()).toBe('今日期限')

    const tomorrow = new TodoEntity({ ...baseData, deadline: '2025-08-04' })
    expect(tomorrow.getFormattedDeadline()).toBe('明日期限')

    const future = new TodoEntity({ ...baseData, deadline: '2025-08-06' })
    expect(future.getFormattedDeadline()).toBe('3日後期限')
  })

  test('updateImportanceScore throws on negative and updates on valid', () => {
    const entity = new TodoEntity(baseData)
    expect(() => entity.updateImportanceScore(-1)).toThrow('Importance score must be non-negative')
    const updated = entity.updateImportanceScore(1800)
    expect(updated.importanceScore).toBe(1800)
  })

  test('status helpers and transitions (complete/reopen)', () => {
    const open = new TodoEntity({ ...baseData, status: 'open' })
    expect(open.isActive()).toBe(true)
    expect(open.isCompleted()).toBe(false)

    const done = open.complete()
    expect(done.isCompleted()).toBe(true)
    const reopened = done.reopen()
    expect(reopened.isActive()).toBe(true)
  })

  test('update merges fields immutably', () => {
    const entity = new TodoEntity(baseData)
    const updated = entity.update({ title: 'New', deadline: null })
    expect(updated.title).toBe('New')
    expect(updated.deadline).toBeNull()
    // original remains unchanged
    expect(entity.title).toBe('Title')
    expect(entity.deadline).toBe('2025-08-05')
  })

  test('validate catches negative importance score', () => {
    const invalid = new TodoEntity({ ...baseData, importance_score: -5 })
    const res = invalid.validate()
    expect(res.valid).toBe(false)
    expect(res.errors).toContain('Importance score must be non-negative')
  })

  test('fromApiResponse applies defaults when fields missing', () => {
    const api = {
      id: 'api-1',
      user_id: 'user-1',
      title: null,
      body: 'b',
      deadline: null,
      created_at: '2025-08-01T00:00:00Z',
      updated_at: '2025-08-01T00:00:00Z'
    }
    const e = TodoEntity.fromApiResponse(api)
    expect(e.importanceScore).toBe(TodoEntity.DEFAULT_IMPORTANCE_SCORE)
    expect(e.status).toBe('open')
    expect(e.createdVia).toBe('manual')
  })
})

