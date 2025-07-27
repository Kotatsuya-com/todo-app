interface SlackMessage {
  text: string
  user?: string
  ts: string
  channel?: string
}

export interface SlackMessageResult {
  text: string
  user?: string
  timestamp: string
  channel?: string
}

/**
 * SlackURLからチャンネルIDとタイムスタンプを抽出
 */
export function parseSlackUrl(slackUrl: string): { channel: string; timestamp: string; threadTs?: string } | null {
  const slackUrlPattern = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p([0-9]+)(?:\?thread_ts=([0-9.]+))?/
  const match = slackUrl.match(slackUrlPattern)

  if (!match) {
    return null
  }

  const [, channel, timestamp, threadTs] = match
  return {
    channel,
    timestamp,
    threadTs
  }
}

/**
 * タイムスタンプをSlack API用の形式に変換
 */
export function convertTimestamp(timestamp: string): string {
  return timestamp.substring(0, 10) + '.' + timestamp.substring(10)
}

/**
 * Slack APIを使用してメッセージを取得（チャンネル履歴から）
 */
async function tryGetChannelMessage(slackToken: string, channel: string, ts: string): Promise<SlackMessage | null> {
  try {
    const queryParams = new URLSearchParams({
      channel,
      latest: ts,
      oldest: ts,
      inclusive: 'true',
      limit: '1'
    })

    const response = await fetch(`https://slack.com/api/conversations.history?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error in conversations.history:', data.error)
      return null
    }

    return data.messages?.[0] || null
  } catch (error) {
    console.error('Error in tryGetChannelMessage:', error)
    return null
  }
}

/**
 * Slack APIを使用してスレッド内のメッセージを検索
 */
async function tryGetThreadMessage(slackToken: string, channel: string, ts: string): Promise<SlackMessage | null> {
  try {
    // まず、チャンネル内の全てのメッセージを取得して、スレッドがあるメッセージを探す
    const channelResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=100`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    })

    const channelData = await channelResponse.json()

    if (!channelData.ok) {
      console.error('Slack API error in channel scan:', channelData.error)
      return null
    }

    // スレッドを持つメッセージを探す
    const threadsParents = channelData.messages?.filter((msg: any) => msg.reply_count > 0) || []

    console.log(`Found ${threadsParents.length} messages with threads`)

    // 各スレッドを検索
    for (const parent of threadsParents) {
      const queryParams = new URLSearchParams({
        channel,
        ts: parent.ts,
        limit: '200',
        inclusive: 'true'
      })

      const threadResponse = await fetch(`https://slack.com/api/conversations.replies?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json'
        }
      })

      const threadData = await threadResponse.json()

      if (threadData.ok && threadData.messages) {
        const targetMessage = threadData.messages.find((msg: SlackMessage) => msg.ts === ts)
        if (targetMessage) {
          console.log(`Found target message in thread ${parent.ts}`)
          return targetMessage
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error in tryGetThreadMessage:', error)
    return null
  }
}

/**
 * スレッドメッセージかどうかを判断してメッセージを取得（conversations.replies使用）
 */
async function tryGetThreadReplies(slackToken: string, channel: string, threadTs: string, targetTs: string): Promise<SlackMessage | null> {
  try {
    const queryParams = new URLSearchParams({
      channel: channel,
      ts: threadTs,
      limit: '200',
      inclusive: 'true'
    })

    const response = await fetch(`https://slack.com/api/conversations.replies?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    })

    const slackData = await response.json()

    if (!slackData.ok) {
      console.error('Slack API error in conversations.replies:', slackData.error)
      return null
    }

    if (!slackData.messages || slackData.messages.length === 0) {
      return null
    }

    // 特定のタイムスタンプに一致するメッセージを見つける
    const targetMessage = slackData.messages.find((msg: SlackMessage) => msg.ts === targetTs)
    return targetMessage || null

  } catch (error) {
    console.error('Error in tryGetThreadReplies:', error)
    return null
  }
}

/**
 * Slack APIを使用してメッセージを取得（ユーザー認証版）
 * チャンネル履歴、スレッド検索の順で試行
 */
export async function getSlackMessage(channel: string, ts: string, slackToken: string): Promise<SlackMessage | null> {
  try {
    if (!slackToken) {
      throw new Error('Slack token is required')
    }

    console.log('Attempting to fetch message:', { channel, ts })

    // 最初にチャンネルのメッセージ履歴から検索
    let message = await tryGetChannelMessage(slackToken, channel, ts)

    if (message) {
      console.log('Found message in channel history:', {
        channel,
        ts,
        text: message.text?.substring(0, 100) + '...',
        hasText: !!message.text
      })
      return message
    }

    console.log('Message not found in channel history, checking for thread messages...')

    // チャンネル履歴で見つからない場合、スレッド内メッセージを検索
    message = await tryGetThreadMessage(slackToken, channel, ts)

    if (message) {
      console.log('Found message in thread:', {
        channel,
        ts,
        text: message.text?.substring(0, 100) + '...',
        hasText: !!message.text
      })
      return message
    }

    console.warn('No message found in channel or threads for:', { channel, ts })
    return null

  } catch (error) {
    console.error('Error fetching Slack message:', error)
    throw error
  }
}

/**
 * ユーザーIDからユーザー名を取得
 */
async function getUserName(slackToken: string, userId: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.ok && data.user) {
      // 表示名を優先し、なければ実名、最後にユーザー名
      return data.user.profile?.display_name || data.user.profile?.real_name || data.user.name || userId
    }
    return userId
  } catch (error) {
    console.error(`Error fetching user info for ${userId}:`, error)
    return userId
  }
}

/**
 * グループIDからグループ名を取得
 */
async function getGroupName(slackToken: string, groupId: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/usergroups.info?usergroup=${groupId}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.ok && data.usergroup) {
      return data.usergroup.name || groupId
    }
    return groupId
  } catch (error) {
    console.error(`Error fetching group info for ${groupId}:`, error)
    return groupId
  }
}

/**
 * Slackメッセージ内のメンションを実際の名前に変換
 */
async function convertMentions(slackToken: string, text: string): Promise<string> {
  if (!text) {
    return text
  }

  let convertedText = text

  // ユーザーメンション <@USERID> を変換
  const userMentions = text.match(/<@[A-Z0-9]+>/g)
  if (userMentions) {
    for (const mention of userMentions) {
      const userId = mention.slice(2, -1) // <@ と > を除去
      const userName = await getUserName(slackToken, userId)
      convertedText = convertedText.replace(mention, `@${userName}`)
    }
  }

  // グループメンション <!subteam^GROUPID> を変換
  const groupMentions = text.match(/<!subteam\^[A-Z0-9]+>/g)
  if (groupMentions) {
    for (const mention of groupMentions) {
      const groupId = mention.slice(10, -1) // <!subteam^ と > を除去
      const groupName = await getGroupName(slackToken, groupId)
      convertedText = convertedText.replace(mention, `@${groupName}`)
    }
  }

  // チャンネルメンション <#CHANNELID> を変換
  const channelMentions = text.match(/<#[A-Z0-9]+>/g)
  if (channelMentions) {
    for (const mention of channelMentions) {
      const channelId = mention.slice(2, -1) // <# と > を除去
      try {
        const response = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        if (data.ok && data.channel) {
          convertedText = convertedText.replace(mention, `#${data.channel.name}`)
        }
      } catch (error) {
        console.error(`Error fetching channel info for ${channelId}:`, error)
      }
    }
  }

  return convertedText
}

/**
 * チャンネルIDからチャンネル名を取得
 */
async function getChannelName(slackToken: string, channelId: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.ok && data.channel) {
      return data.channel.name || channelId
    }
    return channelId
  } catch (error) {
    console.error(`Error fetching channel info for ${channelId}:`, error)
    return channelId
  }
}

/**
 * SlackURLから直接メッセージを取得（フロントエンド向け）
 */
export async function getSlackMessageFromUrl(slackUrl: string, slackToken: string): Promise<SlackMessageResult | null> {
  try {
    if (!slackToken) {
      throw new Error('Slack user token is required')
    }

    // SlackURLをパース
    const parsed = parseSlackUrl(slackUrl)
    if (!parsed) {
      throw new Error('Invalid Slack URL format')
    }

    const { channel, timestamp, threadTs } = parsed
    const ts = convertTimestamp(timestamp)

    let message: SlackMessage | null = null

    // スレッドメッセージかどうかを判断
    if (threadTs) {
      // スレッド内のメッセージを取得
      message = await tryGetThreadReplies(slackToken, channel, threadTs, ts)
    } else {
      // チャンネル内のメッセージを取得
      message = await tryGetChannelMessage(slackToken, channel, ts)
    }

    // 上記で見つからない場合は、共通の検索ロジックを使用
    if (!message) {
      message = await getSlackMessage(channel, ts, slackToken)
    }

    if (!message) {
      return null
    }

    // メンションを実際の名前に変換
    let convertedText = await convertMentions(slackToken, message.text || '')

    // Slackの改行コード(\n)をそのまま保持
    convertedText = convertedText.replace(/\\n/g, '\n')

    // チャンネル名と投稿者名を取得
    const channelName = await getChannelName(slackToken, channel)
    const userName = message.user ? await getUserName(slackToken, message.user) : 'Unknown User'

    // メッセージの先頭にチャンネル名と投稿者名を追加
    const messageWithHeader = `${userName} (#${channelName})\n${convertedText}`

    return {
      text: messageWithHeader,
      user: message.user,
      timestamp: message.ts,
      channel: channel
    }

  } catch (error) {
    console.error('Error fetching Slack message from URL:', error)
    throw error
  }
}
