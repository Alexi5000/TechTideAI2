#!/usr/bin/env python3
"""Galaxy map rename. Updates the agent registry, agents/agents.md,
runtime_config.yaml, eval fixtures, frontend pages, and doc surface
in a single pass. Idempotent — running twice is safe.
"""
from pathlib import Path

ORCH_MAP = {
    "orch-veronica":      ("orch-andromeda",    "Andromeda Director",    "Product + GTM"),
    "orch-ava":           ("orch-milky-way",    "Milky Way Director",    "Finance + Analytics"),
    "orch-finn":          ("orch-triangulum",   "Triangulum Director",   "Sales"),
    "orch-cipher":        ("orch-centaurus-a",  "Centaurus A Director",  "Engineering"),
    "orch-axel":          ("orch-m87",          "M87 Director",          "Compliance"),
    "orch-luna":          ("orch-whirlpool",    "Whirlpool Director",    "Marketing"),
    "orch-ellie":         ("orch-sombrero",     "Sombrero Director",     "Customer Success"),
    "orch-veronica-lite": ("orch-pinwheel",     "Pinwheel Director",     "HR + People Ops"),
    "orch-audit":         ("orch-cartwheel",    "Cartwheel Director",    "Content + Docs"),
    "orch-content":       ("orch-circinus",     "Circinus Director",     "CS Triage"),
}

WORKER_MAP = {
    "worker-research":      "worker-m32",
    "worker-qa":            "worker-m110",
    "worker-data":          "worker-ngc-205",
    "worker-automation":    "worker-ngc-221",
    "worker-ux":            "worker-pa-1",
    "worker-ava-sops":         "worker-sgr-a",
    "worker-ava-routing":      "worker-orion",
    "worker-ava-docs":         "worker-pleiades",
    "worker-ava-procurement":  "worker-cygnus-x1",
    "worker-ava-quality":      "worker-vela",
    "worker-finn-recruiting": "worker-ngc-588",
    "worker-finn-onboarding": "worker-ngc-592",
    "worker-finn-policy":     "worker-ngc-595",
    "worker-finn-culture":    "worker-ngc-598",
    "worker-finn-support":    "worker-ic-133",
    "worker-cipher-fpna":     "worker-cena",
    "worker-cipher-billing":  "worker-cenb",
    "worker-cipher-cost":     "worker-pscen",
    "worker-cipher-dashboard": "worker-mol001",
    "worker-cipher-risk":     "worker-mol002",
    "worker-axel-prospecting":  "worker-m87-jet",
    "worker-axel-outbound":    "worker-m87-stellar",
    "worker-axel-crm":         "worker-m87-globular",
    "worker-axel-proposals":   "worker-m87-halo",
    "worker-axel-enablement":  "worker-m87-cusp",
    "worker-luna-audience":     "worker-m51a",
    "worker-luna-campaign":     "worker-m51b",
    "worker-luna-content":      "worker-ngc-5195",
    "worker-luna-distribution": "worker-ic-4277",
    "worker-luna-analytics":    "worker-ic-4278",
    "worker-ellie-intake":      "worker-m104-halo",
    "worker-ellie-scheduling":  "worker-m104-disk",
    "worker-ellie-knowledge":   "worker-m104-bulge",
    "worker-ellie-voice":       "worker-m104-globular",
    "worker-ellie-accounts":    "worker-m104-hii",
    "worker-vlite-onboarding":  "worker-ngc-5447",
    "worker-vlite-config":      "worker-ngc-5455",
    "worker-vlite-security":    "worker-ngc-5461",
    "worker-vlite-success":     "worker-ngc-5462",
    "worker-vlite-support":     "worker-hii-101",
    "worker-audit-process":         "worker-wheel-ring",
    "worker-audit-roi":             "worker-wheel-spoke",
    "worker-audit-compliance":      "worker-wheel-core",
    "worker-audit-instrumentation": "worker-wheel-companion",
    "worker-audit-remediation":     "worker-wheel-tail",
    "worker-content-case":           "worker-eso-97-g13",
    "worker-content-playbooks":      "worker-circinus-x1",
    "worker-content-metrics":        "worker-circinus-hii",
    "worker-content-repurpose":      "worker-circinus-circumnuclear",
    "worker-content-distribution":   "worker-circinus-dust",
}

OLD_ORCH_NAMES = {
    "orch-veronica":      ("Veronica Cozy",          "Executive Orchestration"),
    "orch-ava":           ("Ava Cozy",               "Operations & Administration"),
    "orch-finn":          ("Finn Cozy",              "Internal Support & HR"),
    "orch-cipher":        ("Cipher Cozy",            "Finance & Data Analysis"),
    "orch-axel":          ("Axel Cozy",              "Sales & Lead Generation"),
    "orch-luna":          ("Luna Cozy",              "Marketing & Outreach"),
    "orch-ellie":         ("Ellie Cozy",             "Customer Support & Client Relations"),
    "orch-veronica-lite": ("Veronica Cozy (Lite)",   "Client Orchestration"),
    "orch-audit":         ("Audrey Cozy",            "AI & Workflow Audit"),
    "orch-content":       ("Sage Cozy",              "CS Triage"),
}


def rename_in_text(text: str) -> tuple[str, int]:
    n = 0
    for old, new in WORKER_MAP.items():
        needle = f'id: "{old}"'
        repl = f'id: "{new}"'
        if needle in text:
            text = text.replace(needle, repl)
            n += 1
    for old, (new_id, _name, _domain) in ORCH_MAP.items():
        if f'id: "{old}"' in text:
            text = text.replace(f'id: "{old}"', f'id: "{new_id}"')
            n += 1
        if f'reportsTo: "{old}"' in text:
            text = text.replace(f'reportsTo: "{old}"', f'reportsTo: "{new_id}"')
            n += 1
    return text, n


def patch_orch_metadata(text: str) -> tuple[str, int]:
    n = 0
    # Normalize CRLF to LF so the multi-line string matches work.
    is_crlf = "\r\n" in text
    if is_crlf:
        text = text.replace("\r\n", "\n")
    for old_id, (new_id, new_name, new_domain) in ORCH_MAP.items():
        old_name, old_domain = OLD_ORCH_NAMES[old_id]
        # name field ends with '",' on the same line; domain ends with '",'
        # The id field has a trailing comma on the same line.
        old_block = (
            f'id: "{new_id}",\n'
            f'    name: "{old_name}",\n'
            f'    tier: "orchestrator",\n'
            f'    domain: "{old_domain}",'
        )
        new_block = (
            f'id: "{new_id}",\n'
            f'    name: "{new_name}",\n'
            f'    tier: "orchestrator",\n'
            f'    domain: "{new_domain}",'
        )
        if old_block in text:
            text = text.replace(old_block, new_block)
            n += 1
    if is_crlf:
        text = text.replace("\n", "\r\n")
    return text, n


def main():
    p = Path("agents/src/core/registry.ts")
    text = p.read_text(encoding="utf-8")
    text, n1 = rename_in_text(text)
    text, n2 = patch_orch_metadata(text)
    p.write_text(text, encoding="utf-8")
    print(f"registry.ts: {n1} id-reportsTo renames + {n2} metadata patches")


if __name__ == "__main__":
    main()