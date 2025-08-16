/**
 * @jest-environment node
 */

// OpenAI APIをモックせず、入力検証のみテスト
import { generateTaskTitle } from '@/lib/openai-title'

describe('openai-title input validation', () => {
  it('should validate input parameters correctly', async () => {
    // 空文字列のテスト
    await expect(generateTaskTitle('')).rejects.toThrow('Content is required and must be a string')

    // nullのテスト
    await expect(generateTaskTitle(null as any)).rejects.toThrow('Content is required and must be a string')

    // undefinedのテスト
    await expect(generateTaskTitle(undefined as any)).rejects.toThrow('Content is required and must be a string')

    // 数値のテスト
    await expect(generateTaskTitle(123 as any)).rejects.toThrow('Content is required and must be a string')
  })
})
