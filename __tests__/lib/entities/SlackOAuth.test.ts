/**
 * @jest-environment jsdom
 */

import { SlackOAuthEntity } from '@/lib/entities/SlackOAuth'
import {
  createMockSlackOAuthTokenData,
  createMockSlackOAuthError,
  createMockSlackOAuthIncomplete,
  createMockSlackOAuthUserOnly,
  createMockSlackOAuthBotOnly,
  createMockSlackOAuthEnterprise,
  createMockSlackOAuthInvalidUserId,
  createMockSlackOAuthMinimalScope,
  VALID_SLACK_USER_IDS,
  INVALID_SLACK_USER_IDS,
  SCOPE_COMBINATIONS,
  EXPECTED_CONNECTION_DATA
} from '@/__tests__/fixtures/slack-oauth.fixture'

describe('SlackOAuthEntity', () => {
  describe('constructor and getters', () => {
    it('should create SlackOAuthEntity with correct properties', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.tokenData).toEqual(mockTokenData)
      expect(entity.teamId).toBe('T1234567890')
      expect(entity.teamName).toBe('Test Workspace')
      expect(entity.workspaceId).toBe('T1234567890')
      expect(entity.workspaceName).toBe('Test Workspace')
      expect(entity.accessToken).toBe('xoxp-test-user-token')
      expect(entity.scope).toBe('channels:read,chat:write,users:read')
      expect(entity.botUserId).toBe('U9876543210')
    })

    it('should prefer user token over bot token for accessToken', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.accessToken).toBe('xoxp-test-user-token')
    })

    it('should fall back to bot token when user token unavailable', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.accessToken).toBe('xoxb-bot-only-token')
    })

    it('should prefer user scope over bot scope', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.scope).toBe('channels:read,chat:write,users:read')
    })

    it('should fall back to bot scope when user scope unavailable', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.scope).toBe('channels:read,chat:write,reactions:read')
    })
  })

  describe('isValidTokenResponse', () => {
    it('should return true for valid token response', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(true)
    })

    it('should return false when ok is false', () => {
      const mockTokenData = createMockSlackOAuthError()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(false)
    })

    it('should return false when team info is missing', () => {
      const mockTokenData = createMockSlackOAuthIncomplete()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(false)
    })

    it('should return false when both tokens are missing', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: undefined,
        access_token: ''
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(false)
    })

    it('should return false when both scopes are missing', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          ...createMockSlackOAuthTokenData().authed_user!,
          scope: ''
        },
        scope: ''
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(false)
    })

    it('should return true with only user token', () => {
      const mockTokenData = createMockSlackOAuthUserOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(true)
    })

    it('should return true with only bot token', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isValidTokenResponse()).toBe(true)
    })
  })

  describe('extractSlackUserId', () => {
    it('should extract Slack user ID from authed_user', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.extractSlackUserId()).toBe('U1234567890')
    })

    it('should return null when authed_user is missing', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.extractSlackUserId()).toBeNull()
    })

    it('should return null when authed_user.id is missing', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          ...createMockSlackOAuthTokenData().authed_user!,
          id: undefined as any
        }
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.extractSlackUserId()).toBeNull()
    })
  })

  describe('isValidSlackUserId', () => {
    it('should validate correct Slack User ID formats', () => {
      const entity = new SlackOAuthEntity(createMockSlackOAuthTokenData())

      VALID_SLACK_USER_IDS.forEach(userId => {
        expect(entity.isValidSlackUserId(userId)).toBe(true)
      })
    })

    it('should reject invalid Slack User ID formats', () => {
      const entity = new SlackOAuthEntity(createMockSlackOAuthTokenData())

      INVALID_SLACK_USER_IDS.forEach(userId => {
        expect(entity.isValidSlackUserId(userId)).toBe(false)
      })
    })
  })

  describe('hasBasicSlackScopes', () => {
    it('should return true when basic scopes are present', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.hasBasicSlackScopes()).toBe(true)
    })

    it('should return false when basic scopes are missing', () => {
      const mockTokenData = createMockSlackOAuthMinimalScope()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.hasBasicSlackScopes()).toBe(false)
    })

    it('should handle scopes with extra whitespace', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          ...createMockSlackOAuthTokenData().authed_user!,
          scope: ' channels:read , chat:write , users:read '
        }
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.hasBasicSlackScopes()).toBe(true)
    })
  })

  describe('hasError and getError', () => {
    it('should detect error in failed OAuth response', () => {
      const mockTokenData = createMockSlackOAuthError()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.hasError()).toBe(true)
      expect(entity.getError()).toBe('access_denied')
    })

    it('should not detect error in successful OAuth response', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.hasError()).toBe(false)
      expect(entity.getError()).toBeNull()
    })

    it('should detect error when ok is false even without error field', () => {
      const mockTokenData = createMockSlackOAuthTokenData({ ok: false })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.hasError()).toBe(true)
    })
  })

  describe('toConnectionData', () => {
    it('should convert valid token data to connection data', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      const connectionData = entity.toConnectionData('test-user-123')

      expect(connectionData).toEqual(EXPECTED_CONNECTION_DATA)
    })

    it('should throw error for invalid token data', () => {
      const mockTokenData = createMockSlackOAuthError()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(() => {
        entity.toConnectionData('test-user-123')
      }).toThrow('Invalid token data cannot be converted to connection')
    })

    it('should handle bot-only token data', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      const connectionData = entity.toConnectionData('test-user-123')

      expect(connectionData.user_id).toBe('test-user-123')
      expect(connectionData.workspace_id).toBe('T1234567890')
      expect(connectionData.access_token).toBe('xoxb-bot-only-token')
      expect(connectionData.scope).toBe('channels:read,chat:write,reactions:read')
    })
  })

  describe('isEnterpriseInstall', () => {
    it('should return true for enterprise install', () => {
      const mockTokenData = createMockSlackOAuthEnterprise()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isEnterpriseInstall()).toBe(true)
    })

    it('should return false for regular install', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isEnterpriseInstall()).toBe(false)
    })

    it('should return false when is_enterprise_install is undefined', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        is_enterprise_install: undefined
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.isEnterpriseInstall()).toBe(false)
    })
  })

  describe('getTokenType', () => {
    it('should return "both" when both tokens are present', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.getTokenType()).toBe('both')
    })

    it('should return "user" when only user token is present', () => {
      const mockTokenData = createMockSlackOAuthUserOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.getTokenType()).toBe('user')
    })

    it('should return "bot" when only bot token is present', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.getTokenType()).toBe('bot')
    })

    it('should return "user" as fallback when no tokens', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: undefined,
        access_token: ''
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.getTokenType()).toBe('user')
    })

    it('should handle when user and bot tokens are the same', () => {
      const sameToken = 'xoxb-shared-token'
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          ...createMockSlackOAuthTokenData().authed_user!,
          access_token: sameToken
        },
        access_token: sameToken
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.getTokenType()).toBe('user')
    })
  })

  describe('getMaskedTokenData', () => {
    it('should mask sensitive token information', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      const maskedData = entity.getMaskedTokenData()

      expect(maskedData.ok).toBe(true)
      expect(maskedData.team).toEqual(mockTokenData.team)
      expect(maskedData.authed_user?.access_token).toBe('[MASKED]')
      expect(maskedData.access_token).toBe('[MASKED]')
      expect(maskedData.authed_user?.id).toBe('U1234567890')
      expect(maskedData.authed_user?.scope).toBe('channels:read,chat:write,users:read')
    })

    it('should handle missing authed_user', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      const maskedData = entity.getMaskedTokenData()

      expect(maskedData.authed_user).toBeNull()
      expect(maskedData.access_token).toBe('[MASKED]')
    })

    it('should handle missing tokens', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          ...createMockSlackOAuthTokenData().authed_user!,
          access_token: undefined as any
        },
        access_token: ''
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      const maskedData = entity.getMaskedTokenData()

      expect(maskedData.authed_user?.access_token).toBeUndefined()
      expect(maskedData.access_token).toBeUndefined()
    })
  })

  describe('validateIntegrity', () => {
    it('should pass validation for complete valid data', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = new SlackOAuthEntity(mockTokenData)

      const validation = entity.validateIntegrity()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('should fail validation for OAuth error response', () => {
      const mockTokenData = createMockSlackOAuthError()
      const entity = new SlackOAuthEntity(mockTokenData)

      const validation = entity.validateIntegrity()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('OAuth response indicates failure')
      expect(validation.errors).toContain('OAuth error: access_denied')
    })

    it('should fail validation for missing team information', () => {
      const mockTokenData = createMockSlackOAuthIncomplete()
      const entity = new SlackOAuthEntity(mockTokenData)

      const validation = entity.validateIntegrity()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Missing team ID')
      expect(validation.errors).toContain('Missing team name')
    })

    it('should fail validation for invalid Slack User ID', () => {
      const mockTokenData = createMockSlackOAuthInvalidUserId()
      const entity = new SlackOAuthEntity(mockTokenData)

      const validation = entity.validateIntegrity()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Invalid Slack User ID format')
    })

    it('should pass validation when Slack User ID is missing (bot-only)', () => {
      const mockTokenData = createMockSlackOAuthBotOnly()
      const entity = new SlackOAuthEntity(mockTokenData)

      const validation = entity.validateIntegrity()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('should collect multiple validation errors', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        ok: false,
        error: 'invalid_request',
        team: { id: '', name: '' },
        authed_user: undefined,
        access_token: '',
        scope: ''
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      const validation = entity.validateIntegrity()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(1)
      expect(validation.errors).toContain('OAuth response indicates failure')
      expect(validation.errors).toContain('OAuth error: invalid_request')
      expect(validation.errors).toContain('Missing team ID')
      expect(validation.errors).toContain('Missing access token')
    })
  })

  describe('static fromTokenResponse', () => {
    it('should create entity from token response data', () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const entity = SlackOAuthEntity.fromTokenResponse(mockTokenData)

      expect(entity).toBeInstanceOf(SlackOAuthEntity)
      expect(entity.tokenData).toEqual(mockTokenData)
    })

    it('should handle any object as token response', () => {
      const mockData = { ok: true, custom: 'field' }
      const entity = SlackOAuthEntity.fromTokenResponse(mockData)

      expect(entity).toBeInstanceOf(SlackOAuthEntity)
      expect(entity.tokenData).toEqual(mockData)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle null/undefined values gracefully', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          id: 'U1234567890',
          scope: 'channels:read',
          access_token: 'token',
          token_type: undefined
        },
        bot_user_id: undefined,
        enterprise: null
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(() => entity.isValidTokenResponse()).not.toThrow()
      expect(entity.botUserId).toBeUndefined()
    })

    it('should handle extremely long strings', () => {
      const longString = 'a'.repeat(10000)
      const mockTokenData = createMockSlackOAuthTokenData({
        team: {
          id: 'T1234567890',
          name: longString
        }
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.teamName).toBe(longString)
      expect(entity.workspaceName).toBe(longString)
    })

    it('should handle special characters in team names', () => {
      const specialName = '🚀 Team "Special" & Co. #1'
      const mockTokenData = createMockSlackOAuthTokenData({
        team: {
          id: 'T1234567890',
          name: specialName
        }
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.teamName).toBe(specialName)
      expect(entity.workspaceName).toBe(specialName)
    })

    it('should handle empty scope string', () => {
      const mockTokenData = createMockSlackOAuthTokenData({
        authed_user: {
          ...createMockSlackOAuthTokenData().authed_user!,
          scope: ''
        },
        scope: ''
      })
      const entity = new SlackOAuthEntity(mockTokenData)

      expect(entity.scope).toBe('')
      expect(entity.hasBasicSlackScopes()).toBe(false)
    })
  })
})