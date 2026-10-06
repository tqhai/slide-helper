let target;
const status = document.getElementById('status');
const start = document.getElementById('start');
const stop = document.getElementById('stop');
function display(state) {
  status.textContent = state.message;
  start.disabled = state.running;
  stop.disabled = !state.running;
}
async function call(action, min, max) {
  const results = await chrome.scripting.executeScript({
    target,
    func: (action, min, max) => {
      const helper = globalThis.slideHelper;
      if (!helper) throw new Error('Khung bài học đã tải lại; hãy mở lại extension.');
      return action === 'start' ? helper.start(min, max) : action === 'stop' ? helper.stop() : helper.status();
    },
    args: [action, min ?? null, max ?? null]
  });
  display(results[0].result);
}
start.addEventListener('click', async () => {
  try {
    const min = Number(document.getElementById('min').value);
    const max = Number(document.getElementById('max').value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < min || max > 3600) throw new Error('Nhập thời gian từ 1–3600 giây, tối đa ≥ tối thiểu.');
    await call('start', min, max);
    localStorage.setItem('delay', JSON.stringify({ min, max }));
  } catch (error) { status.textContent = error.message; }
});
stop.addEventListener('click', async () => {
  try { await call('stop'); } catch (error) { status.textContent = error.message; }
});
async function init() {
  start.disabled = true;
  stop.disabled = true;
  try {
    const saved = JSON.parse(localStorage.getItem('delay') || 'null');
    if (saved) {
      document.getElementById('min').value = saved.min;
      document.getElementById('max').value = saved.max;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith('https://academy.****.com.vn/')) throw new Error('Hãy mở tab bài học ****.');
    const frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => Boolean(document.querySelector('.cs-listitem.cs-selected[data-ref][data-slide-title]'))
    });
    const matches = frames.filter(frame => frame.result);
    if (matches.length !== 1) throw new Error('Không xác định được duy nhất khung bài học có slide được chọn.');
    target = { tabId: tab.id, frameIds: [matches[0].frameId] };
    await chrome.scripting.executeScript({ target, files: ['runner.js'] });
    await call('status');
    setInterval(() => call('status').catch(error => {
      status.textContent = error.message;
      start.disabled = true;
      stop.disabled = true;
    }), 500);
  } catch (error) { status.textContent = error.message; }
}
void init();
