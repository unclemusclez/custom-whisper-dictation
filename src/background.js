let mediaRecorder;
let audioChunks = [];
let activeTextareaId = null;
let recordingStartTime = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDictation") {
    activeTextareaId = message.textareaId;
    console.log(
      "[Background] Start dictation requested for textareaId:",
      activeTextareaId
    );
    startDictation();
  } else if (message.action === "stopDictation") {
    console.log(
      "[Background] Stop dictation requested for textareaId:",
      activeTextareaId
    );
    stopDictation();
  }
});

function startDictation() {
  chrome.storage.sync.get(["endpointUrl", "apiKey", "model"], (settings) => {
    if (!settings.endpointUrl || !settings.apiKey) {
      console.error("[Background] Missing endpoint URL or API key:", settings);
      return;
    }
    console.log("[Background] Dictation settings:", settings);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingStartTime = Date.now();

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
          console.log(
            "[Background] Audio chunk captured, size:",
            event.data.size,
            "time elapsed:",
            (Date.now() - recordingStartTime) / 1000,
            "seconds"
          );
        };

        mediaRecorder.onstop = () => {
          const duration = (Date.now() - recordingStartTime) / 1000;
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          console.log(
            "[Background] Recording stopped, duration:",
            duration,
            "seconds, blob size:",
            audioBlob.size
          );
          sendToCustomEndpoint(audioBlob, settings);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(1000); // Send data every 1 second to keep stream alive
        console.log(
          "[Background] Recording started for textareaId:",
          activeTextareaId
        );
      })
      .catch((error) => console.error("[Background] Microphone error:", error));
  });
}

function stopDictation() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log(
      "[Background] Recording stopped for textareaId:",
      activeTextareaId
    );
  } else {
    console.log("[Background] No active recording to stop");
  }
}

function sendToCustomEndpoint(audioBlob, settings) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  formData.append("model", settings.model || "base");

  console.log("[Background] Sending to endpoint:", settings.endpointUrl);
  fetch(settings.endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })
    .then((response) => {
      console.log("[Background] Server status:", response.status);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("[Background] Full server response:", data);
      const transcription = data.text || data.transcription || null;
      if (transcription) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            console.log(
              "[Background] Sending to content script - tab:",
              tabs[0].id,
              "text:",
              transcription
            );
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "insertTranscription",
              text: transcription,
              textareaId: activeTextareaId,
            });
          }
        });
        console.log("[Background] Sending to popup - text:", transcription);
        chrome.runtime.sendMessage({
          action: "transcription",
          text: transcription,
        });
      } else {
        console.error("[Background] No transcription found in response:", data);
      }
    })
    .catch((error) => console.error("[Background] Fetch error:", error));
}
