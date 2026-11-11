/*!
 * Unsupervised Lab — code walkthrough pages
 * Links each line of code to its explanation (hover, focus or tap), copy buttons, maths and table of contents.
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, $$, tocSpy, copyText } = window.UL;

  $$('.nb-cell').forEach((cell) => {
    const notesBox = $('.nb-notes', cell);
    const activate = (id, scrollNote) => {
      $$('[data-note]', cell).forEach((el) => el.classList.toggle('on', el.dataset.note === id));
      if (scrollNote && notesBox && notesBox.scrollHeight > notesBox.clientHeight) {
        const note = $(`.nb-notes li[data-note="${id}"]`, cell);
        if (note) notesBox.scrollTo({ top: note.offsetTop - notesBox.clientHeight / 3, behavior: 'smooth' });
      }
    };
    const clear = () => $$('[data-note].on', cell).forEach((el) => el.classList.remove('on'));
    $$('.code-lines li[data-note]', cell).forEach((li) => {
      li.addEventListener('mouseenter', () => activate(li.dataset.note, true));
      li.addEventListener('focus', () => activate(li.dataset.note, true));
      li.addEventListener('click', () => {
        activate(li.dataset.note, true);
        if (window.matchMedia('(max-width: 960px)').matches) {
          const note = $(`.nb-notes li[data-note="${li.dataset.note}"]`, cell);
          if (note) note.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
    $$('.nb-notes li[data-note]', cell).forEach((li) => {
      li.addEventListener('mouseenter', () => activate(li.dataset.note, false));
      li.addEventListener('click', () => activate(li.dataset.note, false));
    });
    cell.addEventListener('mouseleave', clear);

    const btn = $('.nb-copy', cell);
    if (btn) btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyText(btn.dataset.code);
      btn.textContent = 'Copied ✓';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });

  const all = $('#copy-all');
  if (all) all.addEventListener('click', async () => {
    await copyText($$('.nb-copy').map((b) => b.dataset.code).join('\n\n'));
    all.textContent = 'Copied ✓';
    setTimeout(() => { all.textContent = 'Copy all code'; }, 1500);
  });

  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      ignoredClasses: ['nb-in', 'nb-out'],
      throwOnError: false,
    });
  }
  tocSpy();
})();
