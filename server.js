const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// 初始化Express应用实例
const app = express();

// 配置中间件
app.use(cors()); // 启用跨域资源共享(CORS)
app.use(express.json()); // 解析JSON格式的请求体
app.use(express.static('.')); // 配置静态文件服务，将当前目录作为静态资源目录

// 加载环境变量
dotenv.config();

// 从环境变量中获取API配置信息
const API_KEY = process.env.API_KEY; // API密钥
const API_URL = process.env.API_URL; // API接口地址

// 处理聊天请求的路由
app.post('/api/chat', async (req, res) => {
    try {
                    // 解析SSE格式的数据
        // 获取用户发送的消息
        const userMessage = req.body.message;

        // 构建发送给火山方舟API的请求数据
        const requestData = {
            model: 'deepseek-r1-250120', // 使用的AI模型
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
            stream: true, // 启用流式响应
            temperature: 0.7 // 控制响应的随机性，0.7表示适中的创造性
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

        // 检查API响应状态
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
        }

        // 使用node-fetch的原生方法处理流式响应
        // 处理流式响应数据
        response.body.on('data', chunk => {
            const lines = chunk.toString().split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') continue; // 跳过空行
                if (line.trim() === 'data: [DONE]') continue; // 跳过结束标记

                try {
                    // 解析SSE格式的数据
                    const jsonStr = line.replace(/^data: /, '').trim();
                    const json = JSON.parse(jsonStr);
                    const content = json.choices[0]?.delta?.content || '';
                    if (content) {
                        res.write(content); // 将AI响应内容实时发送给客户端
                    }
                } catch (e) {
                    console.error('解析响应数据失败:', e);
                }
            }
        });

        // 响应结束处理
        response.body.on('end', () => {
            res.end();
        });

        // 错误处理
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
const PORT = process.env.PORT || 3000; // 设置服务器端口，默认为3000
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});