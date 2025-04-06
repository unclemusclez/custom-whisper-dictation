function injectButton(textarea) {
  // Ensure no duplicate buttons
  if (textarea.nextSibling && textarea.nextSibling.tagName === "BUTTON") {
    console.log(
      "[Content] Skipping textarea, button already exists:",
      textarea.dataset.textareaId
    );
    return;
  }

  const button = document.createElement("button");
  button.textContent = "Start Dictation";
  button.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 2px 5px;
    font-size: 12px;
    background-color: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
  `;
  button.dataset.recording = "false";

  textarea.style.position = "relative";
  textarea.parentNode.insertBefore(button, textarea.nextSibling);
  textarea.dataset.textareaId = textarea.id || generateUniqueId();

  button.addEventListener("click", () => {
    const isRecording = button.dataset.recording === "true";
    const textareaId = textarea.dataset.textareaId;
    if (!isRecording) {
      chrome.runtime.sendMessage({ action: "startDictation", textareaId });
      button.textContent = "Stop Dictation";
      button.style.backgroundColor = "#f44336";
      button.dataset.recording = "true";
      console.log("[Content] Start dictation for textareaId:", textareaId);
    } else {
      chrome.runtime.sendMessage({ action: "stopDictation", textareaId });
      button.textContent = "Start Dictation";
      button.style.backgroundColor = "#4CAF50";
      button.dataset.recording = "false";
      console.log("[Content] Stop dictation for textareaId:", textareaId);
    }
  });

  console.log(
    "[Content] Button injected for textareaId:",
    textarea.dataset.textareaId
  );
}

// Inject buttons into existing textareas
document.querySelectorAll("textarea").forEach((textarea) => {
  injectButton(textarea);
});

// Observe DOM changes, only for textareas
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === "TEXTAREA") {
          injectButton(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll("textarea").forEach(injectButton);
        }
      });
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// Handle transcription
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "insertTranscription") {
    console.log("[Content] Received transcription message:", message);
    document.querySelectorAll("textarea").forEach((textarea) => {
      if (textarea.dataset.textareaId === message.textareaId) {
        console.log(
          "[Content] Inserting text into textareaId:",
          message.textareaId,
          "text:",
          message.text
        );
        textarea.value += message.text + " ";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        const button = textarea.nextSibling;
        if (button && button.tagName === "BUTTON") {
          button.textContent = "Start Dictation";
          button.style.backgroundColor = "#4CAF50";
          button.dataset.recording = "false";
        }
      }
    });
    sendResponse({ status: "success" }); // Acknowledge receipt
  }
});

function generateUniqueId() {
  return "textarea-" + Math.random().toString(36).substr(2, 9);
}
