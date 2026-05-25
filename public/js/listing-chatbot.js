(() => {
    const chatbotRoot = document.querySelector("[data-listing-chatbot]");
    if (!chatbotRoot) return;

    const listingId = chatbotRoot.dataset.listingId;
    const messageForm = chatbotRoot.querySelector("[data-chat-form]");
    const messageInput = chatbotRoot.querySelector("[data-chat-input]");
    const messagesContainer = chatbotRoot.querySelector("[data-chat-messages]");
    const statusText = chatbotRoot.querySelector("[data-chat-status]");
    const promptButtons = chatbotRoot.querySelectorAll("[data-chat-prompt]");
    const bookingPanel = chatbotRoot.querySelector("[data-chat-booking]");
    const bookingForm = chatbotRoot.querySelector("[data-chat-booking-form]");

    function scrollMessagesToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function setStatus(message, tone = "neutral") {
        if (!statusText) return;
        statusText.textContent = message || "";
        statusText.dataset.state = tone;
    }

    function highlightBookingPanel() {
        if (!bookingPanel) return;
        bookingPanel.classList.add("chatbot-booking-panel--active");
        window.setTimeout(() => {
            bookingPanel.classList.remove("chatbot-booking-panel--active");
        }, 1800);
    }

    async function playVoice(button, text) {
        const originalLabel = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Preparing voice...</span>';

        try {
            const response = await fetch(`/listings/${listingId}/chatbot/speak`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Voice playback is unavailable right now.");
            }

            const audio = new Audio(data.audioUrl);
            await audio.play();
            setStatus("Playing Murf voice reply.", "success");
        } catch (error) {
            setStatus(error.message || "Voice playback is unavailable right now.", "error");
        } finally {
            button.disabled = false;
            button.innerHTML = originalLabel;
        }
    }

    function appendMessage(role, text, options = {}) {
        const row = document.createElement("div");
        row.className = `chatbot-message-row chatbot-message-row--${role}`;

        const stack = document.createElement("div");
        stack.className = "chatbot-message-stack";

        const bubble = document.createElement("div");
        bubble.className = `chatbot-bubble chatbot-bubble--${role}`;
        bubble.textContent = text;
        stack.appendChild(bubble);

        if (role === "assistant" && options.voiceEnabled) {
            const voiceButton = document.createElement("button");
            voiceButton.type = "button";
            voiceButton.className = "chatbot-audio-btn";
            voiceButton.innerHTML = '<i class="fa-solid fa-volume-high"></i><span>Play voice</span>';
            voiceButton.addEventListener("click", () => playVoice(voiceButton, text));
            stack.appendChild(voiceButton);
        }

        row.appendChild(stack);
        messagesContainer.appendChild(row);
        scrollMessagesToBottom();
    }

    async function sendMessage(rawMessage) {
        const message = rawMessage.trim();
        if (!message) return;

        appendMessage("user", message);
        messageInput.value = "";
        setStatus("ApnaGhar assistant is thinking...", "neutral");

        const submitButton = messageForm.querySelector("button[type='submit']");
        submitButton.disabled = true;

        try {
            const response = await fetch(`/listings/${listingId}/chatbot/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "I could not answer that question right now.");
            }

            appendMessage("assistant", data.reply, { voiceEnabled: data.voiceEnabled });

            if (data.intent === "booking") {
                highlightBookingPanel();
            }

            if (data.voiceEnabled) {
                setStatus("Use Play voice to hear the Murf reply.", "success");
            } else {
                setStatus("Voice replies will appear after MURF_API_KEY is added.", "neutral");
            }
        } catch (error) {
            appendMessage("assistant", error.message || "I could not answer that question right now.");
            setStatus(error.message || "I could not answer that question right now.", "error");
        } finally {
            submitButton.disabled = false;
            messageInput.focus();
        }
    }

    messageForm.addEventListener("submit", (event) => {
        event.preventDefault();
        sendMessage(messageInput.value);
    });

    promptButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const prompt = button.dataset.chatPrompt || button.textContent || "";
            sendMessage(prompt);
        });
    });

    if (bookingForm) {
        const bookingSubmitButton = bookingForm.querySelector("button[type='submit']");
        const checkInInput = bookingForm.querySelector("[name='checkIn']");
        const checkOutInput = bookingForm.querySelector("[name='checkOut']");

        checkInInput.addEventListener("change", () => {
            checkOutInput.min = checkInInput.value;

            if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
                checkOutInput.value = "";
            }
        });

        bookingForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = {
                checkIn: bookingForm.querySelector("[name='checkIn']").value,
                checkOut: bookingForm.querySelector("[name='checkOut']").value,
                guests: bookingForm.querySelector("[name='guests']").value,
                specialRequests: bookingForm.querySelector("[name='specialRequests']").value,
            };

            bookingSubmitButton.disabled = true;
            setStatus("Creating your booking request...", "neutral");

            try {
                const response = await fetch(`/listings/${listingId}/chatbot/book`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(formData),
                });

                const data = await response.json();
                if (!response.ok) {
                    if (response.status === 401 && data.loginUrl) {
                        window.location.href = data.loginUrl;
                        return;
                    }

                    throw new Error(data.message || "We could not create the booking right now.");
                }

                appendMessage("assistant", data.message);
                setStatus("Booking created. Opening the confirmation page...", "success");
                window.setTimeout(() => {
                    window.location.href = data.redirectUrl;
                }, 900);
            } catch (error) {
                appendMessage("assistant", error.message || "We could not create the booking right now.");
                setStatus(error.message || "We could not create the booking right now.", "error");
                highlightBookingPanel();
            } finally {
                bookingSubmitButton.disabled = false;
            }
        });
    }

    scrollMessagesToBottom();
})();
