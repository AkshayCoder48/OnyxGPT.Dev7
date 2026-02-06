const ADJECTIVES = [
  'Ethereal', 'Quantum', 'Nebula', 'Glitch', 'Cyber', 'Lumina', 'Zenith', 'Phantom',
  'Aura', 'Velocity', 'Hyper', 'Sonic', 'Omega', 'Prism', 'Flux', 'Solar', 'Void',
  'Titan', 'Neon', 'Cosmic', 'Pulse', 'Cipher', 'Logic', 'Dynamic', 'Stable'
];

const NOUNS = [
  'Architect', 'Engine', 'Node', 'Nexus', 'Protocol', 'Matrix', 'System', 'Core',
  'Vision', 'Grid', 'Vertex', 'Sphere', 'Orbit', 'Pulse', 'Wave', 'Signal', 'Bridge',
  'Flow', 'Sync', 'Link', 'Dash', 'Stack', 'Port', 'Shell', 'Module'
];

export function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${adj} ${noun} ${suffix}`;
}
