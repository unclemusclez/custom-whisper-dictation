// Function to inject button into a textarea
function injectButton(textarea) {
  // Skip if button already exists
  if (textarea.nextSibling && textarea.nextSibling.tagName === "BUTTON") return;

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

  button.addEventListener("click", () => {
    const isRecording = button.dataset.recording === "true";
    const textareaId = textarea.id || generateUniqueId();
    if (!isRecording) {
      chrome.runtime.sendMessage({ action: "startDictation", textareaId });
      button.textContent = "Stop Dictation";
      button.style.backgroundColor = "#f44336";
      button.dataset.recording = "true";
    } else {
      chrome.runtime.sendMessage({ action: "stopDictation", textareaId });
      button.textContent = "Start Dictation";
      button.style.backgroundColor = "#4CAF50";
      button.dataset.recording = "false";
    }
  });

  // Store textareaId on the textarea element for message handling
  textarea.dataset.textareaId = textarea.id || generateUniqueId();
}

// Initial injection for existing textareas
document.querySelectorAll("textarea").forEach(injectButton);

// Observe DOM changes to catch new textareas
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
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "insertTranscription") {
    document.querySelectorAll("textarea").forEach((textarea) => {
      if (textarea.dataset.textareaId === message.textareaId) {
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
  }
});

// Generate a unique ID if needed
function generateUniqueId() {
  return "textarea-" + Math.random().toString(36).substr(2, 9);
}
