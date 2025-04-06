document.addEventListener("DOMContentLoaded", () => {
  const endpointUrl = document.getElementById("endpointUrl");
  const apiKey = document.getElementById("apiKey");
  const model = document.getElementById("model");
  const saveBtn = document.getElementById("saveBtn");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const status = document.getElementById("status");

  chrome.storage.sync.get(["endpointUrl", "apiKey", "model"], (data) => {
    endpointUrl.value = data.endpointUrl || "";
    apiKey.value = data.apiKey || "";
    model.value = data.model || "";
  });

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

  startBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "startDictation" });
    status.textContent = "Dictation started...";
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopDictation" });
    status.textContent = "Dictation stopped.";
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "transcription") {
      console.log("[Popup] Received transcription:", message.text);
      status.textContent = `Transcription: ${message.text}`;
      setTimeout(() => (status.textContent = ""), 5000); // Show for 5 seconds
    }
  });
});
