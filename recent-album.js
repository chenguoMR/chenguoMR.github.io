(() => {
  const stage = document.querySelector('[data-photo-album]');
  if (!stage) return;
  const covers = Array.from(stage.querySelectorAll('.album-cover'));
  const count = covers.length;
  if (count !== 5) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const english = document.documentElement.lang === 'en';
  const actions = english
    ? ['Go back two photos', 'Previous photo', '', 'Next photo', 'Go forward two photos']
    : ['向前切换两张', '上一张', '', '下一张', '向后切换两张'];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const wrap = value => value - count * Math.floor(value / count + 0.5);

  let position = 0;
  let target = 0;
  let velocity = 0;
  let frame = 0;
  let previousTime = 0;
  let timer;
  let paused = reducedMotion.matches;
  let inView = false;
  let pointer = null;
  let ignoreClickUntil = 0;

  function draw() {
    covers.forEach((cover, index) => {
      const offset = wrap(index - position);
      const distance = Math.abs(offset);
      const x = 82 * Math.tanh(offset * 0.95) + offset;
      const yaw = -79 * Math.tanh(offset * 1.35);
      const scale = 1 - 0.185 * (1 - Math.exp(-distance * distance * 0.9));
      // The rearmost sleeve disappears at the edge before re-entering on the other side.
      const edge = clamp((2.47 - distance) / 0.43, 0, 1);
      cover.style.transform = `translate(-50%, -50%) translateX(${x}%) perspective(750px) rotateY(${yaw}deg) scale(${scale})`;
      cover.style.zIndex = String(1000 - Math.round(distance * 100));
      cover.style.opacity = String(edge * edge * (3 - 2 * edge));
    });
  }

  function updateControls() {
    const hadFocus = stage.contains(document.activeElement);
    covers.forEach((cover, index) => {
      const slot = wrap(index - target);
      const active = slot === 0;
      const toggle = english
        ? (paused ? 'Resume slideshow' : 'Pause slideshow')
        : (paused ? '继续轮播' : '暂停轮播');
      cover.dataset.slot = String(slot);
      cover.tabIndex = active ? 0 : -1;
      cover.setAttribute('aria-label', cover.dataset.photoLabel + ' · ' + (active ? toggle : actions[slot + 2]));
      if (hadFocus && active && document.activeElement !== cover) cover.focus({preventScroll: true});
    });
  }

  function schedule() {
    clearTimeout(timer);
    if (!paused && inView && !document.hidden && !pointer) {
      timer = setTimeout(() => goTo(target + 1), 5000);
    }
  }

  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    delete stage.dataset.moving;
  }

  function animate(now) {
    const dt = Math.max(0, (now - previousTime) / 1000);
    previousTime = now;
    // A critically damped spring keeps its speed when a tap changes the destination.
    const spring = 10.5;
    const gap = position - target;
    const slope = velocity + spring * gap;
    const decay = Math.exp(-spring * dt);
    position = target + (gap + slope * dt) * decay;
    velocity = (velocity - spring * slope * dt) * decay;
    if (Math.abs(position - target) < 0.001 && Math.abs(velocity) < 0.012) {
      position = target;
      velocity = 0;
      stopFrame();
    } else {
      frame = requestAnimationFrame(animate);
    }
    draw();
  }

  function goTo(next) {
    target = next;
    if (reducedMotion.matches || document.hidden) {
      stopFrame();
      position = target;
      velocity = 0;
      draw();
    } else if (!frame) {
      stage.dataset.moving = '';
      previousTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
    updateControls();
    schedule();
  }

  covers.forEach((cover, index) => {
    cover.addEventListener('click', event => {
      if (event.detail && performance.now() < ignoreClickUntil) return;
      const step = wrap(index - target);
      if (step) return goTo(target + step);
      paused = !paused;
      updateControls();
      schedule();
    });
  });
  stage.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    goTo(target + (event.key === 'ArrowRight' ? 1 : -1));
  });

  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    clearTimeout(timer);
    ignoreClickUntil = 0;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false};
  });
  window.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer?.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) >= Math.abs(dx)) { pointer = null; schedule(); return; }
      stopFrame();
      pointer.dragging = true;
      pointer.origin = position;
      pointer.stride = Math.max(90, stage.clientWidth * 0.42);
      pointer.time = event.timeStamp;
      velocity = 0;
      stage.dataset.dragging = stage.dataset.moving = '';
      stage.setPointerCapture(event.pointerId);
    }
    const next = pointer.origin - dx / pointer.stride;
    const elapsed = (event.timeStamp - pointer.time) / 1000;
    if (elapsed > 0) {
      const speed = clamp((next - position) / elapsed, -5, 5);
      velocity += (speed - velocity) * (1 - Math.exp(-elapsed / 0.035));
    }
    pointer.time = event.timeStamp;
    position = next;
    draw();
  });
  function release(event) {
    if (event.pointerId !== pointer?.id) return;
    const drag = pointer;
    pointer = null;
    if (!drag.dragging) { schedule(); return; }
    delete stage.dataset.dragging;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    ignoreClickUntil = performance.now() + 400;
    if (event.timeStamp - drag.time > 90 || event.type === 'pointercancel') velocity = 0;
    const travel = position - drag.origin;
    let next = Math.round(position + clamp(velocity * 0.12, -0.55, 0.55));
    if (event.type !== 'pointercancel' && next === Math.round(drag.origin) && Math.abs(travel) > 0.23) {
      next += Math.sign(travel);
    }
    goTo(next);
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    goTo(target);
  });
  draw();
  updateControls();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; schedule(); }).observe(stage);
  } else {
    inView = true;
    schedule();
  }
})();
