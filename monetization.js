(() => {
  "use strict";

  let started = false;

  function startFloatingFormats() {
    if (started || !window.aclib) return;
    started = true;
    window.removeEventListener("scroll", handleScroll);

    try {
      window.aclib.runVideoSlider({
        zoneId: "12080358",
      });
    } catch (error) {
      console.warn("Não foi possível iniciar o vídeo publicitário.", error);
    }

    window.setTimeout(() => {
      try {
        window.aclib.runInPagePush({
          zoneId: "12080362",
          maxAds: 2,
        });
      } catch (error) {
        console.warn("Não foi possível iniciar o formato in-page.", error);
      }
    }, 2800);
  }

  function handleScroll() {
    if (window.scrollY >= 420) startFloatingFormats();
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.setTimeout(startFloatingFormats, 8000);
})();
