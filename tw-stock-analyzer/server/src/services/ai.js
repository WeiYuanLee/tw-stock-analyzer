import OpenAI from 'openai';
import crypto from 'crypto';

// AI Templates
export const AI_TEMPLATES = {
  marketAnalysis: {
    id: 'marketAnalysis',
    name: '市場分析 AI',
    description: '與 AI 對談分析市場趨勢、重點行業/股票、新興模式、投資機會',
    requiredLevel: 'pro',
    template: "分析股票市場的當前趨勢，重點關注[INPUT]。識別新興模式，提出潛在投資機會。考慮最新財報和行業新聞。請用繁體中文回答。"
  },
  portfolioDiversification: {
    id: 'portfolioDiversification',
    name: '資產組合多元化',
    description: '輸入當前持股，提出多元化策略、最小化風險',
    requiredLevel: 'pro',
    template: "在[INPUT]的投資組合中，提出進一步多元化策略，同時將風險最小化。探索潛在行業和特定股票。請用繁體中文回答。"
  },
  riskManagement: {
    id: 'riskManagement',
    name: '風險管理',
    description: '交易員風險管理技巧、止損單、多元化、頭寸規模',
    requiredLevel: 'pro',
    template: "討論股票交易員的有效風險管理技巧。提供如何實施止損單、多元化、頭寸規模的詳細示例。使用[INPUT]作為參考。請用繁體中文回答。"
  },
  technicalAnalysis: {
    id: 'technicalAnalysis',
    name: '技術分析',
    description: '技術指標分析（均線、RSI）、買賣建議',
    requiredLevel: 'pro',
    template: "使用技術分析評估[INPUT]的股票。分析價格走勢、成交量和關鍵指標（均線、RSI）。提供買入、賣出、持有建議。請用繁體中文回答。"
  },
  economicIndicators: {
    id: 'economicIndicators',
    name: '經濟指標',
    description: 'GDP、失業率、通膨如何影響股市',
    requiredLevel: 'pro',
    template: "解釋經濟指標（GDP、失業率、通膨）如何影響股市。提供如何利用這些指標做出交易決策的例子，關於[INPUT]。請用繁體中文回答。"
  },
  valueInvesting: {
    id: 'valueInvesting',
    name: '價值投資',
    description: '價值投資原則、識別被低估股票',
    requiredLevel: 'pro',
    template: "描述價值投資原則，如何識別被低估股票。使用現實例子，包括[INPUT]，說明投資者如何應用這種策略。請用繁體中文回答。"
  },
  marketSentiment: {
    id: 'marketSentiment',
    name: '市場情緒',
    description: '分析情緒如何影響股價、情緒衡量工具',
    requiredLevel: 'vip',
    template: "分析市場情緒如何影響股價。討論投資者用來衡量情緒並納入交易策略的技術。重點關注[INPUT]。請用繁體中文回答。"
  },
  financialStatements: {
    id: 'financialStatements',
    name: '財報解讀',
    description: '解讀公司財報、重點指標',
    requiredLevel: 'vip',
    template: "解釋如何解讀公司財報。重點介紹投資者應關注的關鍵指標。使用[INPUT]作為具體範例。請用繁體中文回答。"
  },
  growthVsDividend: {
    id: 'growthVsDividend',
    name: '成長股/股息股票',
    description: '比較兩種投資類型、建議',
    requiredLevel: 'vip',
    template: "比較成長股和股息股票。討論每種投資的益處和風險，建議何種情況下哪種更適合。參考[INPUT]。請用繁體中文回答。"
  },
  globalEvents: {
    id: 'globalEvents',
    name: '全球事件分析',
    description: '地緣政治、疫情等對股市的影響',
    requiredLevel: 'vip',
    template: "分析重大全球事件（地緣政治、疫情）對股市的影響。提供在此類事件中保護投資組合的策略。考慮[INPUT]。請用繁體中文回答。"
  }
};

// Template access by level
export const TEMPLATES_BY_LEVEL = {
  pro: ['marketAnalysis', 'portfolioDiversification', 'riskManagement', 'technicalAnalysis', 'economicIndicators', 'valueInvesting'],
  vip: Object.keys(AI_TEMPLATES)
};

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.openai = null;
    this.initializeClients();
  }

  initializeClients() {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  generateId() {
    return crypto.randomUUID();
  }

  async chat(messages, options = {}) {
    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 2000 } = options;

    try {
      // Default to OpenAI
      if (!this.openai) {
        throw new Error('AI service not configured. Please set OPENAI_API_KEY');
      }

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的台灣股票投資分析師助手。請用繁體中文回答投資相關問題，並提供專業、分析性的建議。'
          },
          ...messages
        ],
        temperature,
        max_tokens: maxTokens
      });

      return response.choices[0].message;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error(`AI 服務發生錯誤: ${error.message}`);
    }
  }

  async chatWithTemplate(templateId, userInput, conversationHistory = []) {
    const template = AI_TEMPLATES[templateId];
    if (!template) {
      throw new Error('無效的模板 ID');
    }

    // Replace [INPUT] placeholder with user input
    const prompt = template.template.replace('[INPUT]', userInput || '台灣整體市場');

    const messages = [
      ...conversationHistory,
      { role: 'user', content: prompt }
    ];

    return await this.chat(messages);
  }

  getTemplate(templateId) {
    return AI_TEMPLATES[templateId] || null;
  }

  getAllTemplates() {
    return Object.values(AI_TEMPLATES);
  }

  getTemplatesForLevel(level) {
    const allowedIds = TEMPLATES_BY_LEVEL[level] || TEMPLATES_BY_LEVEL.pro;
    return allowedIds.map(id => AI_TEMPLATES[id]);
  }
}

export default new AIService();
