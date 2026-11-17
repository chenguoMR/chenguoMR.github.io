// Local presentation controls. Content is rendered without external data requests.
const isEnglish = document.documentElement.lang.startsWith('en');
const messages = isEnglish ? {
  count: (count, type) => `Showing ${count} ${type === 'research' ? (count === 1 ? 'research area' : 'research areas') : (count === 1 ? 'publication' : 'publications')}`,
  copied: 'Email address copied',
  copyFallback: 'Please select and copy the email address'
} : {
  count: (count, type) => `显示 ${count} ${type === 'research' ? '个研究方向' : '篇论文'}`,
  copied: '邮箱已复制',
  copyFallback: '请选择邮箱地址进行复制'
};
function setupFilter(buttonSelector, itemSelector, buttonKey, itemKey, statusId, type) {
  const buttons = [...document.querySelectorAll(buttonSelector)];
  const items = [...document.querySelectorAll(itemSelector)];
  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset[buttonKey];
    buttons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    items.forEach(item => {
      item.hidden = selected !== 'all' && item.dataset[itemKey] !== selected;
      if (!item.hidden) count++;
    });
    document.querySelector(statusId).textContent = messages.count(count, type);
  }));
}
setupFilter('[data-filter]', '[data-category]', 'filter', 'category', '#filter-status', 'research');
setupFilter('[data-pub-filter]', '[data-pub-group]', 'pubFilter', 'pubGroup', '#publication-status', 'publications');
document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText('chenguo857@163.com');
    status.textContent = messages.copied;
  } catch {
    status.textContent = messages.copyFallback;
  }
});
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const navSections = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const languageLinks = [...document.querySelectorAll('[data-language-link]')];
function syncLanguageLinks() {
  // Preserve the selected section anchor across languages, including when a
  // link is opened in a new tab. Real hrefs also work without JavaScript.
  languageLinks.forEach(link => { link.hash = window.location.hash; });
}
window.addEventListener('hashchange', syncLanguageLinks);
syncLanguageLinks();
let navUpdatePending = false;
function updateActiveSection() {
  const guide = document.querySelector('.site-header').offsetHeight + 70;
  let current = navSections[0];
  navSections.forEach(section => { if (section.getBoundingClientRect().top <= guide) current = section; });
  navLinks.forEach(link => {
    if (current && link.getAttribute('href') === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  navUpdatePending = false;
}
function scheduleNavUpdate() {
  if (navUpdatePending) return;
  navUpdatePending = true;
  requestAnimationFrame(updateActiveSection);
}
window.addEventListener('scroll', scheduleNavUpdate, { passive: true });
window.addEventListener('resize', scheduleNavUpdate);
updateActiveSection();

const figureDialog = document.querySelector('#figure-dialog');
if (figureDialog && typeof figureDialog.showModal === 'function') {
  const figureImage = figureDialog.querySelector('.figure-dialog-image');
  document.querySelectorAll('[data-figure-open]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const card = link.closest('.paper-card');
      const figure = card.querySelector('.paper-figure');
      const original = figure.querySelector('img');
      const source = card.querySelector('.paper-link');
      figureImage.src = original.src;
      figureImage.alt = original.alt;
      figureDialog.querySelector('#figure-dialog-title').textContent = figure.dataset.label;
      figureDialog.querySelector('#figure-paper-title').textContent = card.querySelector('.paper-title').textContent;
      figureDialog.querySelector('#figure-description').textContent = original.alt;
      figureDialog.querySelector('#figure-original').href = link.href;
      const sourceLink = figureDialog.querySelector('#figure-source');
      sourceLink.hidden = !source;
      if (source) sourceLink.href = source.href;
      else sourceLink.removeAttribute('href');
      document.body.classList.add('figure-open');
      figureDialog.showModal();
      figureDialog.scrollTop = 0;
    });
  });
  figureDialog.querySelector('.figure-close').addEventListener('click', () => figureDialog.close());
  figureDialog.addEventListener('click', event => {
    const bounds = figureDialog.getBoundingClientRect();
    if (event.target === figureDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) figureDialog.close();
  });
  figureDialog.addEventListener('close', () => document.body.classList.remove('figure-open'));
}
