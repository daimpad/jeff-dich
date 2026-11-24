// Passt iframes mit data-jd-auto-height an die Höhe an, die das Artefakt per postMessage meldet.
(function () {
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'jd-artifact:resize' || typeof data.height !== 'number') return;
    document
      .querySelectorAll('iframe.jd-artifact-frame[data-jd-auto-height]')
      .forEach(function (frame) {
        if (frame.contentWindow !== event.source) return;
        if (new URL(frame.src).origin !== event.origin) return;
        frame.style.height = Math.ceil(data.height) + 'px';
      });
  });
})();
