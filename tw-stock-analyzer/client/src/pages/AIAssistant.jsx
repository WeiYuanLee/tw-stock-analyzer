import React, { useState, useEffect, useRef } from 'react';
import { aiApi } from '../services/aiApi';
import { useAuthStore } from '../store';

const AIAssistant = () => {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Load templates and usage on mount
  useEffect(() => {
    loadTemplates();
    loadUsage();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTemplates = async () => {
    try {
      const { data } = await aiApi.getTemplates();
      setTemplates(data.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadUsage = async () => {
    try {
      const { data } = await aiApi.getUsage();
      setUsage(data);
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setMessages([]);
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const { data } = await aiApi.chat(
        userMessage, 
        selectedTemplate?.id || null
      );
      
      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      // Update usage
      loadUsage();
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || '發生錯誤，請稍後再試';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAnalyze = async (template) => {
    if (loading || !template.accessible) return;
    
    setSelectedTemplate(template);
    setLoading(true);
    setError(null);
    setMessages([]);

    try {
      const { data } = await aiApi.analyze(template.id, '台灣股市整體分析');
      
      setMessages([
        { role: 'user', content: '台灣股市整體分析' },
        { role: 'assistant', content: data.analysis }
      ]);
      
      loadUsage();
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || '發生錯誤，請稍後再試';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getLevelBadge = (level) => {
    const badges = {
      pro: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Pro</span>,
      vip: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">VIP</span>,
    };
    return badges[level] || null;
  };

  const isProOrAbove = user?.membership_level === 'pro' || user?.membership_level === 'vip';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            🤖 AI 投資助手
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            使用 AI 驅動的分析功能，提升您的投資決策
          </p>
        </div>

        {/* Usage Status */}
        {usage && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-gray-400">剩餘次數：</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {usage.remaining === 'unlimited' ? '無限制' : usage.remaining}
                </span>
                {usage.limit !== 'unlimited' && (
                  <span className="text-gray-500 dark:text-gray-500">/ {usage.limit} 次</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">會員等級：</span>
                {getLevelBadge(usage.level)}
              </div>
            </div>
            {!isProOrAbove && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  ⚠️ 升級至 Pro 或 VIP 以使用 AI 分析功能
                </p>
              </div>
            )}
          </div>
        )}

        {/* Template Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            選擇分析類型
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => template.accessible ? handleTemplateSelect(template) : null}
                disabled={!template.accessible}
                className={`p-4 rounded-lg text-left transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : template.accessible
                      ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'bg-gray-100 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </span>
                  {!template.accessible && getLevelBadge(template.requiredLevel)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Analyze Buttons */}
        {isProOrAbove && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              快速分析
            </h2>
            <div className="flex flex-wrap gap-2">
              {templates.filter(t => t.accessible).slice(0, 6).map(template => (
                <button
                  key={template.id}
                  onClick={() => handleQuickAnalyze(template)}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        {selectedTemplate && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Selected Template Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedTemplate.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>選擇一個問題或輸入您的投資相關問題</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedTemplate ? `輸入您的問題...` : '請先選擇分析類型'}
                  disabled={!selectedTemplate || loading}
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!selectedTemplate || !input.trim() || loading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
                >
                  發送
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
