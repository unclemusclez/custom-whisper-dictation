let recognition;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDictation") {
    startDictation();
  }
});

function startDictation() {
  chrome.storage.sync.get(["endpointUrl", "apiKey", "model"], (settings) => {
    if (!settings.endpointUrl || !settings.apiKey) {
      console.error("Missing endpoint URL or API key");
      return;
    }

    // Initialize Web Speech API
    recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const audioBlob = await captureAudio(event);
      sendToCustomEndpoint(audioBlob, settings);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      console.log("Dictation ended");
    };

    recognition.start();
  });
}

// Capture audio (simplified - actual implementation may vary)
async function captureAudio(event) {
  const transcript = event.results[event.results.length - 1][0].transcript;
  // In a real scenario, you'd capture raw audio via MediaRecorder and convert it to a Blob
  // This is a placeholder; you'll need to adapt this based on llama.cpp requirements
  return new Blob([transcript], { type: "text/plain" });
}

// Send audio to custom endpoint
function sendToCustomEndpoint(audioBlob, settings) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");
  formData.append("model", settings.model);

  fetch(settings.endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Transcription:", data);
      // Optionally send transcription to content script or popup
      chrome.runtime.sendMessage({ action: "transcription", text: data.text });
    })
    .catch((error) => console.error("Error sending to endpoint:", error));
}
