import { mountVulkanLandschaft } from '../../shared/scenes/vulkan-landschaft.js';

/** Nur der animierte Hintergrund – z. B. für einen Divi-Abschnitt mit eigenem Inhalt darüber. */
export default function mount(root) {
  root.innerHTML = `<section class="relative aspect-[16/7] min-h-[26rem] w-full overflow-hidden bg-primary"></section>`;
  let scene;
  let disposed = false;
  mountVulkanLandschaft(root.querySelector('section')).then((s) => {
    scene = s;
    if (disposed) scene.destroy();
  });
  return () => {
    disposed = true;
    scene?.destroy();
  };
}
