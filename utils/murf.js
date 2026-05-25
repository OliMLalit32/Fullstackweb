const MURF_SPEECH_ENDPOINT = "https://api.murf.ai/v1/speech/generate";

function buildMurfError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

module.exports.synthesizeSpeech = async (text) => {
    const apiKey = process.env.MURF_API_KEY;

    if (!apiKey) {
        throw buildMurfError("Murf voice replies are not configured yet. Add MURF_API_KEY to enable them.", 503);
    }

    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!trimmedText) {
        throw buildMurfError("Text is required to generate Murf audio.", 400);
    }

    const payload = {
        text: trimmedText.slice(0, 450),
        voiceId: process.env.MURF_VOICE_ID || "en-IN-priya",
        locale: process.env.MURF_LOCALE || "en-IN",
        format: "MP3",
        sampleRate: 44100,
        modelVersion: "GEN2",
    };

    if (process.env.MURF_STYLE) {
        payload.style = process.env.MURF_STYLE;
    }

    const response = await fetch(MURF_SPEECH_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const details = data.message || data.error || "Murf could not generate the audio reply right now.";
        throw buildMurfError(details, response.status);
    }

    if (!data.audioFile) {
        throw buildMurfError("Murf did not return an audio file for this reply.", 502);
    }

    return {
        audioUrl: data.audioFile,
        audioLengthInSeconds: data.audioLengthInSeconds || 0,
        remainingCharacterCount: data.remainingCharacterCount ?? null,
    };
};
