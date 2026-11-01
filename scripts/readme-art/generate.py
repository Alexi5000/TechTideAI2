import math
import random
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

SANS = "ui-sans-serif, -apple-system, 'Segoe UI', Inter, Helvetica, Arial, sans-serif"
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

BG0 = "#050816"
BG1 = "#0b1230"
INK = "#e8eefc"
MUTED = "#8a97b8"
DIM = "#4b5878"
CARD = "#0e1636"
LINE = "#22305c"
TEAL = "#2de2c5"
VIOLET = "#8b5cf6"
AMBER = "#ffb547"
CORAL = "#ff6b8b"
SKY = "#5cc8ff"
LIME = "#a3e635"

GALAXIES = [
    ("Andromeda", "Product + GTM", "#5cc8ff", ["m32", "m110", "ngc-205", "ngc-221", "pa-1"]),
    ("Milky Way", "Finance + Analytics", "#ffb547", ["sgr-a", "orion", "pleiades", "cygnus-x1", "vela"]),
    ("Triangulum", "Sales", "#2de2c5", ["ngc-588", "ngc-592", "ngc-595", "ngc-598", "ic-133"]),
    ("Centaurus A", "Engineering", "#8b5cf6", ["cena", "cenb", "pscen", "mol001", "mol002"]),
    ("M87", "Compliance", "#ff6b8b", ["m87-jet", "m87-stellar", "m87-globular", "m87-halo", "m87-cusp"]),
    ("Whirlpool", "Marketing", "#38bdf8", ["m51a", "m51b", "ngc-5195", "ic-4277", "ic-4278"]),
    ("Sombrero", "Customer Success", "#fbbf24", ["m104-halo", "m104-disk", "m104-bulge", "m104-globular", "m104-hii"]),
    ("Pinwheel", "HR + People Ops", "#34d399", ["ngc-5447", "ngc-5455", "ngc-5461", "ngc-5462", "hii-101"]),
    ("Cartwheel", "Content + Docs", "#c084fc", ["wheel-ring", "wheel-spoke", "wheel-core", "wheel-companion", "wheel-tail"]),
    ("Circinus", "CS Triage", "#fb7185", ["eso-97-g13", "circinus-x1", "circinus-hii", "circinus-circumnuclear", "circinus-dust"]),
]

REDUCED = "@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def svg(w, h, title, desc, body, style=""):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t d">
  <title id="t">{esc(title)}</title>
  <desc id="d">{esc(desc)}</desc>
  <style>
    .sans {{ font-family: {SANS}; }}
    .mono {{ font-family: {MONO}; }}
    {style}
    {REDUCED}
  </style>
{body}
</svg>
"""


def backdrop(w, h, gid, glow=True):
    g = f"""  <defs>
    <linearGradient id="{gid}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BG0}"/>
      <stop offset="1" stop-color="{BG1}"/>
    </linearGradient>
    <radialGradient id="{gid}-g1" cx="0.12" cy="0.1" r="0.6">
      <stop offset="0" stop-color="{TEAL}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="{TEAL}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="{gid}-g2" cx="0.92" cy="0.95" r="0.6">
      <stop offset="0" stop-color="{VIOLET}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="{VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="{gid}-grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="#ffffff" stroke-opacity="0.035"/>
    </pattern>
  </defs>
  <rect width="{w}" height="{h}" rx="20" fill="url(#{gid}-bg)"/>
  <rect width="{w}" height="{h}" rx="20" fill="url(#{gid}-grid)"/>
"""
    if glow:
        g += f"""  <rect width="{w}" height="{h}" rx="20" fill="url(#{gid}-g1)"/>
  <rect width="{w}" height="{h}" rx="20" fill="url(#{gid}-g2)"/>
"""
    g += f"""  <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" rx="19.5" fill="none" stroke="{LINE}"/>
"""
    return g


def eyebrow(x, y, text, color=TEAL):
    return f'  <text x="{x}" y="{y}" class="mono" font-size="12" letter-spacing="2.4" fill="{color}">{esc(text)}</text>\n'


def hero():
    W, H = 1280, 560
    rnd = random.Random(7)
    stars = []
    for i in range(170):
        x, y = rnd.uniform(8, W - 8), rnd.uniform(8, H - 8)
        r = rnd.choice([0.6, 0.8, 1.0, 1.0, 1.3, 1.7])
        o = rnd.uniform(0.25, 0.85)
        cls = f' class="tw tw{i % 4}"' if i % 5 == 0 else ""
        stars.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#ffffff" fill-opacity="{o:.2f}"{cls}/>')
    cx, cy = 930, 288
    orch = []
    n = len(GALAXIES)
    R1 = 150
    for i, (name, dom, col, _) in enumerate(GALAXIES):
        a = 2 * math.pi * i / n
        x, y = R1 * math.cos(a), R1 * math.sin(a)
        orch.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="{col}" fill-opacity="0.16"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7.5" fill="{col}"/>'
        )
    R2 = 238
    workers = []
    for i in range(50):
        a = 2 * math.pi * i / 50 + 0.06
        x, y = R2 * math.cos(a), R2 * math.sin(a)
        col = GALAXIES[i // 5][2]
        workers.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.4" fill="{col}" fill-opacity="0.95"/>')
    spokes = []
    for i in range(n):
        a = 2 * math.pi * i / n
        spokes.append(f'<line x1="0" y1="0" x2="{R1*math.cos(a):.1f}" y2="{R1*math.sin(a):.1f}" stroke="url(#hero-spoke)" stroke-width="1.2"/>')

    style = f"""
    .tw {{ animation: twinkle 4s ease-in-out infinite; }}
    .tw1 {{ animation-delay: 1s; }} .tw2 {{ animation-delay: 2s; }} .tw3 {{ animation-delay: 3s; }}
    @keyframes twinkle {{ 0%,100% {{ opacity: 1; }} 50% {{ opacity: 0.15; }} }}
    .spin-a {{ animation: spin 90s linear infinite; transform-origin: 0 0; }}
    .spin-b {{ animation: spin 160s linear infinite reverse; transform-origin: 0 0; }}
    .dash {{ animation: dash 6s linear infinite; }}
    @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
    @keyframes dash {{ to {{ stroke-dashoffset: -120; }} }}
    .pulse {{ animation: pulse 3.2s ease-in-out infinite; transform-origin: 0 0; }}
    @keyframes pulse {{ 0%,100% {{ transform: scale(1); opacity: 0.55; }} 50% {{ transform: scale(1.35); opacity: 0.15; }} }}
    """
    body = backdrop(W, H, "hero")
    body += f"""  <defs>
    <linearGradient id="hero-title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{TEAL}"/>
      <stop offset="0.55" stop-color="{SKY}"/>
      <stop offset="1" stop-color="{VIOLET}"/>
    </linearGradient>
    <radialGradient id="hero-core">
      <stop offset="0" stop-color="#fff7e0"/>
      <stop offset="0.35" stop-color="{AMBER}"/>
      <stop offset="1" stop-color="{AMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hero-halo">
      <stop offset="0" stop-color="{VIOLET}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="{VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hero-spoke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{AMBER}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="{SKY}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <g>{''.join(stars)}</g>
  <circle cx="{cx}" cy="{cy}" r="270" fill="url(#hero-halo)"/>
  <g transform="translate({cx} {cy}) scale(1 0.46) rotate(-12)">
    <circle r="{R2}" fill="none" stroke="{LINE}" stroke-width="2"/>
    <circle r="{R1}" fill="none" stroke="{LINE}" stroke-width="2"/>
    <circle r="{R2}" fill="none" stroke="{TEAL}" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="2 18" class="dash"/>
    <g class="spin-b">{''.join(workers)}</g>
    <g class="spin-a">{''.join(spokes)}{''.join(orch)}</g>
  </g>
  <g transform="translate({cx} {cy})">
    <circle r="34" fill="{AMBER}" class="pulse"/>
    <circle r="46" fill="url(#hero-core)"/>
    <circle r="11" fill="#fffaf0"/>
  </g>
  <g class="mono" font-size="11" fill="{MUTED}">
    <text x="{cx}" y="{cy + 150}" text-anchor="middle" fill="{AMBER}" letter-spacing="1.5">LOCAL GROUP DIRECTOR AT THE CORE</text>
    <text x="{cx + 190}" y="{cy - 118}" text-anchor="middle">10 orchestrators</text>
    <text x="{cx - 250}" y="{cy - 118}" text-anchor="middle">50 star-cluster workers</text>
  </g>
"""
    body += eyebrow(72, 112, "AGENT HARNESS  ·  v0.5.5  ·  MIT")
    body += f"""  <text x="70" y="196" class="sans" font-size="76" font-weight="800" letter-spacing="-2.5" fill="url(#hero-title)">TechTideAI</text>
  <g class="sans" font-size="23" fill="{INK}">
    <text x="72" y="250">The harness an FDE ships into a customer,</text>
    <text x="72" y="282">the operators run, and an auditor can replay.</text>
  </g>
  <g class="sans" font-size="15" fill="{MUTED}">
    <text x="72" y="330">Typed TypeScript + Python runtimes. Policy-stamped human approvals.</text>
    <text x="72" y="354">An append-only run ledger. An eval suite that gates regressions.</text>
  </g>
"""
    chips = [("61 agents", AMBER), ("2 runtimes", SKY), ("33 golden tasks", TEAL), ("154 tests", VIOLET)]
    x = 72
    for label, col in chips:
        w = 40 + len(label) * 7.9
        body += f"""  <g transform="translate({x:.0f} 398)">
    <rect width="{w:.0f}" height="34" rx="17" fill="{col}" fill-opacity="0.1" stroke="{col}" stroke-opacity="0.55"/>
    <circle cx="16" cy="17" r="4" fill="{col}"/>
    <text x="28" y="22" class="mono" font-size="13" fill="{INK}">{label}</text>
  </g>
"""
        x += w + 22
    body += f"""  <g class="mono" font-size="12" fill="{DIM}">
    <text x="72" y="490">ship on Monday</text><text x="196" y="490" fill="{LINE}">/</text>
    <text x="214" y="490">defend on Wednesday</text><text x="376" y="490" fill="{LINE}">/</text>
    <text x="394" y="490">replay on Friday</text>
  </g>
"""
    return svg(W, H, "TechTideAI: the agent harness",
               "TechTideAI hero. Left: the name and tagline, the harness an FDE ships into a customer, the operators run, and an auditor can replay. Right: an orbital map with the Local Group Director at the center, ten orchestrator galaxies on the inner ring and fifty star-cluster workers on the outer ring.",
               body, style)


def stats():
    W, H = 1280, 168
    items = [
        ("61", "agents", "1 director + 10 + 50", AMBER),
        ("134", "TypeScript tests", "Vitest · apis, agents, backend", SKY),
        ("20", "Python tests", "pytest + ruff", TEAL),
        ("33", "golden tasks", "golden-tasks.v1", VIOLET),
        ("7", "scorers", "versioned registry", CORAL),
        ("9", "ADRs", "docs/adr/", LIME),
    ]
    body = backdrop(W, H, "st", glow=False)
    gap = 16
    cw = (W - 48 - gap * 5) / 6
    for i, (num, label, sub, col) in enumerate(items):
        x = 24 + i * (cw + gap)
        body += f"""  <g transform="translate({x:.1f} 24)">
    <rect width="{cw:.1f}" height="120" rx="14" fill="{CARD}" stroke="{LINE}"/>
    <rect x="18" y="0" width="44" height="3" rx="1.5" fill="{col}"/>
    <text x="18" y="62" class="sans" font-size="44" font-weight="800" letter-spacing="-1.5" fill="{col}">{num}</text>
    <text x="18" y="88" class="sans" font-size="15" font-weight="600" fill="{INK}">{esc(label)}</text>
    <text x="18" y="107" class="mono" font-size="11" fill="{MUTED}">{esc(sub)}</text>
  </g>
"""
    return svg(W, H, "TechTideAI by the numbers",
               "61 agents (1 director, 10 orchestrators, 50 workers), 134 TypeScript tests, 20 Python tests, 33 golden eval tasks, 7 versioned scorers, 9 architecture decision records.",
               body)


def hierarchy():
    W, H = 1280, 640
    body = backdrop(W, H, "hi")
    style = """
    .flow { stroke-dasharray: 4 8; animation: flow 2.4s linear infinite; }
    @keyframes flow { to { stroke-dashoffset: -24; } }
    """
    body += eyebrow(40, 52, "THE ORG CHART IS THE ARCHITECTURE")
    body += f'  <text x="40" y="84" class="sans" font-size="26" font-weight="700" fill="{INK}">1 director → 10 orchestrators → 50 workers</text>\n'
    body += f'  <text x="1240" y="84" text-anchor="end" class="mono" font-size="12" fill="{MUTED}">asserted in agents/src/core/registry.test.ts</text>\n'
    dx, dy, dw, dh = 640 - 150, 112, 300, 70
    body += f"""  <g transform="translate({dx} {dy})">
    <rect width="{dw}" height="{dh}" rx="14" fill="{AMBER}" fill-opacity="0.1" stroke="{AMBER}" stroke-opacity="0.8"/>
    <circle cx="30" cy="35" r="9" fill="{AMBER}"/>
    <circle cx="30" cy="35" r="16" fill="none" stroke="{AMBER}" stroke-opacity="0.4"/>
    <text x="58" y="31" class="sans" font-size="17" font-weight="700" fill="{INK}">Local Group Director</text>
    <text x="58" y="52" class="mono" font-size="12" fill="{MUTED}">id: ceo · routes tasks to leads</text>
  </g>
"""
    n = len(GALAXIES)
    margin = 28
    gap = 10
    cw = (W - 2 * margin - gap * (n - 1)) / n
    oy = 262
    for i, (name, dom, col, ws) in enumerate(GALAXIES):
        x = margin + i * (cw + gap)
        mx = x + cw / 2
        body += f'  <path d="M640 {dy+dh} C640 {dy+dh+45}, {mx:.1f} {oy-45}, {mx:.1f} {oy}" fill="none" stroke="{col}" stroke-opacity="0.55" stroke-width="1.5" class="flow"/>\n'
        body += f"""  <g transform="translate({x:.1f} {oy})">
    <rect width="{cw:.1f}" height="76" rx="12" fill="{CARD}" stroke="{col}" stroke-opacity="0.7"/>
    <rect x="12" y="12" width="10" height="10" rx="5" fill="{col}"/>
    <text x="28" y="22" class="sans" font-size="13" font-weight="700" fill="{INK}">{esc(name)}</text>
    <text x="12" y="44" class="sans" font-size="11" fill="{col}">{esc(dom)}</text>
    <text x="12" y="62" class="mono" font-size="9.5" fill="{DIM}">orch-{name.lower().replace(' ', '-')}</text>
  </g>
"""
        for j, w in enumerate(ws):
            wy = oy + 104 + j * 46
            label = w if len(w) <= 15 else w[:14] + "…"
            body += f'  <line x1="{mx:.1f}" y1="{wy-10 if j else oy+76}" x2="{mx:.1f}" y2="{wy}" stroke="{col}" stroke-opacity="0.35"/>\n'
            body += f"""  <g transform="translate({x+6:.1f} {wy})">
    <rect width="{cw-12:.1f}" height="30" rx="15" fill="{col}" fill-opacity="0.08" stroke="{col}" stroke-opacity="0.35"/>
    <circle cx="14" cy="15" r="3.5" fill="{col}"/>
    <text x="24" y="19" class="mono" font-size="10" fill="{INK}">{esc(label)}</text>
  </g>
"""
    return svg(W, H, "TechTideAI agent hierarchy",
               "The Local Group Director routes work to ten galaxy orchestrators: " +
               "; ".join(f"{g[0]} ({g[1]})" for g in GALAXIES) +
               ". Each orchestrator leads five star-cluster workers, fifty in total.",
               body, style)


def node(x, y, w, h, title, sub, col, sub2=None):
    s = f"""  <g transform="translate({x} {y})">
    <rect width="{w}" height="{h}" rx="14" fill="{CARD}" stroke="{col}" stroke-opacity="0.75"/>
    <rect x="0" y="{h/2-14}" width="3" height="28" rx="1.5" fill="{col}"/>
    <text x="18" y="{h/2-4 if sub2 else h/2-2}" class="sans" font-size="15" font-weight="700" fill="{INK}">{esc(title)}</text>
    <text x="18" y="{h/2+15 if sub2 else h/2+17}" class="mono" font-size="11" fill="{MUTED}">{esc(sub)}</text>
"""
    if sub2:
        s += f'    <text x="18" y="{h/2+31}" class="mono" font-size="11" fill="{col}">{esc(sub2)}</text>\n'
    return s + "  </g>\n"


def arrowdefs(gid, cols):
    s = "  <defs>\n"
    for name, c in cols.items():
        s += f'    <marker id="{gid}-{name}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{c}"/></marker>\n'
    return s + "  </defs>\n"


def request_flow():
    W, H = 1280, 520
    style = """
    .run { stroke-dasharray: 6 10; animation: run 1.6s linear infinite; }
    @keyframes run { to { stroke-dashoffset: -32; } }
    .tick { animation: tick 2.8s ease-in-out infinite; }
    .tick1 { animation-delay: .4s; } .tick2 { animation-delay: .8s; } .tick3 { animation-delay: 1.2s; } .tick4 { animation-delay: 1.6s; }
    @keyframes tick { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
    """
    body = backdrop(W, H, "rf")
    body += arrowdefs("rf", {"t": TEAL, "c": CORAL, "a": AMBER, "m": MUTED})
    body += eyebrow(40, 52, "ONE REQUEST, END TO END")
    body += f'  <text x="40" y="84" class="sans" font-size="26" font-weight="700" fill="{INK}">Every hop is typed. Every state change is written down.</text>\n'
    y, h, w = 140, 92, 200
    xs = [40, 290, 540, 790, 1040]
    nodes = [
        ("Operator console", "frontend/ · :5180", SKY, "React + Vite"),
        ("Fastify API", "backend/ · :4050", TEAL, "Zod-validated routes"),
        ("Risk classifier", "approval-service.ts", AMBER, "tier → gate or go"),
        ("Agent runtime", "Mastra (TS)", VIOLET, "LangGraph sidecar :4051"),
        ("Model providers", "apis/ · LLMProvider", CORAL, "OpenAI · Anthropic"),
    ]
    for x, (t, s, c, s2) in zip(xs, nodes):
        body += node(x, y, w, h, t, s, c, s2)
    for i in range(4):
        x1 = xs[i] + w + 4
        x2 = xs[i + 1] - 6
        body += f'  <line x1="{x1}" y1="{y+h/2}" x2="{x2}" y2="{y+h/2}" stroke="{TEAL}" stroke-width="2" class="run" marker-end="url(#rf-t)"/>\n'
    gx, gy, gw, gh = 470, 292, 340, 96
    body += f'  <path d="M{xs[2]+w/2} {y+h+4} V{gy-6}" stroke="{AMBER}" stroke-width="2" fill="none" stroke-dasharray="5 6" marker-end="url(#rf-a)"/>\n'
    body += f'  <text x="{xs[2]+w/2+12}" y="{y+h+34}" class="mono" font-size="11" fill="{AMBER}">external · destructive · billing</text>\n'
    body += f"""  <g transform="translate({gx} {gy})">
    <rect width="{gw}" height="{gh}" rx="14" fill="{AMBER}" fill-opacity="0.08" stroke="{AMBER}" stroke-opacity="0.8" stroke-dasharray="6 4"/>
    <text x="20" y="32" class="sans" font-size="16" font-weight="700" fill="{INK}">Human approval gate</text>
    <text x="20" y="54" class="mono" font-size="11" fill="{MUTED}">run waits · operator grants or denies</text>
    <text x="20" y="74" class="mono" font-size="11" fill="{AMBER}">decision stamped with policyVersion</text>
  </g>
"""
    body += f'  <path d="M{gx+gw+4} {gy+gh/2} H{xs[3]+w/2} V{y+h+6}" stroke="{TEAL}" stroke-width="2" fill="none" marker-end="url(#rf-t)"/>\n'
    body += f'  <text x="{gx+gw+16}" y="{gy+gh/2-8}" class="mono" font-size="11" fill="{TEAL}">granted → resume</text>\n'
    body += f'  <path d="M{gx-4} {gy+gh/2} H{262}" stroke="{CORAL}" stroke-width="2" fill="none" marker-end="url(#rf-c)"/>\n'
    body += f'  <text x="{gx-14}" y="{gy+gh/2-10}" text-anchor="end" class="mono" font-size="11" fill="{CORAL}">denied</text>\n'
    body += f'  <g transform="translate(70 {gy+gh/2-24})"><rect width="186" height="48" rx="24" fill="{CORAL}" fill-opacity="0.1" stroke="{CORAL}"/><text x="93" y="21" text-anchor="middle" class="mono" font-size="13" font-weight="700" fill="{INK}">run.failed</text><text x="93" y="37" text-anchor="middle" class="mono" font-size="10" fill="{CORAL}">reason kept</text></g>\n'
    ly = 440
    body += f"""  <g transform="translate(40 {ly})">
    <rect width="1200" height="52" rx="12" fill="#0a1029" stroke="{LINE}"/>
    <text x="20" y="22" class="sans" font-size="14" font-weight="700" fill="{INK}">run_events</text>
    <text x="20" y="40" class="mono" font-size="11" fill="{MUTED}">append-only ledger in Supabase · OpenTelemetry spans alongside</text>
"""
    labels = ["run.created", "approval.requested", "agent.tool_call", "run.completed"]
    for i, lab in enumerate(labels):
        tx = 440 + i * 192
        body += f'    <g class="tick tick{i+1}"><rect x="{tx}" y="14" width="{len(lab)*7.2+24:.0f}" height="24" rx="12" fill="{TEAL}" fill-opacity="0.12" stroke="{TEAL}" stroke-opacity="0.5"/><text x="{tx+12}" y="30" class="mono" font-size="11" fill="{TEAL}">{lab}</text></g>\n'
    body += "  </g>\n"
    for i in [3, 4]:
        sx = xs[i] + w / 2
        body += f'  <line x1="{sx}" y1="{y+h+4}" x2="{sx}" y2="{ly-4}" stroke="{DIM}" stroke-dasharray="2 5"/>\n'
    return svg(W, H, "TechTideAI request flow",
               "An operator request goes from the React console to the Fastify API, through the risk classifier, to the Mastra or LangGraph runtime and on to OpenAI or Anthropic. High-risk tiers (external, destructive, billing) pause at a human approval gate; granted runs resume, denied runs fail with the reason kept. Every step writes to the append-only run_events ledger.",
               body, style)


def planes():
    W, H = 1280, 470
    body = backdrop(W, H, "pl")
    style = """
    .beam { animation: beam 3s ease-in-out infinite; }
    @keyframes beam { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -60; } }
    """
    body += eyebrow(40, 52, "FOUR PLANES")
    body += f'  <text x="40" y="84" class="sans" font-size="26" font-weight="700" fill="{INK}">Who decides, who acts, what is recorded, who watches.</text>\n'
    rows = [
        ("Product", "Operator console: agents, runs, evals, approvals, sprints", "frontend/src/pages/", SKY),
        ("Control", "Director + orchestrators, dispatch, risk classification", "agents/src/core/registry.ts", AMBER),
        ("Execution", "Workers, tool calls, Mastra + LangGraph runtimes", "agents/src/mastra/ · agents/python/", VIOLET),
        ("Evidence", "run_events, traces, evals, post-mortems", "backend/src/services/trace-service.ts", TEAL),
    ]
    top = 120
    rh = 70
    for i, (name, what, path, col) in enumerate(rows):
        y = top + i * (rh + 14)
        skew = 26
        x0 = 210
        x1 = 1240
        body += f'  <path d="M{x0+skew} {y} H{x1} L{x1-skew} {y+rh} H{x0} Z" fill="{col}" fill-opacity="0.08" stroke="{col}" stroke-opacity="0.6"/>\n'
        body += f'  <text x="40" y="{y+30}" class="sans" font-size="20" font-weight="800" fill="{col}">{name}</text>\n'
        body += f'  <text x="40" y="{y+52}" class="mono" font-size="11" fill="{DIM}">plane {i+1} / 4</text>\n'
        body += f'  <text x="{x0+48}" y="{y+31}" class="sans" font-size="15" fill="{INK}">{esc(what)}</text>\n'
        body += f'  <text x="{x0+48}" y="{y+52}" class="mono" font-size="11" fill="{MUTED}">{esc(path)}</text>\n'
    bx = 1130
    body += f'  <line x1="{bx}" y1="{top-6}" x2="{bx}" y2="{top+4*(rh+14)-8}" stroke="{TEAL}" stroke-width="2" stroke-dasharray="10 20" class="beam"/>\n'
    for i in range(4):
        body += f'  <circle cx="{bx-13*0}" cy="{top+i*(rh+14)+rh/2}" r="5" fill="{BG0}" stroke="{TEAL}" stroke-width="2"/>\n'
    body += f'  <text x="1240" y="84" text-anchor="end" class="mono" font-size="11" fill="{TEAL}">one trace id through every plane</text>\n'
    return svg(W, H, "TechTideAI four planes",
               "Product plane: the operator console. Control plane: the director and orchestrators, dispatch and risk classification. Execution plane: workers, tool calls, Mastra and LangGraph runtimes. Evidence plane: run_events, traces, evals and post-mortems. One trace id runs through all four.",
               body, style)


def lifecycle():
    W, H = 1280, 380
    body = backdrop(W, H, "lc")
    body += arrowdefs("lc", {"t": TEAL, "c": CORAL, "a": AMBER, "m": MUTED, "g": LIME})
    body += eyebrow(40, 52, "RUN LIFECYCLE")
    body += f'  <text x="40" y="84" class="sans" font-size="26" font-weight="700" fill="{INK}">Legal transitions live in one policy. Extend it, never edit it.</text>\n'

    def pill(x, y, w, label, col, sub=None):
        s = f'  <g transform="translate({x} {y})"><rect width="{w}" height="54" rx="27" fill="{col}" fill-opacity="0.1" stroke="{col}" stroke-opacity="0.85"/><text x="{w/2}" y="{26 if sub else 33}" text-anchor="middle" class="mono" font-size="14" font-weight="700" fill="{INK}">{label}</text>'
        if sub:
            s += f'<text x="{w/2}" y="42" text-anchor="middle" class="mono" font-size="10" fill="{col}">{sub}</text>'
        return s + "</g>\n"

    y = 170
    body += pill(40, y, 150, "queued", SKY, "run.created")
    body += f'  <g transform="translate(250 {y-3})"><path d="M30 0 L60 30 L30 60 L0 30 Z" fill="{AMBER}" fill-opacity="0.12" stroke="{AMBER}"/><text x="30" y="35" text-anchor="middle" class="mono" font-size="11" fill="{AMBER}">risk</text></g>\n'
    body += f'  <line x1="194" y1="{y+27}" x2="246" y2="{y+27}" stroke="{MUTED}" stroke-width="2" marker-end="url(#lc-m)"/>\n'
    body += pill(400, y, 170, "running", VIOLET, "run.started")
    body += f'  <line x1="314" y1="{y+27}" x2="396" y2="{y+27}" stroke="{TEAL}" stroke-width="2" marker-end="url(#lc-t)"/>\n'
    body += f'  <text x="355" y="{y+18}" text-anchor="middle" class="mono" font-size="10" fill="{TEAL}">low risk</text>\n'
    body += pill(240, 285, 230, "awaiting approval", AMBER, "run.awaiting-approval")
    body += f'  <path d="M280 {y+60} V281" stroke="{AMBER}" stroke-width="2" fill="none" marker-end="url(#lc-a)"/>\n'
    body += f'  <path d="M474 312 H485 V{y+58}" stroke="{TEAL}" stroke-width="2" fill="none" marker-end="url(#lc-t)"/>\n'
    body += f'  <text x="495" y="300" class="mono" font-size="10" fill="{TEAL}">approval.granted</text>\n'
    body += pill(760, 118, 180, "succeeded", LIME, "run.completed")
    body += pill(760, 222, 180, "failed", CORAL, "run.failed")
    body += pill(1040, 170, 180, "canceled", MUTED, "run.canceled")
    body += f'  <path d="M574 {y+20} C660 {y+20}, 680 145, 756 145" stroke="{LIME}" stroke-width="2" fill="none" marker-end="url(#lc-g)"/>\n'
    body += f'  <path d="M574 {y+34} C660 {y+34}, 680 249, 756 249" stroke="{CORAL}" stroke-width="2" fill="none" marker-end="url(#lc-c)"/>\n'
    body += f'  <path d="M474 330 H800 V280" stroke="{CORAL}" stroke-width="2" fill="none" stroke-dasharray="5 5" marker-end="url(#lc-c)"/>\n'
    body += f'  <text x="560" y="348" class="mono" font-size="10" fill="{CORAL}">approval.denied → failed, reason kept</text>\n'
    body += f'  <path d="M944 197 H1036" stroke="{MUTED}" stroke-width="2" fill="none" stroke-dasharray="3 5" marker-end="url(#lc-m)"/>\n'
    body += f'  <text x="1130" y="246" text-anchor="middle" class="mono" font-size="10" fill="{MUTED}">from queued or running</text>\n'
    body += f'  <text x="1240" y="350" text-anchor="end" class="mono" font-size="11" fill="{DIM}">backend/src/domain/policies/status-transition-policy.ts</text>\n'
    return svg(W, H, "TechTideAI run lifecycle",
               "A run is created queued. The risk classifier either starts it (running) or holds it awaiting approval. Granted approvals resume the run; denied approvals fail it with the reason kept. Running ends in succeeded or failed. Queued or running runs can be canceled. Terminal states have no outgoing transitions.",
               body)


def eval_loop():
    W, H = 1280, 460
    style = """
    .orbit { stroke-dasharray: 8 10; animation: orb 3s linear infinite; }
    @keyframes orb { to { stroke-dashoffset: -36; } }
    """
    body = backdrop(W, H, "ev")
    body += arrowdefs("ev", {"t": TEAL, "v": VIOLET, "m": MUTED})
    body += eyebrow(40, 52, "EVALS ARE THE REGRESSION DASHBOARD")
    body += f'  <text x="40" y="84" class="sans" font-size="26" font-weight="700" fill="{INK}">Two loops: a golden suite that gates, a sprint harness that converges.</text>\n'
    px, py, pw, ph = 40, 120, 520, 300
    body += f"""  <g transform="translate({px} {py})">
    <rect width="{pw}" height="{ph}" rx="16" fill="{CARD}" stroke="{LINE}"/>
    <text x="24" y="38" class="sans" font-size="17" font-weight="700" fill="{INK}">Golden suite</text>
    <text x="24" y="58" class="mono" font-size="11" fill="{MUTED}">evals/fixtures/golden-tasks.v1.json</text>
"""
    rows = [("33", "tasks across the director + all 10 orchestrators", VIOLET),
            ("7", "scorers: exact-match, regex, json-schema, llm-judge,", TEAL),
            ("", "rubric-weighted, four-axis-grader, plateau", TEAL),
            ("5%", "pass-rate drop vs. frozen baseline fails the gate", AMBER),
            ("1", "post-mortem written per failing run", CORAL)]
    ry = 100
    for num, txt, col in rows:
        if num:
            body += f'    <text x="24" y="{ry}" class="sans" font-size="24" font-weight="800" fill="{col}">{num}</text>\n'
        body += f'    <text x="84" y="{ry-4}" class="sans" font-size="13" fill="{INK}">{esc(txt)}</text>\n'
        ry += 34 if num else 40
    body += f'    <text x="24" y="{ph-22}" class="mono" font-size="11" fill="{DIM}">pnpm -C backend evals --suite golden-tasks.v1</text>\n  </g>\n'
    cx, cy, r = 860, 270, 112
    body += f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{VIOLET}" stroke-opacity="0.6" stroke-width="2" class="orbit"/>\n'
    pts = [("Generator", -90, SKY), ("Evaluator", 30, TEAL), ("Judge (opt.)", 150, VIOLET)]
    for lab, deg, col in pts:
        a = math.radians(deg)
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        w = 132
        body += f'  <g transform="translate({x-w/2:.1f} {y-20:.1f})"><rect width="{w}" height="40" rx="20" fill="{BG0}" stroke="{col}"/><text x="{w/2}" y="25" text-anchor="middle" class="sans" font-size="13" font-weight="700" fill="{INK}">{lab}</text></g>\n'
    body += f'  <text x="{cx}" y="{cy-4}" text-anchor="middle" class="sans" font-size="15" font-weight="700" fill="{INK}">sprint loop</text>\n'
    body += f'  <text x="{cx}" y="{cy+16}" text-anchor="middle" class="mono" font-size="10" fill="{MUTED}">plateau detector watches</text>\n'
    body += f'  <text x="{cx}" y="{cy+30}" text-anchor="middle" class="mono" font-size="10" fill="{MUTED}">the rolling score delta</text>\n'
    outs = [("succeeded", LIME), ("plateau", AMBER), ("max-iterations", SKY), ("errored", CORAL)]
    for i, (lab, col) in enumerate(outs):
        oy = 150 + i * 62
        body += f'  <path d="M{cx+r+4} {cy} C{cx+r+80} {cy}, {cx+r+70} {oy+18}, {1060} {oy+18}" fill="none" stroke="{col}" stroke-opacity="0.75" stroke-width="1.5"/>\n'
        body += f'  <g transform="translate(1064 {oy})"><rect width="176" height="36" rx="18" fill="{col}" fill-opacity="0.1" stroke="{col}"/><text x="88" y="23" text-anchor="middle" class="mono" font-size="12" fill="{INK}">{lab}</text></g>\n'
    body += f'  <text x="{cx}" y="430" text-anchor="middle" class="mono" font-size="11" fill="{DIM}">backend/src/services/three-agent-harness.ts</text>\n'
    return svg(W, H, "TechTideAI evaluation loops",
               "Left: the golden suite, 33 tasks scored by 7 versioned scorers; a pass-rate drop of 5 percent or more against the frozen baseline fails the gate and writes a post-mortem. Right: the three-agent sprint loop of generator, evaluator and optional judge, ending in succeeded, plateau, max-iterations or errored.",
               body, style)


def contract():
    W, H = 1280, 300
    style = """
    .sync { stroke-dasharray: 6 8; animation: sy 1.8s linear infinite; }
    @keyframes sy { to { stroke-dashoffset: -28; } }
    """
    body = backdrop(W, H, "ct")
    body += arrowdefs("ct", {"t": TEAL})
    body += eyebrow(40, 52, "ONE CONTRACT, TWO RUNTIMES")
    body += f'  <text x="40" y="84" class="sans" font-size="26" font-weight="700" fill="{INK}">TypeScript and Python never drift apart.</text>\n'
    body += node(40, 140, 300, 100, "contracts/schema.json", "single source of truth", AMBER, "edit only this file")
    body += node(490, 140, 300, 100, "scripts/sync-contracts.ts", "generates both sides", TEAL, "FNV-1a drift hash")
    body += node(940, 112, 300, 72, "TypeScript types", "agents/src/runtime/…generated.ts", SKY)
    body += node(940, 196, 300, 72, "Pydantic models", "techtide_agents/contracts/generated.py", VIOLET)
    body += f'  <line x1="344" y1="190" x2="484" y2="190" stroke="{TEAL}" stroke-width="2" class="sync" marker-end="url(#ct-t)"/>\n'
    body += f'  <path d="M794 175 C870 175, 870 148, 934 148" stroke="{TEAL}" stroke-width="2" fill="none" class="sync" marker-end="url(#ct-t)"/>\n'
    body += f'  <path d="M794 205 C870 205, 870 232, 934 232" stroke="{TEAL}" stroke-width="2" fill="none" class="sync" marker-end="url(#ct-t)"/>\n'
    body += f'  <text x="1240" y="286" text-anchor="end" class="mono" font-size="11" fill="{DIM}">same hash stamped on both sides · hand edits fail CI</text>\n'
    return svg(W, H, "TechTideAI contract sync",
               "contracts/schema.json is the single source of truth. scripts/sync-contracts.ts generates the TypeScript types and the Pydantic models and stamps the same FNV-1a drift hash on both; hand edits fail CI.",
               body, style)


def footer():
    W, H = 1280, 200
    body = backdrop(W, H, "ft")
    cols = [("SHIP", "on Monday", "the FDE installs the harness", SKY),
            ("DEFEND", "on Wednesday", "the operator explains a decision", AMBER),
            ("REPLAY", "on Friday", "the auditor re-runs the record", TEAL)]
    cw = 1200 / 3
    for i, (a, b, c, col) in enumerate(cols):
        x = 40 + i * cw
        body += f'  <text x="{x+24}" y="88" class="sans"><tspan font-size="34" font-weight="800" letter-spacing="-1" fill="{col}">{a}</tspan><tspan dx="12" font-size="20" fill="{INK}">{b}</tspan></text>\n'
        body += f'  <text x="{x+24}" y="118" class="mono" font-size="12" fill="{MUTED}">{c}</text>\n'
        if i:
            body += f'  <line x1="{x}" y1="56" x2="{x}" y2="132" stroke="{LINE}"/>\n'
    body += f'  <text x="640" y="172" text-anchor="middle" class="mono" font-size="11" letter-spacing="2" fill="{DIM}">ALL THREE SHOULD AGREE ON WHAT HAPPENED</text>\n'
    return svg(W, H, "Ship, defend, replay",
               "Ship on Monday: the FDE installs the harness. Defend on Wednesday: the operator explains a decision. Replay on Friday: the auditor re-runs the record. All three should agree on what happened.",
               body)


files = {
    "hero.svg": hero(),
    "stats.svg": stats(),
    "hierarchy.svg": hierarchy(),
    "request-flow.svg": request_flow(),
    "planes.svg": planes(),
    "lifecycle.svg": lifecycle(),
    "evals.svg": eval_loop(),
    "contract.svg": contract(),
    "footer.svg": footer(),
}
for name, content in files.items():
    (OUT / name).write_text(content)
    print(OUT / name, len(content))
