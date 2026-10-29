import { defineNuxtPlugin } from "#imports"

export default defineNuxtPlugin((nuxtApp) => {
  // Native transitions freeze painting while an async page resolves. Release that
  // snapshot on slower requests so the existing page and loading bar stay live.
  nuxtApp.hook("page:view-transition:start", (transition) => {
    if (!document.documentElement.hasAttribute("data-erp-site")) return
    const timeout = setTimeout(() => transition.skipTransition(), 220)
    const clear = () => clearTimeout(timeout)
    void transition.ready.then(clear, clear)
    void transition.finished.then(clear, clear)
  })
})
