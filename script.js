    const SERPER_KEY = "5540705e7813261a302315af27e00bfb90559f43";
        const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"; 
        const SYSTEM_PROMPT = "You are a professional shopping assistant. When a user asks for an item, explain specifically why the selected options are the best (mentioning value, quality, or features). Keep the explanation to 2-3 sentences.";

        let apiKeys = []; 
        let apiKeyIndex = -1;

        async function init() {
            const res = await fetch("https://groq-api-keys.pages.dev/apikeys.txt");
            const txt = await res.text();
            apiKeys = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l);
            lucide.createIcons();
        }

        function getNextKey() {
            apiKeyIndex = (apiKeyIndex + 1) % apiKeys.length;
            return apiKeys[apiKeyIndex];
        }

        async function fetchProducts(query) {
            const response = await fetch("https://google.serper.dev/shopping", {
                method: "POST",
                headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ q: query })
            });
            const data = await response.json();
            return (data.shopping || []).slice(0, 4);
        }

        function createAiLoadingBubble() {
            const div = document.createElement('div');
            div.className = 'ai-container';
            div.id = 'current-loading';
            div.innerHTML = `
                <div class="ai-explanation h-6 w-48 skeleton rounded mb-4"></div>
                <div class="products-found-label h-6 w-32 skeleton rounded"></div>
                <div class="product-grid">
                    ${Array(4).fill(`<div class="product-card skeleton"></div>`).join('')}
                </div>
            `;
            document.getElementById('chat-container').appendChild(div);
            window.scrollTo(0, document.body.scrollHeight);
            return div;
        }

        async function handleSend() {
            const input = document.getElementById('user-input');
            const query = input.value.trim();
            if (!query) return;


            const userMsg = document.createElement('div');
            userMsg.className = 'user-bubble';
            userMsg.textContent = query;
            document.getElementById('chat-container').appendChild(userMsg);
            input.value = '';

            const loadingBubble = createAiLoadingBubble();

            try {
                const products = await fetchProducts(query);
                
                const res = await fetch(GROQ_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getNextKey()}` },
                    body: JSON.stringify({
                        model: "meta-llama/llama-4-scout-17b-16e-instruct",
                        messages: [{role: "system", content: SYSTEM_PROMPT}, {role: "user", content: `I am looking for: ${query}. Here are products found: ${products.map(p => p.title).join(', ')}`}],
                        temperature: 0.7
                    })
                });
                const aiData = await res.json();
                const explanation = aiData.choices[0].message.content;


                loadingBubble.innerHTML = `
                    <div class="ai-explanation">${explanation}</div>
                    <div class="products-found-label">products found,</div>
                    <div class="product-grid">
                        ${products.map(p => `
                            <a href="${p.link}" target="_blank" class="product-card">
                                <div class="product-info">
                                    <span class="retail-price">${p.price}</span>
                                    <div class="camel-btn">Check Availability</div>
                                </div>
                                <div class="product-image-container">
                                    <img src="${p.imageUrl}" class="w-full h-full object-cover">
                                </div>
                            </a>
                        `).join('')}
                    </div>
                `;
                loadingBubble.id = '';
            } catch (err) {
                loadingBubble.remove();
            }
        }

        document.getElementById('send-btn').onclick = handleSend;
        document.getElementById('user-input').onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
        init();
