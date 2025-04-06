let mediaRecorder;
let audioChunks = [];
let activeTextareaId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDictation") {
    activeTextareaId = message.textareaId; // Store the ID of the textarea
    startDictation();
  } else if (message.action === "stopDictation") {
    stopDictation();
  }
});

function startDictation() {
  chrome.storage.sync.get(["endpointUrl", "apiKey", "model"], (settings) => {
    if (!settings.endpointUrl || !settings.apiKey) {
      console.error("Missing endpoint URL or API key");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          sendToCustomEndpoint(audioBlob, settings);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        console.log("Recording started for textarea:", activeTextareaId);
      })
      .catch((error) => console.error("Error accessing microphone:", error));
  });
}

function stopDictation() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("Recording stopped for textarea:", activeTextareaId);
  }
}

function sendToCustomEndpoint(audioBlob, settings) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  formData.append("model", settings.model || "base");

  fetch(settings.endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("Transcription:", data.text);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "insertTranscription",
          text: data.text,
          textareaId: activeTextareaId,
        });
      });
    })
    .catch((error) => console.error("Error sending to endpoint:", error));
}
