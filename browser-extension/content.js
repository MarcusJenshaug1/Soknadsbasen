// Content script — listens for auth token messages from the app page
// and stores the token in chrome.storage.local for popup use.

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "SOKNADBASEN_AUTH_TOKEN") return;
  if (typeof event.data.token !== "string") return;

  chrome.storage.local.set({ authToken: event.data.token });
});
