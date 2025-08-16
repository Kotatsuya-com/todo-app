/**
 * @jest-environment node
 */

/**
 * UIContainer Unit Tests
 */

import { ProductionUIContainer, MockUIContainer, getUIContainer } from '@/lib/containers/UIContainer'

describe('UIContainer', () => {
  afterEach(() => {
    ProductionUIContainer.resetInstance()
  })

  describe('ProductionUIContainer', () => {
    it('should create singleton instance', () => {
      const instance1 = ProductionUIContainer.getInstance()
      const instance2 = ProductionUIContainer.getInstance()

      expect(instance1).toBe(instance2)
      expect(instance1.services.uiService).toBeDefined()
    })

    it('should reset instance correctly', () => {
      const instance1 = ProductionUIContainer.getInstance()
      ProductionUIContainer.resetInstance()
      const instance2 = ProductionUIContainer.getInstance()

      expect(instance1).not.toBe(instance2)
    })

    it('should provide uiService', () => {
      const container = ProductionUIContainer.getInstance()

      expect(container.services).toHaveProperty('uiService')
      expect(container.services.uiService).toBeDefined()
    })
  })

  describe('getUIContainer', () => {
    it('should return production container instance', () => {
      const container = getUIContainer()

      expect(container).toBeInstanceOf(ProductionUIContainer)
      expect(container.services.uiService).toBeDefined()
    })
  })

  describe('MockUIContainer', () => {
    it('should create mock container with default services', () => {
      const mockContainer = new MockUIContainer()

      expect(mockContainer.services.uiService).toBeDefined()
      expect(jest.isMockFunction(mockContainer.services.uiService.checkSlackConnections)).toBe(true)
      expect(jest.isMockFunction(mockContainer.services.uiService.fetchSlackMessage)).toBe(true)
      expect(jest.isMockFunction(mockContainer.services.uiService.generateTitle)).toBe(true)
    })

    it('should accept custom mock services', () => {
      const customMockService = {
        checkSlackConnections: jest.fn().mockResolvedValue({ success: true, data: { connections: [] } }),
        fetchSlackMessage: jest.fn().mockResolvedValue({ success: true, data: { text: 'Custom', url: 'test' } }),
        generateTitle: jest.fn().mockResolvedValue({ success: true, data: { title: 'Custom Title' } })
      }

      const mockContainer = new MockUIContainer({
        uiService: customMockService
      })

      expect(mockContainer.services.uiService).toBe(customMockService)
    })

    it('should update service mocks', () => {
      const mockContainer = new MockUIContainer()
      const newMockMethod = jest.fn().mockResolvedValue({ success: true, data: { connections: [{ id: 'test' }] } })

      mockContainer.updateServiceMock('uiService', {
        checkSlackConnections: newMockMethod
      })

      expect(mockContainer.services.uiService.checkSlackConnections).toBe(newMockMethod)
    })

    it('should provide default mock responses', async () => {
      const mockContainer = new MockUIContainer()

      // Test default mock responses
      const connectionsResult = await mockContainer.services.uiService.checkSlackConnections()
      expect(connectionsResult.success).toBe(true)
      expect(connectionsResult.data).toEqual({ connections: [] })

      const messageResult = await mockContainer.services.uiService.fetchSlackMessage('test-url')
      expect(messageResult.success).toBe(true)
      expect(messageResult.data).toMatchObject({
        text: 'Mock Slack message content',
        url: 'https://workspace.slack.com/archives/C123/p123456789'
      })

      const titleResult = await mockContainer.services.uiService.generateTitle('test content')
      expect(titleResult.success).toBe(true)
      expect(titleResult.data).toEqual({ title: 'Generated Mock Title' })
    })
  })
})