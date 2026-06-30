#!/usr/bin/env python3
"""Combina bancos de questões C/E de Penal e Constitucional.

O script lê os bancos com gabarito gerados em ``/mnt/data`` e cria um único
JSON compatível com a importação local no Metas Estudo. O arquivo gerado é
privado e não deve ser versionado no repositório.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

DEFAULT_PENAL_INPUT = Path("/mnt/data/banco_questoes_direito_penal_ce_com_gabarito.json")
DEFAULT_CONSTITUCIONAL_INPUT = Path(
    "/mnt/data/banco_questoes_direito_constitucional_delegado_ce_com_gabarito.json"
)
DEFAULT_OUTPUT = Path(
    "/mnt/data/banco_questoes_combinado_penal_constitucional_ce_com_gabarito.json"
)


def load_question_bank(path: Path, label: str) -> dict[str, Any]:
    """Carrega e valida minimamente um banco de questões."""
    if not path.exists():
        raise FileNotFoundError(f"Não encontrei o arquivo de {label} em {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("questionBank"), list):
        raise ValueError(f"O arquivo de {label} precisa conter a lista 'questionBank'.")
    return data


def combine_banks(penal: dict[str, Any], constitucional: dict[str, Any]) -> dict[str, Any]:
    """Combina os bancos mantendo IDs únicos em caso de colisão inesperada."""
    items: list[dict[str, Any]] = []
    seen: set[str] = set()

    for source in (penal.get("questionBank", []), constitucional.get("questionBank", [])):
        for question in source:
            item = dict(question)
            question_id = str(item.get("id", ""))
            if question_id in seen:
                item["id"] = f"{question_id}-dup"
            seen.add(str(item.get("id", "")))
            items.append(item)

    return {
        "schema": "metas-estudo-question-bank-v1",
        "metadata": {
            "titulo": "Banco combinado C/E - Penal + Constitucional - Delegado - com gabarito",
            "descricao": "Banco combinado para importação local no Metas Estudo.",
            "fontes": [
                penal.get("metadata", {}).get("titulo", "Direito Penal"),
                constitucional.get("metadata", {}).get("titulo", "Direito Constitucional"),
            ],
            "disciplinas": ["Direito Penal", "Direito Constitucional"],
            "total_itens_ce": len(items),
            "com_gabarito": True,
            "sem_gabarito": False,
            "observacao": (
                "Arquivo combinado para evitar importação separada. "
                "Não deve ser publicado no GitHub."
            ),
        },
        "questionBank": items,
    }


def print_summary(items: list[dict[str, Any]], output: Path) -> None:
    """Exibe estatísticas simples do arquivo combinado."""
    disc_count = Counter(
        item.get("disciplina") or item.get("discipline") or "Sem disciplina" for item in items
    )
    gab_count = Counter(item.get("gabarito") or item.get("resposta") or "" for item in items)

    print(f"Arquivo criado: {output}")
    print(f"Total de itens: {len(items)}")
    print("Por disciplina:")
    for discipline, count in disc_count.items():
        print(f"- {discipline}: {count}")
    print("Por gabarito:")
    for answer, count in gab_count.items():
        print(f"- {answer}: {count}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Combina bancos C/E de Penal e Constitucional com gabarito."
    )
    parser.add_argument("penal", nargs="?", type=Path, default=DEFAULT_PENAL_INPUT)
    parser.add_argument(
        "constitucional", nargs="?", type=Path, default=DEFAULT_CONSTITUCIONAL_INPUT
    )
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    penal = load_question_bank(args.penal, "Penal")
    constitucional = load_question_bank(args.constitucional, "Constitucional")
    combined = combine_banks(penal, constitucional)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")
    print_summary(combined["questionBank"], args.output)


if __name__ == "__main__":
    main()
