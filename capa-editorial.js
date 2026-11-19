(() => {
  const tabs = document.querySelector('.banner-tabs');
  const credit = document.querySelector('.banner-credit');
  const slides = [...document.querySelectorAll('.banner-slide')];
  const buttons = [...tabs.querySelectorAll('button')];
  function select(index) {
    slides.forEach((slide, position) => {
      slide.hidden = index !== position;
      buttons[position].setAttribute('aria-pressed', String(index === position));
    });
    const image = slides[index].querySelector('img');
    const caption = document.querySelector('.news-cover img[src="' + image.getAttribute('src') + '"]').closest('figure').querySelector('figcaption');
    credit.replaceChildren(...[...caption.childNodes].map(node => node.cloneNode(true)));
  }
  buttons.forEach((button, index) => button.addEventListener('click', () => select(index)));
  tabs.hidden = false;
  select(0);
})();
