export type ModelConfigTutorialStep = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

export type ModelConfigTutorialSection = {
  key: 'analysis' | 'image';
  title: string;
  linkText: string;
  linkUrl: string;
  steps: ModelConfigTutorialStep[];
};

export type ModelConfigTutorialPayload = {
  sections: ModelConfigTutorialSection[];
};

const tutorialPayload: ModelConfigTutorialPayload = {
  sections: [
    {
      key: 'analysis',
      title: '分析大模型配置教程',
      linkText: '分析大模型注册链接',
      linkUrl: 'https://www.aicodemirror.com/register?invitecode=HM74RP',
      steps: [
        {
          id: 'analysis-1',
          title: '注册账号',
          description: '点击链接，输入信息注册账号。新注册用户将会赠送共 8 元余额。',
          imageUrl: '/api/model-img/1.png'
        },
        {
          id: 'analysis-2',
          title: '查看注册赠送余额',
          description: '注册完成后可看到 2 元初始余额。',
          imageUrl: '/api/model-img/2.png'
        },
        {
          id: 'analysis-3',
          title: '领取社群额外余额',
          description: '加入社群后联系客户领取 6 元余额。',
          imageUrl: '/api/model-img/3.png'
        },
        {
          id: 'analysis-4',
          title: '创建 API Key',
          description:
            '先在 API 密钥页面创建一个 API Key。注：如果使用 GPT 模型，则不需要理会 Claude 渠道问题，默认即可。',
          imageUrl: '/api/model-img/4.png'
        },
        {
          id: 'analysis-5',
          title: '复制 OpenAI API 地址并回填',
          description:
            '以使用 GPT 模型为例，找到左侧 API 专区，打开 OpenAI API，复制该 URL 并粘贴到本站设置页的 API 地址输入框。',
          imageUrl: '/api/model-img/5.png'
        }
      ]
    },
    {
      key: 'image',
      title: '生图大模型配置教程',
      linkText: '生图大模型站点',
      linkUrl: 'https://www.aiartmirror.com/register?aff=WmAg',
      steps: [
        {
          id: 'image-1',
          title: '注册账号',
          description: '先点击链接并填写信息注册账号。',
          imageUrl: '/api/model-img/1-1.png'
        },
        {
          id: 'image-2',
          title: '充值体验余额',
          description:
            '当前站点没有赠送免费体验余额，需要进入钱包管理进行余额充值。建议先充值小额进行体验。',
          imageUrl: '/api/model-img/1-2.png'
        },
        {
          id: 'image-3',
          title: '创建令牌',
          description: '找到令牌管理页面，点击创建令牌。',
          imageUrl: '/api/model-img/1-3.png'
        },
        {
          id: 'image-4',
          title: '选择令牌分组',
          description:
            '创建令牌时注意分组选择：图中第一个分组只能使用 gpt-image 模型，第二个分组只能使用 nano banana 模型，会影响本站后续模型填写，推荐选第一个分组。',
          imageUrl: '/api/model-img/1-4.png'
        },
        {
          id: 'image-5',
          title: '复制密钥并回填',
          description: '令牌创建完成后点击复制密钥，并回填到本站设置页的 API Key 输入框。',
          imageUrl: '/api/model-img/1-5.png'
        }
      ]
    }
  ]
};

export class ModelConfigTutorialService {
  public getTutorial(): ModelConfigTutorialPayload {
    return tutorialPayload;
  }
}

export const modelConfigTutorialService = new ModelConfigTutorialService();
