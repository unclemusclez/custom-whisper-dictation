let mediaRecorder;
let audioChunks = [];
let activeTextareaId = null;
let recordingStartTime = null;
let stream = null;

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
      .then((audioStream) => {
        stream = audioStream;
        setupRecorder(stream, settings);
        monitorStream(stream, settings);
      })
      .catch((error) => console.error("[Background] Microphone error:", error));
  });
}

function setupRecorder(stream, settings) {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  audioChunks = [];
  if (!recordingStartTime) recordingStartTime = Date.now();

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
    const duration = (Date.now() - recordingStartTime) / 1000;
    console.log(
      "[Background] Audio chunk captured, size:",
      event.data.size,
      "time:",
      duration,
      "seconds"
    );
    sendChunkToEndpoint(
      new Blob([event.data], { type: "audio/webm" }),
      settings
    );
    // Request more data to keep chunking
    if (mediaRecorder.state === "recording") {
      mediaRecorder.requestData();
    }
  };

  mediaRecorder.onstop = () => {
    const duration = (Date.now() - recordingStartTime) / 1000;
    console.log(
      "[Background] Recording stopped unexpectedly, duration:",
      duration,
      "seconds, chunks:",
      audioChunks.length
    );
    if (stream && mediaRecorder.state !== "inactive") {
      console.log("[Background] Restarting recorder due to unexpected stop");
      setupRecorder(stream, settings);
    }
  };

  mediaRecorder.onerror = (event) => {
    console.error("[Background] MediaRecorder error:", event.error);
    if (stream) {
      restartStream(settings);
    }
  };

  mediaRecorder.onstatechange = () => {
    console.log("[Background] MediaRecorder state:", mediaRecorder.state);
    if (mediaRecorder.state === "inactive" && stream) {
      console.log("[Background] Recorder inactive, restarting");
      setupRecorder(stream, settings);
    }
  };

  mediaRecorder.start(5000); // 5-second chunks
  console.log(
    "[Background] Recording started for textareaId:",
    activeTextareaId
  );
}

function stopDictation() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("[Background] Manual stop for textareaId:", activeTextareaId);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "resetButton",
          textareaId: activeTextareaId,
        });
      }
    });
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
      recordingStartTime = null; // Reset start time on manual stop
    }
  } else {
    console.log("[Background] No active recording to stop");
  }
}

function sendChunkToEndpoint(chunkBlob, settings) {
  const formData = new FormData();
  formData.append("file", chunkBlob, "audio.webm");
  formData.append("model", settings.model || "base");

  console.log("[Background] Sending chunk to endpoint:", settings.endpointUrl);
  fetch(settings.endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })
    .then((response) => {
      console.log("[Background] Chunk server status:", response.status);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("[Background] Chunk server response:", data);
      const transcription = data.text || data.transcription || null;
      if (transcription) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            console.log(
              "[Background] Sending chunk to content script - tab:",
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
        console.log(
          "[Background] Sending chunk to popup - text:",
          transcription
        );
        chrome.runtime.sendMessage({
          action: "transcription",
          text: transcription,
        });
      } else {
        console.error("[Background] No transcription in chunk response:", data);
      }
    })
    .catch((error) => console.error("[Background] Chunk fetch error:", error));
}

function restartStream(settings) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((newStream) => {
      stream = newStream;
      setupRecorder(stream, settings);
      console.log("[Background] Stream restarted successfully");
    })
    .catch((error) =>
      console.error("[Background] Stream restart failed:", error)
    );
}

function monitorStream(stream, settings) {
  const audioTrack = stream.getAudioTracks()[0];
  audioTrack.onended = () => {
    console.log("[Background] Audio track ended unexpectedly");
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      restartStream(settings);
    }
  };
  setInterval(() => {
    console.log(
      "[Background] Stream active:",
      stream.active,
      "Track enabled:",
      audioTrack.enabled
    );
  }, 10000); // Check every 10 seconds
}
ls;
