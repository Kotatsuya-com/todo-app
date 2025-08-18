# Flexible Mocking Guide

This guide documents the new flexible mocking system that balances type safety with JavaScript's testing flexibility.

## Problem Solved

The old approach required implementing every method of an interface in mock classes, losing JavaScript's dynamic nature. The new system provides:

- ✅ **Type Safety**: Full TypeScript support with autocomplete
- ✅ **Flexibility**: Only mock what you need
- ✅ **Simplicity**: Minimal boilerplate code
- ✅ **Maintainability**: Easy to read and modify

## Core Utilities

### 1. AutoMock (`createAutoMock<T>()`)

Creates a proxy-based mock that automatically generates `jest.fn()` for any accessed property.

```typescript
import { createAutoMock } from '@/__tests__/utils/autoMock'

const mockRepo = createAutoMock<SlackRepositoryInterface>()
mockRepo.findWebhookById.mockResolvedValue({ data: webhook, error: null })
// Other methods automatically become jest.fn() when accessed
```

### 2. Repository Mock Builder (`repositoryMock<T>()`)

Specialized builder for Repository pattern with Clean Architecture result types.

```typescript
import { repositoryMock } from '@/__tests__/utils/autoMock'

const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withData('findWebhookById', webhook)
  .withNotFound('findUserById')
  .withDatabaseError('updateWebhook')
  .build()
```

### 3. Service Mock Builder (`serviceMock<T>()`)

Specialized builder for Service layer with Service Result pattern.

```typescript
import { serviceMock } from '@/__tests__/utils/autoMock'

const mockService = serviceMock<SlackService>()
  .withServiceSuccess('processWebhookEvent', { processed: true })
  .withServiceError('disconnectWorkspace', 'Unauthorized', 403)
  .withNotFound('getWorkspaceInfo')
  .build()
```

### 4. Generic Mock Builder (`MockBuilder<T>`)

Most flexible builder with custom implementations and sequences.

```typescript
import { MockBuilder } from '@/__tests__/utils/mockBuilder'

const mockRepo = new MockBuilder<SlackRepositoryInterface>()
  .withSuccess('findWebhookById', { data: webhook, error: null })
  .withSequence('processEvent', result1, result2, result3)
  .withImplementation('customMethod', (param) => {
    return param.includes('test') ? successResult : errorResult
  })
  .build()
```

## Migration Patterns

### From Complex Mock Classes

**OLD APPROACH:**
```typescript
// 30+ lines of mock class setup
const mockRepo = createMockSlackRepository()
mockRepo.setWebhookSuccess('webhook-123', mockWebhook)
mockRepo.setUserNotFound('user-456')  
mockRepo.setConnectionError('connection-789', 'Database error')
mockRepo.setDefaultResult(MockRepositoryResultBuilder.error('Default error'))
```

**NEW APPROACH:**
```typescript
// 5 lines with builder pattern
const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withData('findWebhookById', mockWebhook)
  .withNotFound('findUserById')
  .withDatabaseError('findConnectionById')
  .build()
```

### From Direct Jest Mocks

**OLD APPROACH:**
```typescript
const mockRepo = {
  findWebhookById: jest.fn(),
  findUserById: jest.fn(),
  updateWebhook: jest.fn(),
  // Must implement ALL interface methods
  deleteWebhook: jest.fn(),
  listWebhooks: jest.fn(),
  // ... 10+ more methods
} as jest.Mocked<SlackRepositoryInterface>

// Complex setup
mockRepo.findWebhookById.mockResolvedValue({ data: webhook, error: null })
mockRepo.findUserById.mockResolvedValue({ data: null, error: new Error('Not found') })
```

**NEW APPROACH:**
```typescript
const mockRepo = createAutoMock<SlackRepositoryInterface>()
mockRepo.findWebhookById.mockResolvedValue(mockResult.success(webhook))
mockRepo.findUserById.mockResolvedValue(mockResult.error('Not found'))
// Other methods auto-generated as needed
```

## Advanced Patterns

### Sequential Responses

```typescript
const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withMultipleData('findWebhookById', webhook1, webhook2, webhook3)
  .build()

// First call returns webhook1, second returns webhook2, etc.
```

### Conditional Logic

```typescript
const mockRepo = new MockBuilder<SlackRepositoryInterface>()
  .withImplementation('findWebhookById', (id) => {
    if (id === 'webhook-active') return mockResult.success(activeWebhook)
    if (id === 'webhook-inactive') return mockResult.success(inactiveWebhook)
    return mockResult.error('Not found')
  })
  .build()
```

### Error Scenarios

```typescript
const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withNotFound('findWebhookById')          // 404-style error
  .withDatabaseError('updateWebhook')       // 500-style error
  .withRepositoryError('deleteWebhook', 'Permission denied')  // Custom error
  .build()
```

### Service Layer Testing

```typescript
const mockService = serviceMock<SlackService>()
  .withServiceSuccess('processWebhookEvent', { eventId: '123', processed: true }, 200)
  .withUnauthorized('disconnectWorkspace')  // 401 error
  .withForbidden('deleteWorkspace')         // 403 error
  .withValidationError('createWebhook', ['Invalid URL', 'Missing secret'])  // 400 error
  .build()
```

## Result Helpers

### Repository Results

```typescript
import { mockResult } from '@/__tests__/utils/autoMock'

// Success with data
mockResult.success(webhook)  // { data: webhook, error: null }

// Error result
mockResult.error('Database connection failed')  // { data: null, error: Error(...) }
```

### Service Results

```typescript
import { serviceResult } from '@/__tests__/utils/autoMock'

// Success response
serviceResult.success({ processed: true }, 200)  
// { success: true, data: { processed: true }, statusCode: 200 }

// Error response  
serviceResult.error('Validation failed', 400)
// { success: false, error: 'Validation failed', statusCode: 400 }
```

## Testing Scenarios

### Unit Testing (Service Layer)

```typescript
describe('SlackService', () => {
  it('should process webhook events successfully', async () => {
    const mockSlackRepo = repositoryMock<SlackRepositoryInterface>()
      .withData('findWebhookById', mockWebhook)
      .withData('findUserById', mockUser)
      .build()
    
    const mockTodoRepo = repositoryMock<TodoRepositoryInterface>()
      .withData('create', mockTodo)
      .build()
    
    const service = new SlackService(mockSlackRepo, mockTodoRepo)
    const result = await service.processWebhookEvent('webhook-123', mockPayload)
    
    expect(result.success).toBe(true)
    expect(result.data.processed).toBe(true)
  })
})
```

### Integration Testing (API Layer)

```typescript
// Mock the entire service layer
jest.mock('@/lib/services/SlackService', () => ({
  SlackService: jest.fn()
}))

describe('POST /api/slack/events/user/[webhook_id]', () => {
  it('should handle webhook events', async () => {
    const mockSlackService = serviceMock<SlackService>()
      .withServiceSuccess('processWebhookEvent', { processed: true })
      .build()
    
    ;(SlackService as jest.Mock).mockImplementation(() => mockSlackService)
    
    const response = await POST(request, { params: { webhook_id: 'webhook-123' } })
    expect(response.status).toBe(200)
  })
})
```

### Error Testing

```typescript
describe('Error Handling', () => {
  it('should handle repository failures gracefully', async () => {
    const mockRepo = repositoryMock<SlackRepositoryInterface>()
      .withDatabaseError('findWebhookById')
      .build()
    
    const service = new SlackService(mockRepo)
    const result = await service.processWebhookEvent('webhook-123', payload)
    
    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(500)
  })
})
```

## Best Practices

### 1. Choose the Right Tool

- **`createAutoMock()`**: Simple mocks with direct method setup
- **`repositoryMock()`**: Repository layer with result patterns
- **`serviceMock()`**: Service layer with status codes
- **`MockBuilder`**: Complex scenarios with sequences and custom logic

### 2. Use Descriptive Test Names

```typescript
// Good: Describes what is being tested
it('should create todo when webhook event has valid emoji reaction', async () => {})

// Better: Includes the expected behavior
it('should create urgent todo when webhook receives fire emoji reaction', async () => {})
```

### 3. Group Related Scenarios

```typescript
describe('Webhook Event Processing', () => {
  describe('Valid Events', () => {
    // Success cases
  })
  
  describe('Invalid Events', () => {
    // Error cases
  })
  
  describe('Edge Cases', () => {
    // Boundary conditions
  })
})
```

### 4. Keep Mocks Focused

```typescript
// Good: Only mock what you need
const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withData('findWebhookById', webhook)
  .build()

// Avoid: Over-mocking unused methods
```

### 5. Use Fixtures for Complex Data

```typescript
import { mockWebhookFixture, mockUserFixture } from '@/__tests__/fixtures'

const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withData('findWebhookById', mockWebhookFixture())
  .withData('findUserById', mockUserFixture())
  .build()
```

## Common Patterns

### Testing State Changes

```typescript
const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withSequence('findWebhookById', 
    mockResult.success(inactiveWebhook),  // Initial state
    mockResult.success(activeWebhook)     // After activation
  )
  .build()
```

### Testing Different User Scenarios

```typescript
const mockRepo = new MockBuilder<SlackRepositoryInterface>()
  .withImplementation('findUserById', (userId) => {
    const userTypes = {
      'admin-user': mockResult.success(adminUser),
      'regular-user': mockResult.success(regularUser),
      'suspended-user': mockResult.error('User suspended')
    }
    return userTypes[userId] || mockResult.error('User not found')
  })
  .build()
```

### Testing Async Operations

```typescript
const mockRepo = repositoryMock<SlackRepositoryInterface>()
  .withData('processWebhookEvent', { queued: true, processId: '123' })
  .withOnce('getProcessStatus', { processId: '123', status: 'completed' })
  .build()
```

## Troubleshooting

### TypeScript Errors

**Problem**: `Property 'methodName' does not exist on type...`
**Solution**: Ensure you're using the correct interface type parameter

```typescript
// Wrong
const mock = createAutoMock<any>()

// Right  
const mock = createAutoMock<SlackRepositoryInterface>()
```

### Mock Not Called

**Problem**: Mock method never gets called in tests
**Solution**: Check that you're calling the right method name

```typescript
// Check the setup history
const builder = new MockBuilder<SlackRepositoryInterface>()
console.log(builder.getSetupHistory())  // Shows what was configured
```

### Sequence Exhausted

**Problem**: `withSequence` runs out of values
**Solution**: Add a default fallback or use `withImplementation`

```typescript
const mock = repositoryMock<SlackRepositoryInterface>()
  .withSequence('findWebhookById', result1, result2)
  .withData('findWebhookById', defaultResult)  // Fallback after sequence
  .build()
```

## Migration Checklist

- [ ] Replace mock class imports with `autoMock` utilities
- [ ] Convert setup methods to builder pattern
- [ ] Use `mockResult` and `serviceResult` helpers
- [ ] Simplify error handling with built-in error methods
- [ ] Remove unused mock implementations
- [ ] Update test assertions to use new result patterns
- [ ] Verify TypeScript compilation
- [ ] Run tests to ensure behavior is preserved

## Example Files

See `__tests__/examples/NotificationSettingsService.migration.test.ts` for a complete migration example showing both old and new approaches side by side.