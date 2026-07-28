export function createParticleSystem() {
  return {
    particles: [],
  };
}

export function spawnBurst(sys, x, y, rgb, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    sys.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 25 + Math.floor(Math.random() * 20),
      maxLife: 45,
      size: 3 + Math.random() * 5,
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
    });
  }
}

export function updateParticles(sys) {
  for (let i = sys.particles.length - 1; i >= 0; i--) {
    const p = sys.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    if (p.life <= 0) sys.particles.splice(i, 1);
  }
}

export function drawParticles(p5, sys) {
  p5.noStroke();
  for (const p of sys.particles) {
    const a = Math.floor((p.life / p.maxLife) * 220);
    p5.fill(p.r, p.g, p.b, a);
    p5.ellipse(p.x, p.y, p.size, p.size);
  }
}
