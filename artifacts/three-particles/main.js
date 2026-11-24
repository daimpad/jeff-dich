import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';
import { onVisibilityChange, prefersReducedMotion } from '../../shared/motion.js';

const COUNT = 4000;

export default function mount(root) {
  root.innerHTML = `
    <section class="relative h-[28rem] overflow-hidden bg-primary font-sans text-white">
      <canvas class="absolute inset-0 size-full"></canvas>
      <div class="pointer-events-none relative grid h-full place-items-center p-8 text-center">
        <h1 class="font-display text-5xl text-secondary md:text-7xl">Jeff Dich Festival</h1>
      </div>
    </section>
  `;

  const section = root.querySelector('section');
  const canvas = root.querySelector('canvas');

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 6;

  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // gleichmäßig in einer Kugelschale verteilt
    const r = 2 + Math.random() * 2.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.set(
      [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
      i * 3,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  // CI: Gold mit einzelnen Lila-Punkten
  const gold = new Color('#e9b628');
  const lila = new Color('#8300e9');
  const colors = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) (Math.random() < 0.15 ? lila : gold).toArray(colors, i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    vertexColors: true,
    size: 0.03,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const points = new Points(geometry, material);
  scene.add(points);

  const pointer = { x: 0, y: 0 };
  const onPointerMove = (e) => {
    const rect = section.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  };
  section.addEventListener('pointermove', onPointerMove);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = section;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(section);

  const still = prefersReducedMotion();
  let frame = 0;
  const tick = () => {
    points.rotation.y += 0.0015;
    points.rotation.x += (pointer.y * 0.3 - points.rotation.x) * 0.03;
    points.rotation.z += (pointer.x * 0.2 - points.rotation.z) * 0.03;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  const stopObserving = onVisibilityChange(section, (visible) => {
    cancelAnimationFrame(frame);
    if (visible && !still) frame = requestAnimationFrame(tick);
  });

  return () => {
    cancelAnimationFrame(frame);
    stopObserving();
    ro.disconnect();
    section.removeEventListener('pointermove', onPointerMove);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
