import api from './api';

export const aiApi = {
  // Get usage status
  getUsage: () => api.get('/ai/usage'),

  // Get all templates
  getTemplates: () => api.get('/ai/templates'),

  // Get chat history
  getHistory: (limit = 50, offset = 0) => 
    api.get(`/ai/history?limit=${limit}&offset=${offset}`),

  // Delete single message
  deleteHistory: (id) => api.delete(`/ai/history/${id}`),

  // Clear all history
  clearHistory: () => api.delete('/ai/history'),

  // Send chat message
  chat: (message, templateId = null, conversationId = null) => 
    api.post('/ai/chat', { message, templateId, conversationId }),

  // Quick analyze
  analyze: (type, input = '') => 
    api.post(`/ai/analyze/${type}`, { input }),
};
