/**
 * @jest-environment jsdom
 */

import { TitleGenerationEntity } from '@/lib/entities/TitleGeneration'
import {
  createMockTitleGenerationRequest,
  createMockTitleGenerationOptions,
  VALID_CONTENTS,
  INVALID_CONTENTS,
  COMPLEXITY_CONTENTS,
  VALIDATION_ERROR_TEST_CASES,
  COMPLEXITY_TEST_CASES,
  TITLE_PROCESSING_TEST_CASES,
  API_PARAMETERS_TEST_CASES,
  EDGE_CASE_DATA,
  MOCK_GENERATION_RESULTS
} from '@/__tests__/fixtures/title-generation.fixture'

describe('TitleGenerationEntity', () => {
  describe('constructor and getters', () => {
    it('should create TitleGenerationEntity with correct properties', () => {
      const request = createMockTitleGenerationRequest()
      const options = createMockTitleGenerationOptions()
      const entity = new TitleGenerationEntity(request, options)

      expect(entity.content).toBe(request.content)
      expect(entity.options).toEqual(options)
      expect(entity.contentLength).toBe(request.content.length)
    })

    it('should use default options when not provided', () => {
      const request = createMockTitleGenerationRequest()
      const entity = new TitleGenerationEntity(request)

      expect(entity.options.model).toBe(TitleGenerationEntity.DEFAULT_MODEL)
      expect(entity.options.temperature).toBe(TitleGenerationEntity.DEFAULT_TEMPERATURE)
      expect(entity.options.maxTokens).toBe(TitleGenerationEntity.DEFAULT_MAX_TOKENS)
      expect(entity.options.maxLength).toBe(TitleGenerationEntity.DEFAULT_MAX_TITLE_LENGTH)
    })

    it('should handle partial options correctly', () => {
      const request = createMockTitleGenerationRequest()
      const partialOptions = { temperature: 0.5 }
      const entity = new TitleGenerationEntity(request, partialOptions)

      expect(entity.options.temperature).toBe(0.5)
      expect(entity.options.model).toBe(TitleGenerationEntity.DEFAULT_MODEL)
      expect(entity.options.maxTokens).toBe(TitleGenerationEntity.DEFAULT_MAX_TOKENS)
    })

    it('should maintain immutability of request object', () => {
      const originalRequest = createMockTitleGenerationRequest()
      const originalContent = originalRequest.content
      const entity = new TitleGenerationEntity(originalRequest)

      // Modify original request
      originalRequest.content = 'modified content'

      // Entity should maintain original values
      expect(entity.content).toBe(originalContent)
      expect(entity.content).not.toBe('modified content')
    })
  })

  describe('isValidContent', () => {
    it('should validate correct content', () => {
      VALID_CONTENTS.forEach(content => {
        const entity = TitleGenerationEntity.fromContent(content)
        expect(entity.isValidContent()).toBe(true)
      })
    })

    it('should reject invalid content', () => {
      INVALID_CONTENTS.forEach(content => {
        const entity = TitleGenerationEntity.fromContent(content as any)
        expect(entity.isValidContent()).toBe(false)
      })
    })

    it('should handle boundary values correctly', () => {
      // Minimum length (1 character)
      const minEntity = TitleGenerationEntity.fromContent('a')
      expect(minEntity.isValidContent()).toBe(true)

      // Maximum length (2000 characters)
      const maxEntity = TitleGenerationEntity.fromContent('a'.repeat(2000))
      expect(maxEntity.isValidContent()).toBe(true)

      // Over maximum length
      const overMaxEntity = TitleGenerationEntity.fromContent('a'.repeat(2001))
      expect(overMaxEntity.isValidContent()).toBe(false)
    })

    it('should handle whitespace-only content', () => {
      const whitespaceEntity = TitleGenerationEntity.fromContent('   ')
      expect(whitespaceEntity.isValidContent()).toBe(false)
    })
  })

  describe('validateRequest', () => {
    it('should pass validation for valid requests', () => {
      VALID_CONTENTS.forEach(content => {
        const entity = TitleGenerationEntity.fromContent(content)
        const validation = entity.validateRequest()

        expect(validation.valid).toBe(true)
        expect(validation.errors).toEqual([])
      })
    })

    it('should fail validation with specific error messages', () => {
      VALIDATION_ERROR_TEST_CASES.forEach(testCase => {
        const entity = new TitleGenerationEntity(testCase.request)
        const validation = entity.validateRequest()

        expect(validation.valid).toBe(false)
        expect(validation.errors).toEqual(testCase.expectedErrors)
      })
    })

    it('should provide detailed validation information', () => {
      const entity = TitleGenerationEntity.fromContent('')
      const validation = entity.validateRequest()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors[0]).toContain('Content')
    })
  })

  describe('generateApiParameters', () => {
    it('should generate correct API parameters', () => {
      API_PARAMETERS_TEST_CASES.forEach(testCase => {
        const entity = new TitleGenerationEntity(
          { content: testCase.content },
          testCase.options
        )
        const params = entity.generateApiParameters()

        expect(params.model).toBe(testCase.expectedModel)
        expect(params.temperature).toBe(testCase.expectedTemperature)
        expect(params.max_tokens).toBe(testCase.expectedMaxTokens)
        expect(params.messages).toHaveLength(2)
        expect(params.messages[0].role).toBe('system')
        expect(params.messages[1].role).toBe('user')
        expect(params.messages[1].content).toContain(testCase.content)
      })
    })

    it('should include correct system message with length constraint', () => {
      const entity = new TitleGenerationEntity(
        { content: 'test content' },
        { maxLength: 20 }
      )
      const params = entity.generateApiParameters()

      expect(params.messages[0].content).toContain('20文字以内')
    })

    it('should include user content in the user message', () => {
      const content = 'テストタスクの内容です'
      const entity = TitleGenerationEntity.fromContent(content)
      const params = entity.generateApiParameters()

      expect(params.messages[1].content).toContain(content)
    })
  })

  describe('processGeneratedTitle', () => {
    it('should process titles correctly', () => {
      const entity = TitleGenerationEntity.fromContent('test')

      TITLE_PROCESSING_TEST_CASES.forEach(testCase => {
        const result = entity.processGeneratedTitle(testCase.input as any)
        expect(result).toBe(testCase.expected)
      })
    })

    it('should truncate long titles', () => {
      const entity = new TitleGenerationEntity(
        { content: 'test' },
        { maxLength: 10 }
      )

      const longTitle = 'これは10文字を超える長いタイトルです'
      const result = entity.processGeneratedTitle(longTitle)

      expect(result.length).toBe(10)
      expect(result).toBe('これは10文字を超え')
    })

    it('should handle edge cases gracefully', () => {
      const entity = TitleGenerationEntity.fromContent('test')

      // Empty string
      expect(entity.processGeneratedTitle('')).toBe(TitleGenerationEntity.FALLBACK_TITLE)

      // Null
      expect(entity.processGeneratedTitle(null)).toBe(TitleGenerationEntity.FALLBACK_TITLE)

      // Undefined
      expect(entity.processGeneratedTitle(undefined)).toBe(TitleGenerationEntity.FALLBACK_TITLE)

      // Whitespace only
      expect(entity.processGeneratedTitle('   ')).toBe(TitleGenerationEntity.FALLBACK_TITLE)
    })
  })

  describe('createResult', () => {
    it('should create correct result object', () => {
      const content = 'プロジェクト管理タスク'
      const options = createMockTitleGenerationOptions()
      const entity = new TitleGenerationEntity({ content }, options)
      const generatedTitle = '管理タスク'

      const result = entity.createResult(generatedTitle)

      expect(result).toEqual({
        title: generatedTitle,
        originalContent: content,
        contentLength: content.length,
        model: options.model
      })
    })

    it('should include correct metadata', () => {
      const entity = TitleGenerationEntity.fromContent('test content')
      const result = entity.createResult('Generated Title')

      expect(result.originalContent).toBe('test content')
      expect(result.contentLength).toBe('test content'.length)
      expect(result.model).toBe(TitleGenerationEntity.DEFAULT_MODEL)
    })
  })

  describe('getContentComplexity', () => {
    it('should correctly assess content complexity', () => {
      COMPLEXITY_TEST_CASES.forEach(testCase => {
        const entity = TitleGenerationEntity.fromContent(testCase.content)
        const complexity = entity.getContentComplexity()

        expect(complexity).toBe(testCase.expectedComplexity)
      })
    })

    it('should handle special characters in complexity assessment', () => {
      const entity = TitleGenerationEntity.fromContent(EDGE_CASE_DATA.specialCharacters.content)
      const complexity = entity.getContentComplexity()

      expect(complexity).toBe(EDGE_CASE_DATA.specialCharacters.expectedComplexity)
    })

    it('should classify different content types correctly', () => {
      // Simple content
      COMPLEXITY_CONTENTS.simple.forEach(content => {
        const entity = TitleGenerationEntity.fromContent(content)
        expect(entity.getContentComplexity()).toBe('simple')
      })

      // Medium content
      COMPLEXITY_CONTENTS.medium.forEach(content => {
        const entity = TitleGenerationEntity.fromContent(content)
        expect(entity.getContentComplexity()).toBe('medium')
      })

      // Complex content
      COMPLEXITY_CONTENTS.complex.forEach(content => {
        const entity = TitleGenerationEntity.fromContent(content)
        expect(entity.getContentComplexity()).toBe('complex')
      })
    })
  })

  describe('getRecommendedTemperature', () => {
    it('should return appropriate temperature for complexity', () => {
      COMPLEXITY_TEST_CASES.forEach(testCase => {
        const entity = TitleGenerationEntity.fromContent(testCase.content)
        const temperature = entity.getRecommendedTemperature()

        expect(temperature).toBe(testCase.expectedTemp)
      })
    })

    it('should provide different temperatures for different complexities', () => {
      const simpleEntity = TitleGenerationEntity.fromContent('タスク')
      const mediumEntity = TitleGenerationEntity.fromContent('Create project status report for management')
      const complexEntity = TitleGenerationEntity.fromContent(COMPLEXITY_CONTENTS.complex[0])

      const simpleTemp = simpleEntity.getRecommendedTemperature()
      const mediumTemp = mediumEntity.getRecommendedTemperature()
      const complexTemp = complexEntity.getRecommendedTemperature()

      expect(simpleTemp).toBeLessThan(mediumTemp)
      expect(mediumTemp).toBeLessThan(complexTemp)
    })
  })

  describe('factory methods', () => {
    it('should create entity from content using fromContent', () => {
      const content = 'test content'
      const entity = TitleGenerationEntity.fromContent(content)

      expect(entity).toBeInstanceOf(TitleGenerationEntity)
      expect(entity.content).toBe(content)
      expect(entity.options.model).toBe(TitleGenerationEntity.DEFAULT_MODEL)
    })

    it('should create entity with options using fromContent', () => {
      const content = 'test content'
      const options = { temperature: 0.5, model: 'gpt-4' }
      const entity = TitleGenerationEntity.fromContent(content, options)

      expect(entity.content).toBe(content)
      expect(entity.options.temperature).toBe(0.5)
      expect(entity.options.model).toBe('gpt-4')
    })

    it('should create optimized entity using withOptimizedSettings', () => {
      const content = 'Create project status report for management'
      const entity = TitleGenerationEntity.withOptimizedSettings(content)

      expect(entity.content).toBe(content)
      expect(entity.options.temperature).toBe(0.7) // medium complexity
    })

    it('should optimize temperature based on content complexity', () => {
      const simpleContent = 'タスク'
      const complexContent = COMPLEXITY_CONTENTS.complex[0]

      const simpleEntity = TitleGenerationEntity.withOptimizedSettings(simpleContent)
      const complexEntity = TitleGenerationEntity.withOptimizedSettings(complexContent)

      expect(simpleEntity.options.temperature).toBe(0.3)
      expect(complexEntity.options.temperature).toBe(0.9) // Complex content (30+ words)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle content with special characters', () => {
      const entity = TitleGenerationEntity.fromContent(EDGE_CASE_DATA.specialCharacters.content)

      expect(entity.isValidContent()).toBe(true)
      expect(entity.validateRequest().valid).toBe(true)
    })

    it('should handle emoji content', () => {
      const entity = TitleGenerationEntity.fromContent(EDGE_CASE_DATA.emojiContent.content)

      expect(entity.isValidContent()).toBe(true)
      expect(entity.getContentComplexity()).toBe(EDGE_CASE_DATA.emojiContent.expectedComplexity)
    })

    it('should handle mixed language content', () => {
      const entity = TitleGenerationEntity.fromContent(EDGE_CASE_DATA.mixedLanguages.content)

      expect(entity.isValidContent()).toBe(true)
      expect(entity.getContentComplexity()).toBe(EDGE_CASE_DATA.mixedLanguages.expectedComplexity)
    })

    it('should handle boundary length values', () => {
      const { minLength, maxLength, almostMaxLength } = EDGE_CASE_DATA.boundaryValues

      expect(TitleGenerationEntity.fromContent(minLength).isValidContent()).toBe(true)
      expect(TitleGenerationEntity.fromContent(maxLength).isValidContent()).toBe(true)
      expect(TitleGenerationEntity.fromContent(almostMaxLength).isValidContent()).toBe(true)
    })

    it('should maintain consistent behavior across multiple calls', () => {
      const entity = TitleGenerationEntity.fromContent('consistent test')

      // Multiple calls should return same results
      expect(entity.getContentComplexity()).toBe(entity.getContentComplexity())
      expect(entity.getRecommendedTemperature()).toBe(entity.getRecommendedTemperature())
      expect(entity.isValidContent()).toBe(entity.isValidContent())
    })
  })

  describe('constants and default values', () => {
    it('should have correct constant values', () => {
      expect(TitleGenerationEntity.MIN_CONTENT_LENGTH).toBe(1)
      expect(TitleGenerationEntity.MAX_CONTENT_LENGTH).toBe(2000)
      expect(TitleGenerationEntity.DEFAULT_MAX_TITLE_LENGTH).toBe(15)
      expect(TitleGenerationEntity.DEFAULT_MODEL).toBe('gpt-4o-mini')
      expect(TitleGenerationEntity.DEFAULT_MAX_TOKENS).toBe(50)
      expect(TitleGenerationEntity.DEFAULT_TEMPERATURE).toBe(0.7)
      expect(TitleGenerationEntity.FALLBACK_TITLE).toBe('タスク')
    })

    it('should use constants consistently', () => {
      const entity = TitleGenerationEntity.fromContent('test')

      expect(entity.options.model).toBe(TitleGenerationEntity.DEFAULT_MODEL)
      expect(entity.options.maxTokens).toBe(TitleGenerationEntity.DEFAULT_MAX_TOKENS)
      expect(entity.options.temperature).toBe(TitleGenerationEntity.DEFAULT_TEMPERATURE)
      expect(entity.options.maxLength).toBe(TitleGenerationEntity.DEFAULT_MAX_TITLE_LENGTH)
    })
  })
})
