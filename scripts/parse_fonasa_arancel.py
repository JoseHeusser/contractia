#!/usr/bin/env python3
"""
Parsea el Libro Arancel FONASA MLE (PDF) a un JSON estructurado para cargarlo
como tabla de consulta exacta (no RAG). Requiere `pdftotext` (poppler).

Uso:
    python3 parse_fonasa_arancel.py "../../knowledge/1-Libro-Arancel-MLE-2026.pdf" fonasa_arancel.json
"""
import json
import re
import subprocess
import sys

CODE_RE = re.compile(r"^(\d{2})\s(\d{2})\s(\d{3})\s+(.*)$")
NUM = r"\d{1,3}(?:\.\d{3})*"
TRAILING_NUMS_RE = re.compile(rf"((?:\s+{NUM}){{1,6}})\s*$")
GRUPO_RE = re.compile(r"GRUPO\s*:\s*(\d+)")


def to_int(tok: str):
    return int(tok.replace(".", "")) if tok else None


def parse(pdf_path: str):
    txt = subprocess.run(
        ["pdftotext", "-layout", pdf_path, "-"],
        capture_output=True, text=True, check=True,
    ).stdout

    rows = []
    grupo = None
    last = None  # fila previa para anexar líneas de continuación

    for raw in txt.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue

        g = GRUPO_RE.search(line)
        if g:
            grupo = g.group(1)
            last = None
            continue

        m = CODE_RE.match(line.strip())
        if m:
            cc, gg, nnn, rest = m.groups()
            codigo = f"{cc} {gg} {nnn}"
            valores = []
            tn = TRAILING_NUMS_RE.search(rest)
            if tn:
                valores = [to_int(t) for t in tn.group(1).split()]
                rest = rest[: tn.start()].strip()
            denominacion = re.sub(r"\s+", " ", rest).strip()
            # Mapear hasta 3 niveles (total, benef)
            niveles = {}
            labels = ["n1_total", "n1_benef", "n2_total", "n2_benef", "n3_total", "n3_benef"]
            for i, v in enumerate(valores[:6]):
                niveles[labels[i]] = v
            row = {
                "codigo": codigo,
                "codigo_norm": cc + gg + nnn,
                "grupo": grupo,
                "denominacion": denominacion,
                **niveles,
            }
            rows.append(row)
            last = row
        else:
            # Línea de continuación de la denominación anterior (sin código)
            cont = line.strip()
            # Ignorar encabezados de columnas / secciones obvias
            if last and not re.search(r"NIVEL|DENOMINACI|C[ÓO]DIGO|PRESTC", cont, re.I):
                # Solo anexar si parece texto (no una tabla suelta de números)
                if not re.fullmatch(rf"(?:{NUM}\s*)+", cont):
                    last["denominacion"] = (last["denominacion"] + " " + cont).strip()
    return rows


if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else "../../knowledge/1-Libro-Arancel-MLE-2026.pdf"
    out = sys.argv[2] if len(sys.argv) > 2 else "fonasa_arancel.json"
    data = parse(pdf)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    con_valor = sum(1 for r in data if r.get("n1_total"))
    print(f"Prestaciones parseadas: {len(data)} (con valor nivel 1: {con_valor})")
    print("Ejemplos:")
    for r in data[:3] + data[-2:]:
        print(" ", r["codigo"], "—", r["denominacion"][:60], "| n1_benef:", r.get("n1_benef"))
