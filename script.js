// ============================================================
// script.js – Multi-Model AI Chat with Mourad, Imane & Mourmane
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ----- DOM references -----
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messageDisplay = document.getElementById('message-display');
    const channelItems = document.querySelectorAll('.channel');
    const chatTitle = document.getElementById('chat-title');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const sidebar = document.getElementById('sidebar');
    const actionIcons = document.querySelectorAll('.action-icon');

    // ============================================================
    // 🔑 YOUR API KEY
    // ============================================================
    const YOUR_API_KEY = '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';
    
    // ============================================================

    // ============================================================
    // 🧠 THE 3 POWERFUL AI MODELS (Named Mourad, Imane, Mourmane)
    // ============================================================
    const MODELS = {
        mourad: {
            id: 'nvidia/nemotron-3-super-120b-a12b:free',
            name: 'Mourad',
            emoji: '🧠',
            description: 'The Wise One · 120B MoE · 1M context',
            strengths: 'Deep reasoning, complex agents, long documents, coding'
        },
        imane: {
            id: 'tencent/hy3:free',
            name: 'Imane',
            emoji: '⚡',
            description: 'The Fast Thinker · Anti-hallucination',
            strengths: 'Math, logic, quick answers, tool calling'
        },
        mourmane: {
            id: 'qwen/qwen3.6-plus-preview:free',
            name: 'Mourmane',
            emoji: '🐉',
            description: 'The Knowledge Keeper · 1M context',
            strengths: 'Massive context, multilingual, creative writing'
        }
    };

    // ============================================================

    // ----- State -----
    let currentModel = 'mourad'; // Default: Mourad
    let messageHistory = [];
    let isProcessing = false;
    let currentChannel = 'general';

    // ----- AI Configuration -----
    function getAIConfig() {
        const model = MODELS[currentModel];
        return {
            apiKey: YOUR_API_KEY,
            model: model.id,
            url: 'https://openrouter.ai/api/v1/chat/completions'
        };
    }

    // ----- Helper: Get current time -----
    function getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // ----- Helper: Create a message element -----
    function createMessageElement(username, text, time, isAI = false, modelEmoji = '') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-item';
        
        if (isAI) {
            messageDiv.style.background = '#1e2a3a';
            messageDiv.style.borderLeft = '3px solid #4f6ef7';
        }
        
        // System messages (model switches)
        if (username === 'System') {
            messageDiv.style.background = '#2a3142';
            messageDiv.style.textAlign = 'center';
            messageDiv.style.borderLeft = '3px solid #f0c040';
        }
        
        const userSpan = document.createElement('span');
        userSpan.className = 'msg-user';
        userSpan.textContent = username;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        timeSpan.textContent = time || getCurrentTime();
        
        const textP = document.createElement('p');
        textP.className = 'msg-text';
        textP.textContent = text;
        
        // If it's AI and has emoji, add it
        if (isAI && modelEmoji) {
            userSpan.textContent = `${modelEmoji} ${userSpan.textContent}`;
        }
        
        messageDiv.appendChild(userSpan);
        messageDiv.appendChild(timeSpan);
        messageDiv.appendChild(textP);
        
        return messageDiv;
    }

    // ----- Show typing indicator with current model -----
    function showTypingIndicator() {
        const model = MODELS[currentModel];
        const indicator = document.createElement('div');
        indicator.className = 'message-item';
        indicator.id = 'typing-indicator';
        indicator.style.background = '#1e2a3a';
        indicator.style.borderLeft = '3px solid #4f6ef7';
        indicator.innerHTML = `
            <span style="grid-column: 1 / 4; color: #8892a8;">
                ${model.emoji} ${model.name} is thinking<span class="dots">...</span>
            </span>
        `;
        messageDisplay.appendChild(indicator);
        messageDisplay.scrollTop = messageDisplay.scrollHeight;
        return indicator;
    }

    // ----- Remove typing indicator -----
    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    // ----- Switch model -----
    function switchModel(modelKey, triggeredByUser = false) {
        if (modelKey === currentModel && triggeredByUser) {
            addSystemMessage(`💬 Already talking to ${MODELS[modelKey].emoji} ${MODELS[modelKey].name}`);
            return false;
        }
        
        currentModel = modelKey;
        const model = MODELS[modelKey];
        
        // Reset message history when switching models
        messageHistory = [];
        
        // Show system message
        const msg = `🔄 Switched to ${model.emoji} ${model.name}\n📝 ${model.description}`;
        addSystemMessage(msg);
        
        // Update input placeholder
        messageInput.placeholder = `💬 Chatting with ${model.emoji} ${model.name} · Ask anything...`;
        
        // Update footer
        document.querySelector('#chat-footer p').textContent = 
            `🤖 ${model.emoji} ${model.name} · ${model.strengths}`;
        
        // Update sidebar highlight
        document.querySelectorAll('.model-option').forEach(el => {
            el.style.background = 'transparent';
            el.style.color = '#c8d0e0';
            if (el.dataset.model === modelKey) {
                el.style.background = '#3b4456';
                el.style.color = '#f0f4ff';
                el.style.fontWeight = 'bold';
            }
        });
        
        return true;
    }

    // ----- Add system message -----
    function addSystemMessage(text) {
        const msg = createMessageElement('System', text);
        msg.style.background = '#2a3142';
        msg.style.textAlign = 'center';
        msg.style.borderLeft = '3px solid #f0c040';
        // Override grid to center
        msg.querySelector('.msg-user').style.gridColumn = '1 / 4';
        msg.querySelector('.msg-user').style.textAlign = 'center';
        msg.querySelector('.msg-user').style.color = '#f0c040';
        msg.querySelector('.msg-time').style.display = 'none';
        messageDisplay.appendChild(msg);
        messageDisplay.scrollTop = messageDisplay.scrollHeight;
    }

    // ----- Call AI API -----
    async function getAIResponse(userMessage) {
        const config = getAIConfig();
        const model = MODELS[currentModel];
        
        // Add user message to history
        messageHistory.push({
            role: 'user',
            content: userMessage
        });

        if (messageHistory.length > 10) {
            messageHistory = messageHistory.slice(-10);
        }

        try {
            console.log(`📤 ${model.emoji} ${model.name} is thinking...`);
            
            const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'HTTP-Referer': 'http://127.0.0.1:5500',
                    'X-Title': 'Multi-Model Chat'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are ${model.name}, a helpful AI assistant. ${model.description}. Your personality: ${model.name === 'Mourad' ? 'wise and thoughtful, giving deep insights' : model.name === 'Imane' ? 'quick and sharp, giving precise answers' : 'creative and knowledgeable, giving rich detailed responses'}. Respond in a friendly, conversational way.`
                        },
                        ...messageHistory
                    ],
                    temperature: 0.7,
                    max_tokens: 400
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();
            console.log(`✅ ${model.emoji} ${model.name} responded`);
            
            const aiReply = data.choices[0].message.content;
            
            messageHistory.push({
                role: 'assistant',
                content: aiReply
            });

            return aiReply;
        } catch (error) {
            console.error('❌ Error:', error);
            return `❌ Error: ${error.message}`;
        }
    }

    // ----- Send message -----
    async function sendMessage() {
        let text = messageInput.value.trim();
        if (text === '' || isProcessing) return;
        
        // Check for model switch command: @mourad, @imane, @mourmane
        const modelMatch = text.match(/^@(mourad|imane|mourmane)\s*/i);
        if (modelMatch) {
            const modelKey = modelMatch[1].toLowerCase();
            const remainingText = text.replace(/^@\w+\s*/, '').trim();
            
            // Switch model
            switchModel(modelKey, true);
            
            // If there's text after the command, send that to the new model
            if (remainingText) {
                text = remainingText;
            } else {
                // Just switch, don't send message
                messageInput.value = '';
                return;
            }
        }
        
        // Show user message
        const userMessage = createMessageElement('You', text);
        messageDisplay.appendChild(userMessage);
        messageDisplay.scrollTop = messageDisplay.scrollHeight;
        
        messageInput.value = '';
        messageInput.focus();
        
        // Show typing indicator
        showTypingIndicator();
        isProcessing = true;
        
        try {
            const aiReply = await getAIResponse(text);
            removeTypingIndicator();
            
            const model = MODELS[currentModel];
            const aiMessage = createMessageElement(
                `${model.name}`, 
                aiReply, 
                null, 
                true, 
                model.emoji
            );
            messageDisplay.appendChild(aiMessage);
            messageDisplay.scrollTop = messageDisplay.scrollHeight;
            
        } catch (error) {
            removeTypingIndicator();
            const errorMsg = createMessageElement('System', `Error: ${error.message}`, null, true);
            errorMsg.style.background = '#3a1e1e';
            messageDisplay.appendChild(errorMsg);
            messageDisplay.scrollTop = messageDisplay.scrollHeight;
        }
        
        isProcessing = false;
    }

    // ----- Event listeners -----
    sendButton.addEventListener('click', function(e) {
        e.preventDefault();
        sendMessage();
    });

    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ----- Model switching via sidebar -----
    document.querySelectorAll('.model-option').forEach(el => {
        el.addEventListener('click', function() {
            const modelKey = this.dataset.model;
            switchModel(modelKey, true);
        });
    });

    // ----- Channel switching -----
    channelItems.forEach(channel => {
        channel.addEventListener('click', function() {
            channelItems.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const channelName = this.textContent.trim();
            chatTitle.textContent = channelName;
            currentChannel = channelName.replace('#', '').trim();
            
            // Clear chat but keep welcome
            messageDisplay.innerHTML = '';
            messageHistory = [];
            
            const systemMsg = document.createElement('div');
            systemMsg.className = 'message-item';
            systemMsg.style.background = '#2a3142';
            systemMsg.style.textAlign = 'center';
            systemMsg.innerHTML = `
                <span style="color: #f0c040; font-style: italic; grid-column: 1 / 4; text-align: center;">
                    Welcome to ${channelName}
                </span>
            `;
            messageDisplay.appendChild(systemMsg);
            
            // Show current model
            const model = MODELS[currentModel];
            setTimeout(() => {
                addSystemMessage(`🤖 Active: ${model.emoji} ${model.name}\n${model.description}`);
            }, 300);
        });
    });

    // ----- Hamburger menu toggle -----
    let sidebarVisible = true;
    hamburgerIcon.addEventListener('click', function() {
        if (window.innerWidth <= 540) {
            sidebarVisible = !sidebarVisible;
            sidebar.style.display = sidebarVisible ? 'flex' : 'none';
        }
    });

    // ----- Action icons -----
    actionIcons.forEach((icon, index) => {
        icon.addEventListener('click', function() {
            const actions = ['📎 Attachment', '😊 Emoji', '🎤 Voice'];
            const actionName = actions[index] || 'Action';
            
            const tempMsg = createMessageElement('System', `${actionName} (coming soon!)`);
            tempMsg.style.background = '#2a3142';
            tempMsg.style.opacity = '0.8';
            messageDisplay.appendChild(tempMsg);
            messageDisplay.scrollTop = messageDisplay.scrollHeight;
            
            setTimeout(() => {
                if (tempMsg.parentNode) {
                    tempMsg.remove();
                }
            }, 3000);
        });
    });

    // ============================================================
    // 🚀 INITIALIZATION
    // ============================================================
    
    // Start with Mourad
    switchModel('mourad', false);
    
    // Welcome message
    setTimeout(() => {
        const model = MODELS[currentModel];
        addSystemMessage(`👋 Welcome to Multi-Model AI Chat!\n\n🧠 Active: ${model.emoji} ${model.name}\n📝 ${model.description}\n\n💡 Switch models by typing:\n• @mourad → The Wise One\n• @imane → The Fast Thinker\n• @mourmane → The Knowledge Keeper`);
        
        // AI welcome
        setTimeout(async () => {
            const welcomeMsg = createMessageElement(
                `${model.name}`,
                `Hello! 👋 I'm ${model.emoji} ${model.name}. I specialize in ${model.strengths}. What would you like to know today?`,
                null,
                true,
                model.emoji
            );
            messageDisplay.appendChild(welcomeMsg);
            messageDisplay.scrollTop = messageDisplay.scrollHeight;
        }, 1000);
    }, 500);

    messageInput.focus();
    console.log('💬 Multi-Model Chat initialized!');
    console.log('🧠 Mourad: nvidia/nemotron-3-super-120b-a12b:free');
    console.log('⚡ Imane: tencent/hy3:free');
    console.log('🐉 Mourmane: qwen/qwen3.6-plus-preview:free');
});
