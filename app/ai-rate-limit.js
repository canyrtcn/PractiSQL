// One queue shared by all renderer windows, including retries and SQL repairs.
// 4.1 seconds leaves a small margin below 15 starts in any 60-second window.
function createProviderGate({ now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  let nextGoogleStart = 0;
  let queue = Promise.resolve();
  return function waitForSlot(provider) {
    if (provider !== 'google') return Promise.resolve();
    const slot = queue.then(async () => {
      while (nextGoogleStart > now()) await sleep(nextGoogleStart - now());
      nextGoogleStart = now() + 4100;
    });
    queue = slot.catch(() => {});
    return slot;
  };
}
module.exports = { createProviderGate };
