const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// 初始化Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 服务静态文件

// API配置
const API_KEY = '0d7f36b9-8f6f-4966-9283-74da056adcd4';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        // 准备请求数据
        const requestData = {
            model: 'deepseek-r1-250120',
            messages: [
                {
                    role: 'system',
                    content: '你是一位专业的生活教练，擅长倾听、分析和给出建设性的建议。你的目标是通过对话帮助用户实现个人成长，提供积极、实用的指导。请用温暖、专业的语气与用户交流。'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            stream: true,
            temperature: 0.7
        };

        // 设置响应头，支持流式输出
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 发送请求到火山方舟API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        // 使用node-fetch的原生方法处理流式响应
        response.body.on('data', chunk => {
            const lines = chunk.toString().split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.trim() === 'data: [DONE]') continue;

                try {
                    const jsonStr = line.replace(/^data: /, '').trim();
                    const json = JSON.parse(jsonStr);
                    const content = json.choices[0]?.delta?.content || '';
                    if (content) {
                        res.write(content);
                    }
                } catch (e) {
                    console.error('解析响应数据失败:', e);
                }
            }
        });

        response.body.on('end', () => {
            res.end();
        });

        response.body.on('error', error => {
            console.error('流处理错误:', error);
            res.status(500).end();
        });

    } catch (error) {
        console.error('处理请求失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});