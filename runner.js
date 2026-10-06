(() => {
  if (globalThis.slideHelper) return;
  const state = { running: false, message: 'Chưa chạy.', count: 0 };
  let generation = 0;
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const current = () => document.querySelector('.cs-listitem.cs-selected[data-ref][data-slide-title]');
  const disabled = el => Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled');
  async function wait(ms, token) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (token !== generation) throw new Error('Đã dừng.');
      await new Promise(resolve => setTimeout(resolve, Math.min(200, until - Date.now())));
    }
    if (token !== generation) throw new Error('Đã dừng.');
  }
  function findNext() {
    const labeled = [...document.querySelectorAll('button, [role="button"], a')].filter(el =>
      visible(el) && [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent].some(label =>
        /^(next|next slide|tiếp|tiếp theo|trang tiếp|slide tiếp theo)\s*[›»→]?$/i.test((label || '').trim())));
    const icons = [...document.querySelectorAll('.frame-icon-text')]
      .filter(el => visible(el) && (el.textContent || '').trim().toLocaleUpperCase('vi') === 'TIẾP THEO')
      .map(el => el.closest('button, [role="button"], a') || el.parentElement).filter(el => el && visible(el));
    const matches = [...new Set([...labeled, ...icons])];
    if (matches.length !== 1) throw new Error('Không xác định được duy nhất nút TIẾP THEO.');
    if (disabled(matches[0])) throw new Error('Nút TIẾP THEO đang bị khóa.');
    return matches[0];
  }
  async function run(min, max, token) {
    try {
      while (token === generation) {
        const slide = current();
        if (!slide) throw new Error('Không xác định được slide hiện tại trong menu.');
        const ref = slide.getAttribute('data-ref');
        const title = slide.getAttribute('data-slide-title').trim();
        const ranges = [...document.querySelectorAll('input[type="range"][data-ref="progressBar"]')].filter(visible);
        const finalSlide = title === 'KẾT THÚC KHÓA HỌC';
        if (ranges.length !== 1 && !finalSlide) throw new Error('Không tìm thấy duy nhất thanh tiến trình; slide có thể cần tương tác thủ công.');
        if (ranges.length === 1) {
          const range = ranges[0];
          if (disabled(range)) throw new Error('Thanh tiến trình đang bị khóa.');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, range.max || '100');
          range.dispatchEvent(new Event('input', { bubbles: true }));
          range.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const seconds = min + Math.random() * (max - min);
        state.message = `${title}\nĐã gửi lệnh tua; chờ ${seconds.toFixed(1)} giây trước khi ${finalSlide ? 'dừng' : 'bấm Next'}.\nĐã chuyển ${state.count} slide.`;
        await wait(seconds * 1000, token);
        if (current()?.getAttribute('data-ref') !== ref) throw new Error('Slide thay đổi trong lúc chờ; đã dừng để tránh bấm nhầm.');
        if (finalSlide) {
          state.message = 'Đã đến slide KẾT THÚC KHÓA HỌC và gửi lệnh tua. Hãy kiểm tra trạng thái hoàn thành trên Moodle.';
          break;
        }
        findNext().click();
        let changed = false;
        for (let i = 0; i < 40; i++) {
          await wait(200, token);
          const after = current();
          if (after && after.getAttribute('data-ref') !== ref) { changed = true; break; }
        }
        if (!changed) throw new Error('Bấm Next nhưng chưa chuyển slide; bài học có thể chưa nhận lệnh tua hoặc cần tương tác.');
        state.count++;
        await wait(1000, token);
      }
    } catch (error) {
      if (token === generation) state.message = error.message;
    } finally {
      if (token === generation) state.running = false;
    }
  }
  globalThis.slideHelper = {
    status: () => ({ ...state }),
    start(min, max) {
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < min || max > 3600) throw new Error('Nhập thời gian từ 1–3600 giây, tối đa ≥ tối thiểu.');
      if (state.running) return { ...state };
      state.running = true;
      state.count = 0;
      state.message = 'Đang bắt đầu…';
      void run(min, max, ++generation);
      return { ...state };
    },
    stop() {
      generation++;
      state.running = false;
      state.message = 'Đã dừng.';
      return { ...state };
    }
  };
})();
