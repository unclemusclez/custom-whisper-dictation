function injectButton(textarea) {
  if (textarea.nextSibling && textarea.nextSibling.tagName === "BUTTON") {
    console.log(
      "[Content] Button already exists for textareaId:",
      textarea.dataset.textareaId
    );
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: relative;
    display: block;
  `;
  console.log("[Content] Created wrapper");
  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);
  console.log("[Content] Wrapped textarea in div");

  textarea.style.overflowY = "auto";

  const button = document.createElement("button");
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
      <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  `;
  button.dataset.recording = "false";

  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  button.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    left: auto;
    width: 20px;
    height: 20px;
    background-color: ${isDarkMode ? "#555" : "#ddd"};
    color: ${isDarkMode ? "#fff" : "#000"};
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    z-index: 1000;
  `;

  wrapper.appendChild(button);
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
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="stop-icon">
          <rect x="6" y="6" width="12" height="12"></rect>
        </svg>
      `;
      button.style.backgroundColor = isDarkMode ? "#f44336" : "#e57373";
      button.dataset.recording = "true";
      console.log("[Content] Sent startDictation for textareaId:", textareaId);
    } else {
      chrome.runtime.sendMessage({ action: "stopDictation", textareaId });
      resetButton(button, isDarkMode);
      console.log("[Content] Sent stopDictation for textareaId:", textareaId);
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.action === "insertTranscription" &&
      message.textareaId === textarea.dataset.textareaId
    ) {
      console.log(
        "[Content] Inserting text into textareaId:",
        message.textareaId,
        "text:",
        message.text
      );
      textarea.value += message.text + " ";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.scrollTop = textarea.scrollHeight;
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } else if (
      message.action === "resetButton" &&
      message.textareaId === textarea.dataset.textareaId
    ) {
      resetButton(button, isDarkMode);
    }
    sendResponse({ status: "success" });
  });
}

function resetButton(button, isDarkMode) {
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
      <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  `;
  button.style.backgroundColor = isDarkMode ? "#555" : "#ddd";
  button.dataset.recording = "false";
}

function injectButtonsIntoAllTextareas() {
  console.log("[Content] Scanning for textareas to inject buttons");
  document
    .querySelectorAll("textarea:not([data-textareaId])")
    .forEach((textarea) => {
      injectButton(textarea);
    });
}

injectButtonsIntoAllTextareas();

const observer = new MutationObserver((mutations) => {
  let textareaAdded = false;
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === "TEXTAREA" && !node.dataset.textareaId) {
          console.log("[Content] New textarea detected by observer");
          injectButton(node);
          textareaAdded = true;
        }
      });
    }
  });
  if (!textareaAdded) {
    injectButtonsIntoAllTextareas();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

function generateUniqueId() {
  return "textarea-" + Math.random().toString(36).substr(2, 9);
}
