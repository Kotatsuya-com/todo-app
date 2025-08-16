/**
 * Mock for isows module
 * This module is used by Supabase WebSocket connections
 */

// Mock WebSocket implementation for Jest
class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {this.onopen()}
    }, 0)
  }

  send(data) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {this.onclose()}
  }

  addEventListener(event, handler) {
    this[`on${event}`] = handler
  }

  removeEventListener(event, handler) {
    this[`on${event}`] = null
  }
}

MockWebSocket.CONNECTING = 0
MockWebSocket.OPEN = 1
MockWebSocket.CLOSING = 2
MockWebSocket.CLOSED = 3

// Export mock functions that isows provides
module.exports = {
  getNativeWebSocket: () => MockWebSocket,
  WebSocket: MockWebSocket,
  default: MockWebSocket
}
