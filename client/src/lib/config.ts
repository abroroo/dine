// Configuration for API and WebSocket endpoints
export const config = {
  // Use environment variable if available, otherwise detect based on hostname
  apiBaseUrl: import.meta.env.VITE_API_URL || (() => {
    // In development (localhost), use the dev server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // In production, use the Render backend URL
    return 'https://table-order.onrender.com';
  })(),

  // WebSocket URL - replace http(s) with ws(s)
  get websocketUrl() {
    return this.apiBaseUrl.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws');
  }
};