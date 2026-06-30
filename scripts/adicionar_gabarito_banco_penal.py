#!/usr/bin/env python3
"""Adiciona gabarito C/E ao banco de questões de Direito Penal.

O script parte do JSON sem gabarito gerado para importação no Metas Estudo e
cria uma nova cópia com os campos ``gabarito`` e ``resposta`` preenchidos.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

CORRECT_LETTERS = {
    1: "D",
    2: "D",
    3: "B",
    4: "D",
    5: "D",
    6: "C",
    7: "C",
    8: "E",
    9: "C",
    10: "E",
    11: "A",
    12: "D",
    13: "D",
    14: "D",
    15: "D",
    16: "D",
    17: "B",
    18: "A",
}

LETTER_BY_ITEM = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}

DEFAULT_INPUT = Path("/mnt/data/banco_questoes_direito_penal_ce_sem_gabarito.json")
DEFAULT_OUTPUT = Path("/mnt/data/banco_questoes_direito_penal_ce_com_gabarito.json")


def add_answer_key(data: dict[str, Any]) -> dict[str, int]:
    """Preenche o gabarito no payload e retorna estatísticas simples."""
    questions = data.get("questionBank")
    if not isinstance(questions, list):
        raise ValueError("O JSON precisa conter uma lista em 'questionBank'.")

    for question in questions:
        group = int(question["grupo"])
        item = int(question["item"])
        answer = "C" if LETTER_BY_ITEM[item] == CORRECT_LETTERS[group] else "E"
        question["gabarito"] = answer
        question["resposta"] = answer

    metadata = data.setdefault("metadata", {})
    metadata["titulo"] = "Banco de questões C/E - Direito Penal - Delegado - com gabarito"
    metadata["descricao"] = (
        "Itens em formato Certo/Errado, com gabarito privado, estruturados "
        "para importação no site Metas Estudo."
    )
    metadata["sem_gabarito"] = False
    metadata["com_gabarito"] = True
    metadata["observacao"] = (
        "Gabarito derivado do gabarito original das questões objetivas do PDF "
        "enviado pelo usuário."
    )

    return {
        "total": len(questions),
        "certos": sum(1 for question in questions if question["gabarito"] == "C"),
        "errados": sum(1 for question in questions if question["gabarito"] == "E"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Adiciona gabarito C/E ao banco de Direito Penal do Metas Estudo."
    )
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = json.loads(args.input.read_text(encoding="utf-8"))
    stats = add_answer_key(data)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Arquivo criado: {args.output}")
    print(f"Total de itens: {stats['total']}")
    print(f"Itens C: {stats['certos']}")
    print(f"Itens E: {stats['errados']}")


if __name__ == "__main__":
    main()
