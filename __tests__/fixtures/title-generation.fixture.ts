/**
 * Test fixtures for TitleGeneration entities
 * タイトル生成エンティティテスト用の共通フィクスチャ
 */

import { TitleGenerationRequest, TitleGenerationOptions } from '@/lib/entities/TitleGeneration'

// 有効なコンテンツのパターン
export const VALID_CONTENTS = [
  'タスクを完了する',
  'プロジェクトの企画書を作成する必要があります',
  'Meeting with the team about project planning',
  '明日までにレポートを仕上げること',
  '新しい機能の開発とテスト',
  'データベースの最適化を行う',
  'ユーザーインターフェースの改善',
  'APIの文書化作業',
  'コードレビューを実施する',
  'バグの修正と品質向上'
]

// 無効なコンテンツのパターン
export const INVALID_CONTENTS = [
  '',
  '   ',
  null,
  undefined,
  123,
  {},
  [],
  'a'.repeat(2001) // 最大長を超える
]

// 複雑度別のコンテンツ
export const COMPLEXITY_CONTENTS = {
  simple: [
    'タスク',
    'メール送信',
    '会議',
    '買い物'
  ],
  medium: [
    'Create project status report for management',
    'Prepare comprehensive quarterly business review meeting agenda',
    'Update user documentation and training materials completely',
    'Review system performance and optimization for better efficiency'
  ],
  complex: [
    'Develop comprehensive system architecture review plan including performance optimization security enhancement implementation monitoring deployment testing validation documentation training user acceptance testing maintenance and ongoing support strategies for enterprise scale applications',
    'Design and implement multi platform mobile application development framework covering requirements analysis system design implementation testing deployment user acceptance testing performance monitoring security auditing maintenance documentation and continuous improvement processes',
    'Build and deploy AI powered customer analytics system with real time data pipeline optimization machine learning model training validation deployment monitoring alerting and continuous improvement automation for enterprise scale data processing requirements'
  ]
}

// モックTitleGenerationRequest
export const createMockTitleGenerationRequest = (overrides: Partial<TitleGenerationRequest> = {}): TitleGenerationRequest => ({
  content: 'プロジェクトの企画書を作成する',
  ...overrides
})

// モックTitleGenerationOptions
export const createMockTitleGenerationOptions = (overrides: Partial<TitleGenerationOptions> = {}): TitleGenerationOptions => ({
  model: 'gpt-4o-mini',
  maxTokens: 50,
  temperature: 0.7,
  maxLength: 15,
  ...overrides
})

// バリデーションエラーのテストケース
export const VALIDATION_ERROR_TEST_CASES = [
  {
    name: 'empty content',
    request: createMockTitleGenerationRequest({ content: '' }),
    expectedErrors: ['Content is required']
  },
  {
    name: 'null content',
    request: createMockTitleGenerationRequest({ content: null as any }),
    expectedErrors: ['Content is required']
  },
  {
    name: 'undefined content',
    request: createMockTitleGenerationRequest({ content: undefined as any }),
    expectedErrors: ['Content is required']
  },
  {
    name: 'non-string content',
    request: createMockTitleGenerationRequest({ content: 123 as any }),
    expectedErrors: ['Content must be a string']
  },
  {
    name: 'whitespace only content',
    request: createMockTitleGenerationRequest({ content: '   ' }),
    expectedErrors: ['Content cannot be empty']
  },
  {
    name: 'too long content',
    request: createMockTitleGenerationRequest({ content: 'a'.repeat(2001) }),
    expectedErrors: ['Content cannot exceed 2000 characters']
  }
]

// 複雑度判定のテストケース
export const COMPLEXITY_TEST_CASES = [
  {
    content: 'タスク',
    expectedComplexity: 'simple',
    expectedTemp: 0.3
  },
  {
    content: 'Create project status report for management', // 6単語、特殊文字なし
    expectedComplexity: 'medium',
    expectedTemp: 0.7
  },
  {
    content: 'Develop comprehensive system architecture review plan including performance optimization security enhancement implementation monitoring deployment testing validation documentation training user acceptance testing maintenance and ongoing support strategies for enterprise scale applications', // 30単語
    expectedComplexity: 'complex',
    expectedTemp: 0.9
  },
  {
    content: 'Email with @symbols and #hashtags',
    expectedComplexity: 'medium', // 5単語 + 特殊文字あり
    expectedTemp: 0.7
  }
]

// タイトル処理のテストケース
export const TITLE_PROCESSING_TEST_CASES = [
  {
    input: '  タスクを完了する  ',
    expected: 'タスクを完了する'
  },
  {
    input: '',
    expected: 'タスク'
  },
  {
    input: null,
    expected: 'タスク'
  },
  {
    input: undefined,
    expected: 'タスク'
  },
  {
    input: 'これは非常に長いタイトルで15文字を超えているので切り詰める必要があります',
    expected: 'これは非常に長いタイトルで15'
  },
  {
    input: 'ちょうど15文字のタイトルです',
    expected: 'ちょうど15文字のタイトルです'
  }
]

// OpenAI APIパラメータのテストケース
export const API_PARAMETERS_TEST_CASES = [
  {
    content: 'タスクを完了する',
    options: {},
    expectedModel: 'gpt-4o-mini',
    expectedTemperature: 0.7,
    expectedMaxTokens: 50
  },
  {
    content: 'プロジェクト管理',
    options: { model: 'gpt-4', temperature: 0.5, maxTokens: 30 },
    expectedModel: 'gpt-4',
    expectedTemperature: 0.5,
    expectedMaxTokens: 30
  }
]

// エッジケースのテストデータ
export const EDGE_CASE_DATA = {
  // 特殊文字を含むコンテンツ
  specialCharacters: {
    content: 'タスク「重要」の実行 & 確認 #urgent @team',
    expectedComplexity: 'medium'
  },

  // 絵文字を含むコンテンツ
  emojiContent: {
    content: '🚀 プロジェクト完了 🎉',
    expectedComplexity: 'medium' // 特殊文字（絵文字）があるため
  },

  // 複数言語混在
  mixedLanguages: {
    content: 'Task management システムの開発 and testing',
    expectedComplexity: 'simple' // 5単語、特殊文字なし
  },

  // 境界値
  boundaryValues: {
    minLength: 'a',
    maxLength: 'a'.repeat(2000),
    almostMaxLength: 'a'.repeat(1999)
  }
}

// モックされた生成結果
export const MOCK_GENERATION_RESULTS = {
  success: '企画書作成',
  empty: '',
  tooLong: 'これは非常に長いタイトルで最大長を超えている例です',
  withWhitespace: '  タスク完了  ',
  fallback: null
}
