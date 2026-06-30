#!/usr/bin/env python3
"""Gera banco de questões C/E de Direito Constitucional para Delegado.

O script cria um JSON compatível com a importação local do Metas Estudo,
mantendo itens originalmente Certo/Errado e convertendo alternativas de
múltipla escolha em itens C/E com gabarito.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

DEFAULT_OUTPUT = Path("/mnt/data/banco_questoes_direito_constitucional_delegado_ce_com_gabarito.json")

questions: list[dict[str, Any]] = []


def add_ce(
    grupo: int,
    disciplina: str,
    assunto: str,
    tema: str,
    ano: int,
    orgao: str,
    cargo: str,
    referencia: str,
    enunciado: str,
    gabarito: str,
    banca: str = "CESPE / CEBRASPE",
) -> None:
    questions.append(
        {
            "id": f"constitucional-{grupo:02d}-01",
            "grupo": grupo,
            "item": 1,
            "alternativa_original": None,
            "disciplina": disciplina,
            "assunto": assunto,
            "tema": tema,
            "banca": banca,
            "ano": ano,
            "orgao": orgao,
            "cargo": cargo,
            "referencia": referencia,
            "tipo": "Certo/Errado",
            "origem_tipo": "Certo/Errado original",
            "enunciado": enunciado.strip(),
            "gabarito": gabarito,
            "resposta": gabarito,
            "justificativa": "",
            "fundamento": "",
            "observacoes": "",
            "tags": [disciplina, assunto, tema, "Delegado", "Certo/Errado", "CEBRASPE"],
        }
    )


def add_mc(
    grupo: int,
    disciplina: str,
    assunto: str,
    tema: str,
    ano: int,
    orgao: str,
    cargo: str,
    referencia: str,
    enunciado_base: str,
    alternatives: dict[str, str],
    correct_letter: str,
    banca: str = "CESPE / CEBRASPE",
) -> None:
    letter_order = ["A", "B", "C", "D", "E"]
    for idx, letter in enumerate(letter_order, start=1):
        alt_text = alternatives[letter].strip()
        gabarito = "C" if letter == correct_letter else "E"
        questions.append(
            {
                "id": f"constitucional-{grupo:02d}-{idx:02d}",
                "grupo": grupo,
                "item": idx,
                "alternativa_original": letter,
                "disciplina": disciplina,
                "assunto": assunto,
                "tema": tema,
                "banca": banca,
                "ano": ano,
                "orgao": orgao,
                "cargo": cargo,
                "referencia": referencia,
                "tipo": "Certo/Errado",
                "origem_tipo": "Múltipla escolha convertida em C/E",
                "enunciado": f"{enunciado_base.strip()}\n\nAlternativa {letter}: {alt_text}",
                "gabarito": gabarito,
                "resposta": gabarito,
                "justificativa": "",
                "fundamento": "",
                "observacoes": f"Alternativa correta original: {correct_letter}.",
                "tags": [
                    disciplina,
                    assunto,
                    tema,
                    "Delegado",
                    "Certo/Errado",
                    "CEBRASPE",
                    "Alternativa convertida",
                ],
            }
        )


def build_questions() -> None:
    """Popula a lista global de questões."""
    add_ce(
        1, "Direito Constitucional", "Controle de Constitucionalidade", "Ação Direta de Inconstitucionalidade por Omissão",
        2025, "Polícia Federal", "Delegado de Polícia Federal", "Q3530617",
        "Com base na legislação pertinente e na jurisprudência do STF, julgue o item a seguir, relativos a diversos aspectos do direito constitucional.\n\nNa ADI por omissão, pode o STF, excepcionalmente, em caso de urgência e relevância da matéria, conceder medida cautelar sem a prévia audiência dos órgãos ou das autoridades responsáveis pela omissão inconstitucional.",
        "C",
    )
    add_ce(
        2, "Direito Constitucional", "Direitos Individuais", "Liberdade de imprensa e responsabilidade civil",
        2025, "Polícia Federal", "Delegado de Polícia Federal", "Q3530620",
        "Com base na legislação pertinente e na jurisprudência do STF, julgue o item a seguir, relativos a diversos aspectos do direito constitucional.\n\nConsidere que uma empresa jornalística tenha publicado entrevista na qual o entrevistado tenha imputado falsamente a prática de crime a terceiro, mesmo havendo, à época da divulgação da informação, indícios concretos da falsidade da imputação, de modo que não fora observado o dever de cuidado da veracidade dos fatos. Nessa situação, em razão da proteção constitucional à liberdade de imprensa, a empresa jornalística que publicou a entrevista não será responsabilizada.",
        "E",
    )
    add_ce(
        3, "Direito Constitucional", "Teoria da Constituição", "Conceito de Constituição",
        2025, "Polícia Federal", "Delegado de Polícia Federal", "Q3530627",
        "Julgue o seguinte item, acerca das perspectivas sociológica, política e jurídica do direito constitucional e dos sentidos sociológico, político e jurídico da Constituição.\n\nSegundo a concepção política, a Constituição é um complexo normativo estabelecido de uma só vez, em que, de maneira total, exaustiva e sistemática, são estabelecidas as funções fundamentais do Estado e regulados os órgãos, o âmbito de suas competências e as relações entre eles.",
        "E",
    )
    add_ce(
        4, "Direito Constitucional", "Teoria da Constituição", "Conceito de Constituição",
        2025, "Polícia Federal", "Delegado de Polícia Federal", "Q3530628",
        "Julgue o seguinte item, acerca das perspectivas sociológica, política e jurídica do direito constitucional e dos sentidos sociológico, político e jurídico da Constituição.\n\nO sociologismo constitucional fundamenta-se em afirmações como, por exemplo, a de que a Constituição é imanência das situações e estruturas sociais do presente e a de que a Constituição não se sustenta em uma norma transcendente.",
        "C",
    )
    add_mc(5, "Direito Constitucional", "Organização Político-Administrativa do Estado", "Competência legislativa concorrente", 2025, "PC-CE", "Delegado de Polícia Civil", "Q3383741", "Se determinado estado da Federação publicar lei que trate de procedimento em matéria processual, ela será", {"A": "constitucional, por tratar de matéria legislativa concorrente da União, dos estados e dos municípios.", "B": "inconstitucional, por tratar de matéria de competência legislativa exclusiva da União.", "C": "inconstitucional, por tratar de matéria de competência legislativa concorrente da União e do Distrito Federal.", "D": "constitucional, por tratar de matéria legislativa concorrente da União, dos estados e do Distrito Federal.", "E": "constitucional, caso estabeleça normas específicas sobre o tema e já exista lei da União estabelecendo suas normas gerais."}, "D")
    add_mc(6, "Direito Constitucional", "Direitos Individuais - Remédios Constitucionais e Garantias Processuais", "Mandado de segurança coletivo", 2025, "PC-CE", "Delegado de Polícia Civil", "Q3383746", "A impetração de mandado de segurança coletivo por entidade de classe", {"A": "condiciona-se ao requisito de que a pretensão veiculada seja do interesse de toda a categoria.", "B": "independe de autorização dos seus associados.", "C": "condiciona-se ao requisito de a entidade estar constituída e em funcionamento há pelo menos um ano.", "D": "depende da autorização de 2/3 dos seus associados.", "E": "depende da autorização da maioria absoluta dos seus associados."}, "B")
    add_mc(7, "Direito Constitucional", "Direitos Individuais - Remédios Constitucionais e Garantias Processuais", "Crimes inafiançáveis e imprescritíveis", 2025, "PC-CE", "Delegado de Polícia Civil", "Q3383748", "De acordo com a Constituição Federal de 1988, constitui crime inafiançável e imprescritível, sujeito à pena de reclusão,", {"A": "a ação de grupos armados contra a ordem constitucional.", "B": "o tráfico ilícito de entorpecentes.", "C": "a prática de racismo.", "D": "o terrorismo.", "E": "a prática de tortura."}, "C")
    add_mc(8, "Direito Constitucional", "Defesa do Estado e das Instituições Democráticas", "Forças Armadas e Segurança Pública", 2022, "PC-RJ", "Delegado de Polícia", "Q1891757", "De acordo com o entendimento doutrinário e jurisprudencial dos tribunais superiores, assinale a opção correta.", {"A": "As fundações instituídas pelo Estado ou mantidas pelo poder público não podem se submeter ao regime jurídico de direito privado.", "B": "A Força Nacional de Segurança Pública implica cooperação federativa entre os entes estatais, somente podendo ser empregada em território de estado-membro com a anuência do seu governador.", "C": "É constitucional determinação judicial que decreta a constrição de bens de sociedade de economia mista prestadora de serviços públicos, em regime não concorrencial, para fins de débitos trabalhistas.", "D": "Os serviços sociais autônomos (Sistema S), que desempenham atividade de interesse público, em cooperação com ente estatal, estão sujeitos à observância da regra de concurso público, nos moldes da CF.", "E": "A alienação do controle acionário de empresas públicas e sociedades de economia mista, assim como de suas subsidiárias e controladas, exige autorização legislativa e licitação."}, "B")
    add_mc(9, "Direito Constitucional", "Defesa do Estado e das Instituições Democráticas", "Forças Armadas e Segurança Pública", 2022, "PC-RJ", "Delegado de Polícia", "Q1891760", "Conforme art. 144, § 4.º, da CF, “às polícias civis, dirigidas por delegados de polícia de carreira, incumbem, ressalvada a competência da União, as funções de polícia judiciária e a apuração de infrações penais, exceto as militares”. Em face desse dispositivo e do regime jurídico do poder de polícia, é correto afirmar que", {"A": "lei pode delegar a pessoas jurídicas de direito privado parcelas do exercício do poder de polícia judiciária, segundo jurisprudência recente do Supremo Tribunal Federal.", "B": "razões de interesse público — como urgência para preenchimento de vaga ou necessidade premente de certa investigação de grave crime contra direitos fundamentais — podem justificar a nomeação de comissionada de delegado de polícia.", "C": "delegados de Polícia de carreira podem exercer polícia administrativa.", "D": "a polícia judiciária não se confunde com a polícia administrativa, embora ambas decorram do exercício do poder de império tipicamente estatal, indelegável a entidades privadas.", "E": "o poder de polícia administrativa vem sendo criticado na doutrina como uma reminiscência autoritária do direito administrativo. Por isso, há quem sustente que ele foi substituído pela ideia de regulação ou de ordenação. Esse entendimento foi vitorioso recentemente no caso BH Trans, julgado pelo Superior Tribunal de Justiça."}, "C")
    add_mc(10, "Direito Constitucional", "Organização dos Poderes", "Princípio da Separação dos Poderes", 2022, "PC-RJ", "Delegado de Polícia", "Q1891768", "A Constituição Federal de 1988, em seu art. 2.º, adota a tradicional separação de Poderes. Assim, o legislador constituinte garantiu relativa independência a cada um dos Poderes Legislativo, Executivo e Judiciário, como mecanismo apto a assegurar os fundamentos do Estado democrático de direito. Considerando que as constituições escritas foram concebidas com o objetivo precípuo de fixar instrumentos normativos de limitação do poder estatal, assinale a opção correta.", {"A": "A separação de Poderes está fundamentada no princípio da interdependência funcional: apesar da especialização dos Poderes, existe uma subordinação das funções executiva e jurisdicional ao Poder Legislativo, em razão do que dispõe o art. 1.º da Constituição Federal de 1988, ao estabelecer que a República Federativa do Brasil constitui-se em Estado democrático de direito.", "B": "A especialização funcional confere a cada um dos Poderes do Estado uma função precípua, que a doutrina denomina de função harmônica. Assim, embora o Poder Executivo disponha da função executiva, poderá exercer funções típicas dos Poderes Legislativo e Judiciário, caso haja autorização do Senado Federal, conforme previsto no art. 52 da Constituição Federal de 1988.", "C": "Em razão da necessária harmonia entre os Poderes, o Poder Judiciário exerce sua função típica voltada para a atividade jurisdicional, solucionando as lides que lhe são apresentadas, mas também poderá exercer a função atípica de legislar, contanto que observe as regras do processo legislativo previstas no art. 59 e seguintes da Constituição Federal de 1988.", "D": "Em razão da independência orgânica, os membros do Poder Legislativo gozam das denominadas imunidades parlamentares, com um conjunto de prerrogativas que lhes permitem atuar com independência no exercício da fiscalização do Poder Executivo.", "E": "Em razão do disposto no art. 2.º da Constituição Federal de 1988, tanto a independência orgânica quanto a especialização funcional, típicas da divisão dos Poderes, devem ser exercidas de forma absoluta, afastando-se a possibilidade do exercício das funções chamadas atípicas por qualquer dos Três Poderes."}, "D")
    add_ce(11, "Direito Constitucional", "Controle de Constitucionalidade", "Bloco de constitucionalidade", 2021, "Polícia Federal", "Delegado de Polícia Federal", "Q1751180", "A respeito do controle de constitucionalidade no sistema constitucional brasileiro, julgue o item subsequente.\n\nConforme o conceito de bloco de constitucionalidade, há normas constitucionais não expressamente incluídas no texto da CF que podem servir como paradigma para o exercício de controle de constitucionalidade.", "C")
    add_ce(12, "Direito Constitucional", "Defesa do Estado e das Instituições Democráticas", "Segurança Pública e atribuições da Polícia Federal", 2018, "Polícia Federal", "Delegado de Polícia Federal", "Q932901", "Acerca da disciplina constitucional da segurança pública, do Poder Judiciário, do MP e das atribuições da PF, julgue o seguinte item.\n\nA PF tem competência para apurar infrações penais que causem prejuízos aos interesses da União, ressalvadas aquelas que atinjam órgãos da administração pública indireta no âmbito federal.", "E", banca="CESPE")
    add_mc(13, "Direito Constitucional", "Controle de Constitucionalidade", "Interpretação constitucional", 2018, "PC-MA", "Delegado de Polícia Civil", "Q866701", "Acerca da doutrina e da jurisprudência do STF a respeito das técnicas de interpretação constitucional, julgue os itens a seguir.\n\nI A técnica da interpretação conforme pode ser utilizada tanto no controle de constitucionalidade difuso quanto no abstrato.\nII Como técnica de exegese, a interpretação conforme impõe a decretação da inconstitucionalidade da norma, atendendo à vontade do legislador.\nIII A interpretação constitucional segue os mesmos cânones hermenêuticos da interpretação das demais normas jurídicas.\nIV A declaração de nulidade sem redução de texto gera o vício de inconstitucionalidade da norma e o seu afastamento do mundo jurídico.\n\nEstão certos apenas os itens", {"A": "I e II.", "B": "I e III.", "C": "III e IV.", "D": "I, II e IV.", "E": "II, III e IV."}, "B", banca="CESPE")
    add_mc(14, "Direito Constitucional", "Defesa do Estado e das Instituições Democráticas", "Polícias civis", 2018, "PC-MA", "Delegado de Polícia Civil", "Q866703", "Conforme a CF, às polícias civis, dirigidas por delegados de polícia de carreira, cabe", {"A": "exercer as funções de polícia marítima, aérea e de fronteiras.", "B": "patrulhar ostensivamente as ferrovias federais.", "C": "apurar as infrações penais contra a ordem política e social ou em detrimento de bens, serviços e interesses da União.", "D": "exercer as funções de polícia judiciária e apurar as infrações penais, excetuadas as de natureza militar.", "E": "responder pelo policiamento ostensivo, pela preservação da ordem pública e pela defesa civil."}, "D", banca="CESPE")


def build_payload() -> dict[str, Any]:
    questions.clear()
    build_questions()
    return {
        "schema": "metas-estudo-question-bank-v1",
        "metadata": {
            "titulo": "Banco de questões C/E - Direito Constitucional - Delegado - com gabarito",
            "descricao": "Questões de Direito Constitucional convertidas para formato Certo/Errado, com gabarito, para importação local no Metas Estudo.",
            "fonte": "PDF enviado pelo usuário - Qconcursos",
            "disciplina": "Direito Constitucional",
            "banca_predominante": "CESPE / CEBRASPE",
            "cargo": "Delegado",
            "total_grupos_originais": 14,
            "total_itens_ce": len(questions),
            "com_gabarito": True,
            "sem_gabarito": False,
            "observacao": "Questões de múltipla escolha foram convertidas em itens C/E: a alternativa correta original vira C; as demais viram E. Itens C/E originais foram mantidos como itens únicos.",
        },
        "questionBank": questions,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera banco C/E de Direito Constitucional para Delegado do Metas Estudo."
    )
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = build_payload()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    total = len(questions)
    certos = sum(1 for q in questions if q["gabarito"] == "C")
    errados = sum(1 for q in questions if q["gabarito"] == "E")
    originais_ce = sum(1 for q in questions if q["origem_tipo"] == "Certo/Errado original")
    convertidos = total - originais_ce

    print(f"Arquivo criado: {args.output}")
    print(f"Total de itens C/E: {total}")
    print(f"Itens C: {certos}")
    print(f"Itens E: {errados}")
    print(f"Itens C/E originais: {originais_ce}")
    print(f"Itens convertidos de múltipla escolha: {convertidos}")


if __name__ == "__main__":
    main()
