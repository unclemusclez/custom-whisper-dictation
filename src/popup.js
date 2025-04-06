document.addEventListener("DOMContentLoaded", () => {
  const endpointUrl = document.getElementById("endpointUrl");
  const apiKey = document.getElementById("apiKey");
  const model = document.getElementById("model");
  const saveBtn = document.getElementById("saveBtn");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const status = document.getElementById("status");

  // Load saved settings
  chrome.storage.sync.get(["endpointUrl", "apiKey", "model"], (data) => {
    endpointUrl.value = data.endpointUrl || "";
    apiKey.value = data.apiKey || "";
    model.value = data.model || "";
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    const settings = {
      endpointUrl: endpointUrl.value,
      apiKey: apiKey.value,
      model: model.value,
    };
    chrome.storage.sync.set(settings, () => {
      status.textContent = "Settings saved!";
      setTimeout(() => (status.textContent = ""), 2000);
    });
  });

  // Start dictation
  startBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "startDictation" });
    status.textContent = "Dictation started...";
  });

  // Stop dictation
  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopDictation" });
    status.textContent = "Dictation stopped.";
  });

  // Display transcription status (optional, for debugging)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "transcription") {
      status.textContent = `Transcription sent to textarea: ${message.text}`;
      setTimeout(() => (status.textContent = ""), 2000);
    }
  });
});
