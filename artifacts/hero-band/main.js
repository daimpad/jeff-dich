import { mountBand } from '../../shared/band.js';
import { onVisibilityChange } from '../../shared/motion.js';
import { mountVulkanLandschaft } from '../../shared/scenes/vulkan-landschaft.js';

/** Hero: animierte Vulkan-Landschaft, davor die Band, oben die Hauptüberschrift. */
export default function mount(root) {
  root.innerHTML = `
    <section class="hero relative aspect-[16/8] min-h-[30rem] w-full overflow-hidden bg-primary font-sans text-white">
      <div class="landschaft absolute inset-0"></div>
      <header class="absolute inset-x-0 top-[7%] z-10 px-4 text-center">
        <h1 class="font-display text-5xl text-secondary drop-shadow-[0_2px_0_#002808] md:text-7xl">Jeff Dich Festival</h1>
      </header>
      <div class="band absolute inset-x-0 bottom-[3%] z-10 px-2"></div>
    </section>
  `;
  const section = root.querySelector('.hero');
  let scene;
  let band;
  let disposed = false;
  let visible = false;

  mountVulkanLandschaft(root.querySelector('.landschaft')).then((s) => {
    scene = s;
    if (disposed) scene.destroy();
  });
  mountBand(root.querySelector('.band'), {
    height: 'clamp(6.5rem, 25vw, 19rem)',
    gap: 'clamp(0rem, 1vw, 1rem)',
    wrap: false,
  }).then((b) => {
    band = b;
    if (disposed) return band.destroy();
    if (visible) band.play();
  });
  const stopObserving = onVisibilityChange(section, (v) => {
    visible = v;
    if (band) v ? band.play() : band.pause();
  });

  return () => {
    disposed = true;
    stopObserving();
    scene?.destroy();
    band?.destroy();
  };
}
