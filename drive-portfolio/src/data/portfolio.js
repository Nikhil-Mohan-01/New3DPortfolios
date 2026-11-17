// Single source of truth for portfolio content.
// Edit here — both the 3D posters and the HTML detail panel read from this file.

export const profile = {
  name: 'Nikhil Mohan',
  role: 'Software & ML Engineer',
  school: 'Computer Science @ University of Waterloo',
  tagline: 'I build AI agents, computer-vision systems, and real-time apps.',
  links: {
    github: 'https://github.com/Nikhil-Mohan-01',
    linkedin: 'https://www.linkedin.com/in/nikhil-mohan-7787372a6/',
    email: 'mailto:nikhilmohan2007@gmail.com',
  },
};

export const experience = [
  {
    id: 'lges',
    company: 'LG Energy Solution',
    role: 'Cybersecurity & Software Engineer Intern',
    url: 'https://www.lgensol.com/en/index',
    blurb: 'Cybersecurity and software engineering at one of the world\'s largest EV-battery makers.',
  },
  {
    id: 'paraverse',
    company: 'Paraverse Studios',
    role: 'Junior Software Engineer',
    url: 'https://paraversestudio.com',
    blurb: 'Software engineering on the studio\'s game projects.',
  },
  {
    id: 'codeninjas',
    company: 'Code Ninjas',
    role: 'Code Instructor (Sensei)',
    url: 'https://www.codeninjas.com/',
    blurb: 'Taught kids to code as a Sensei.',
  },
];

export const education = [
  {
    id: 'uw',
    name: 'University of Waterloo',
    detail: "Bachelor's of Computer Science",
  },
  {
    id: 'shad',
    name: "Shad '24",
    detail: 'National enrichment program — innovation, teamwork, and rapid prototyping.',
  },
];

// Only the SWE / MLE-relevant projects.
export const projects = [
  {
    id: 'protomind',
    title: 'ProtoMind',
    kicker: 'AI Agents · Hardware Prototyping',
    summary:
      'Turns a natural-language hardware idea into CAD geometry, Arduino firmware, parts info, and verification artifacts.',
    bullets: [
      'LangGraph workflow orchestrating decomposition, CAD, firmware, sourcing, and verification',
      'CAD, firmware, and sourcing stages run in parallel after spec decomposition',
      'Generates OpenSCAD geometry with STL compilation and an automatic repair pass',
      'Geometric stability checks with bounded CAD-regeneration retries',
    ],
    stack: ['Python', 'LangGraph', 'LangChain', 'OpenSCAD', 'FastAPI', 'Docker'],
    link: { label: 'GitHub', url: 'https://github.com/Nikhil-Mohan-01/ProtoMind' },
    color: '#ff2e88',
  },
  {
    id: 'router',
    title: 'Smart Model Router',
    kicker: 'Developer Tools · AI',
    summary:
      'VS Code extension that routes Copilot Chat requests to the right model by task type, preference, and daily budget.',
    bullets: [
      'Classifies requests: debugging, generation, architecture, explanation, testing',
      'Picks providers from preferences, available credentials, and spend limits',
      'Streams responses from multiple providers',
      'Usage dashboard with token/cost estimates; keys kept in VS Code Secret Storage',
    ],
    stack: ['TypeScript', 'VS Code API', 'REST APIs'],
    link: { label: 'GitHub', url: 'https://github.com/Nikhil-Mohan-01/smart-model-router' },
    color: '#22d3ee',
  },
  {
    id: 'rankedpicker',
    title: 'RankedPicker',
    kicker: 'Recommendation Systems · Real-time',
    summary:
      'Brawl Stars draft assistant combining roster, map, and team-composition data to recommend picks and bans.',
    bullets: [
      'Explainable recommendations: score components, sample confidence, missing evidence',
      'Shared drafting rooms with synced picks/bans, undo/edit, and reconnects',
      'Ingestion pipeline aggregating map, synergy, and matchup statistics',
      'Synthetic-data demo mode that runs without API credentials',
    ],
    stack: ['TypeScript', 'Next.js', 'Fastify', 'PostgreSQL', 'Redis', 'BullMQ', 'WebSockets'],
    link: null,
    color: '#facc15',
  },
  {
    id: 'sightline',
    title: 'SightLine Pro',
    kicker: 'Accessibility · Computer Vision',
    summary:
      'Mobile + cloud AI that helps visually impaired users understand their surroundings with hazard detection and spoken guidance.',
    bullets: [
      'Multimodal ML to analyse the surrounding environment',
      'Hazard identification and environmental-risk assessment',
      'Spoken feedback for real-time guidance',
      'Built on Hugging Face models and external data APIs',
    ],
    stack: ['Hugging Face', 'Multimodal ML', 'Mobile', 'Cloud'],
    link: { label: 'GitHub', url: 'https://github.com/Nikhil-Mohan-01/sightline-pro' },
    color: '#a3e635',
  },
  {
    id: 'muaythai',
    title: 'Muay Thai Quest',
    kicker: 'Computer Vision · Games',
    summary:
      'Gamified Muay Thai trainer that uses computer vision to check your form and lets you fight virtual opponents.',
    bullets: [
      'Computer vision helps you practise and correct your form',
      'Strike practice against virtual opponents — land enough to score the KO',
      'Blends martial-arts drills with game mechanics',
    ],
    stack: ['Computer Vision', 'Pose Estimation', 'Web'],
    link: null,
    color: '#f97316',
  },
  {
    id: 'turret',
    title: 'Autonomous Turret',
    kicker: 'Computer Vision · Hardware',
    summary:
      'Pose-estimating turret that tracks body and face positions in real time on a physical prototype.',
    bullets: [
      'MediaPipe + DeepFace for body and face position detection',
      'OpenCV vision pipeline driving the hardware',
      'Applies core ML / CV concepts to a real device',
    ],
    stack: ['Python', 'C/C++', 'OpenCV', 'MediaPipe', 'DeepFace'],
    link: { label: 'Watch demo', url: 'https://youtu.be/HA06y33xMFA' },
    link2: { label: 'GitHub', url: 'https://github.com/Nikhil-Mohan-01/Pose-Estimation-Autonomous-Turret' },
    color: '#ef4444',
  },
  {
    id: 'speed',
    title: 'Online Speed',
    kicker: 'Multiplayer · Real-time Systems',
    summary: 'Real-time multiplayer version of the card game Speed with a server-authoritative game state.',
    bullets: [
      'Socket.IO keeps every client in sync',
      'Server-authoritative game state and synchronisation',
      'React + Vite frontend with Tailwind and Framer Motion; Docker + Google Cloud',
    ],
    stack: ['Node.js', 'Express', 'Socket.IO', 'React', 'Docker', 'GCP'],
    link: null,
    color: '#818cf8',
  },
  {
    id: 'activity',
    title: 'Activity Center',
    kicker: 'Mobile · Social Discovery',
    summary:
      'Group hangout planner — friends join a session by code and swipe on nearby places until the group matches.',
    bullets: [
      'Sessions with invite codes, synced live through Firebase',
      'Swipeable cards for restaurants, attractions, and activities',
      'Google Places for locations and photos; shows group matches',
    ],
    stack: ['React Native', 'TypeScript', 'Expo', 'Firebase', 'Google Places'],
    link: { label: 'GitHub', url: 'https://github.com/Nikhil-Mohan-01/Activity-Center' },
    color: '#2dd4bf',
  },
  {
    id: 'cubehero',
    title: 'Cube Hero Odyssey',
    kicker: 'Game Dev · Shipped on Steam',
    summary: '3D hack-and-slash roguelite with a caped hero, monster combat, and creative builds.',
    bullets: ['Collaborative project released on Steam', 'Played by 7,000+ players'],
    stack: ['Unity3D', 'C#', 'Blender', 'Git'],
    link: { label: 'Steam', url: 'https://store.steampowered.com/app/2954730/Cube_Hero_Odyssey/' },
    color: '#38bdf8',
  },
];
