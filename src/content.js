function injectButton(textarea) {
  // Skip if button already exists
  if (textarea.nextSibling && textarea.nextSibling.tagName === "BUTTON") {
    console.log(
      "[Content] Button already exists for textareaId:",
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
    z-index: 1000;
  `;
  button.dataset.recording = "false";

  textarea.style.position = "relative";
  textarea.parentNode.insertBefore(button, textarea.nextSibling);
  textarea.dataset.textareaId = textarea.id || generateUniqueId();

  console.log(
    "[Content] Injected button for textareaId:",
    textarea.dataset.textareaId
  );

  button.addEventListener("click", () => {
    const isRecording = button.dataset.recording === "true";
    const textareaId = textarea.dataset.textareaId;
    if (!isRecording) {
      chrome.runtime.sendMessage({ action: "startDictation", textareaId });
      button.textContent = "Stop Dictation";
      button.style.backgroundColor = "#f44336";
      button.dataset.recording = "true";
      console.log("[Content] Sent startDictation for textareaId:", textareaId);
    } else {
      chrome.runtime.sendMessage({ action: "stopDictation", textareaId });
      button.textContent = "Start Dictation";
      button.style.backgroundColor = "#4CAF50";
      button.dataset.recording = "false";
      console.log("[Content] Sent stopDictation for textareaId:", textareaId);
    }
  });
}

// Function to inject buttons into all textareas
function injectButtonsIntoAllTextareas() {
  console.log("[Content] Scanning for textareas to inject buttons");
  document.querySelectorAll("textarea").forEach((textarea) => {
    injectButton(textarea);
  });
}

// Initial injection
injectButtonsIntoAllTextareas();

// Watch for DOM changes
const observer = new MutationObserver((mutations) => {
  let textareaAdded = false;
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === "TEXTAREA") {
          console.log("[Content] New textarea detected by observer");
          injectButton(node);
          textareaAdded = true;
        }
      });
    }
  });
  // If no new textareas were added but the DOM changed, recheck all
  if (!textareaAdded) {
    injectButtonsIntoAllTextareas();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Handle transcription
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "insertTranscription") {
    console.log("[Content] Received insertTranscription:", message);
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
    sendResponse({ status: "success" });
  }
});

function generateUniqueId() {
  return "textarea-" + Math.random().toString(36).substr(2, 9);
}
