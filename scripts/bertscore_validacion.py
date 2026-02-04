#!/usr/bin/env python3
"""
Calcula BERTScore a partir del archivo output/validacion-llm-ultimo.json.

Modos:
  --modo entre_modelos   Gemini vs Hugging Face (ref/candidato entre modelos)
  --modo autoconsistencia  Cada modelo consigo mismo (run1 vs run2; requiere VALIDAR_AUTOCONSISTENCIA_LLM=true)

Uso:
  pip install bert-score
  python scripts/bertscore_validacion.py --modo autoconsistencia   # solo Gemini y solo HF (cada uno consigo mismo)
  python scripts/bertscore_validacion.py --modo entre_modelos      # Gemini vs HF (--ref gemini | hf | ambos)

Guarda el resultado en output/bertscore-resultado.json
"""

import argparse
import json
import sys
from pathlib import Path

# Raíz del proyecto (carpeta que contiene output/ y scripts/)
ROOT = Path(__file__).resolve().parent.parent
INPUT_FILE = ROOT / "output" / "validacion-llm-ultimo.json"
OUTPUT_FILE = ROOT / "output" / "bertscore-resultado.json"


def texto_desde_respuesta(obj):
    """Convierte respuesta (objeto o string) a un único string para BERTScore."""
    if obj is None:
        return ""
    if isinstance(obj, str):
        return obj.strip()
    return json.dumps(obj, ensure_ascii=False, sort_keys=True).strip()


def parse_args():
    p = argparse.ArgumentParser(description="BERTScore: validación Gemini / Hugging Face")
    p.add_argument(
        "--modo",
        choices=["entre_modelos", "autoconsistencia"],
        default="autoconsistencia",
        help="entre_modelos: Gemini vs HF. autoconsistencia: cada modelo consigo mismo (run1 vs run2)",
    )
    p.add_argument(
        "--ref",
        choices=["gemini", "hf", "ambos"],
        default="ambos",
        help="Solo si --modo entre_modelos: quién es referencia (gemini, hf, ambos)",
    )
    p.add_argument(
        "--input",
        "-i",
        default=None,
        help="Ruta al JSON de entrada (por defecto: output/validacion-llm-ultimo.json). Ej: output/validacion-llm-ultimo(Prueba1).json",
    )
    return p.parse_args()


def main():
    args = parse_args()

    input_path = Path(args.input) if args.input else INPUT_FILE
    if not input_path.is_absolute():
        input_path = ROOT / input_path
    if not input_path.exists():
        print(f"No se encontró: {input_path}")
        print("Ejecuta primero el test ICO (y con VALIDAR_AUTOCONSISTENCIA_LLM=true para autoconsistencia).")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Ayuda para depurar: mostrar qué claves tiene el archivo
    claves = list(data.keys())
    print(f"Archivo leído: {input_path.name}")
    print(f"Claves en el JSON: {', '.join(claves)}")

    try:
        from bert_score import score
    except ImportError:
        print("Instala bert-score: pip install bert-score")
        sys.exit(1)

    def run_bertscore(ref_list, cand_list):
        return score(
            cand_list,
            ref_list,
            lang="en",
            model_type="bert-base-uncased",
            verbose=False,
        )

    resultado = {"timestamp": data.get("timestamp"), "modo": args.modo}

    if args.modo == "autoconsistencia":
        # Cada modelo consigo mismo: run1 vs run2
        gemini1 = texto_desde_respuesta(data.get("respuestaGemini"))
        gemini2 = texto_desde_respuesta(data.get("respuestaGemini2"))
        hf1 = texto_desde_respuesta(data.get("validacionHuggingface"))
        hf2 = texto_desde_respuesta(data.get("validacionHuggingface2"))

        if gemini1 and gemini2:
            P, R, F1 = run_bertscore([gemini1], [gemini2])
            resultado["gemini_autoconsistencia"] = {
                "descripcion": "Gemini consigo mismo (run1 vs run2)",
                "precision": float(P[0]),
                "recall": float(R[0]),
                "f1": float(F1[0]),
            }
            print("Validación: solo Gemini (autoconsistencia, run1 vs run2)")
            print(f"  Precision: {resultado['gemini_autoconsistencia']['precision']:.4f}")
            print(f"  Recall:    {resultado['gemini_autoconsistencia']['recall']:.4f}")
            print(f"  F1:       {resultado['gemini_autoconsistencia']['f1']:.4f}")
        else:
            tiene_g1 = bool(gemini1)
            tiene_g2 = bool(gemini2)
            print("No se pudo calcular autoconsistencia de Gemini.")
            if not tiene_g1:
                print("  - respuestaGemini está vacío o no existe en el JSON.")
            if not tiene_g2:
                print("  - respuestaGemini2 está vacío o es null. Pon VALIDAR_AUTOCONSISTENCIA_LLM=true en .env, reinicia el servidor y vuelve a hacer el test ICO para que se guarde la segunda llamada a Gemini.")

        if hf1 and hf2:
            P, R, F1 = run_bertscore([hf1], [hf2])
            resultado["huggingface_autoconsistencia"] = {
                "descripcion": "Hugging Face consigo mismo (run1 vs run2)",
                "precision": float(P[0]),
                "recall": float(R[0]),
                "f1": float(F1[0]),
            }
            print("Validación: solo Hugging Face (autoconsistencia, run1 vs run2)")
            print(f"  Precision: {resultado['huggingface_autoconsistencia']['precision']:.4f}")
            print(f"  Recall:    {resultado['huggingface_autoconsistencia']['recall']:.4f}")
            print(f"  F1:       {resultado['huggingface_autoconsistencia']['f1']:.4f}")
        else:
            print("No se pudo calcular autoconsistencia de Hugging Face (validacionHuggingface2 vacío o null). Activa USE_HUGGINGFACE_VALIDATION=true y VALIDAR_AUTOCONSISTENCIA_LLM=true, reinicia y vuelve a hacer el test ICO.")

        if not resultado.get("gemini_autoconsistencia") and not resultado.get("huggingface_autoconsistencia"):
            sys.exit(1)

    else:
        # Entre modelos: Gemini vs Hugging Face
        gemini_text = texto_desde_respuesta(data.get("respuestaGemini"))
        hf_text = texto_desde_respuesta(data.get("validacionHuggingface"))

        if not gemini_text or not hf_text:
            print("Una de las respuestas está vacía. No se puede calcular BERTScore entre modelos.")
            sys.exit(1)

        if args.ref in ("gemini", "ambos"):
            P, R, F1 = run_bertscore([gemini_text], [hf_text])
            resultado["solo_gemini_referencia"] = {
                "referencia": "Gemini",
                "candidato": "Hugging Face",
                "precision": float(P[0]),
                "recall": float(R[0]),
                "f1": float(F1[0]),
            }
        if args.ref in ("hf", "ambos"):
            P, R, F1 = run_bertscore([hf_text], [gemini_text])
            resultado["solo_huggingface_referencia"] = {
                "referencia": "Hugging Face",
                "candidato": "Gemini",
                "precision": float(P[0]),
                "recall": float(R[0]),
                "f1": float(F1[0]),
            }
        print("Validación entre modelos (Gemini vs Hugging Face)")
        if "solo_gemini_referencia" in resultado:
            print(f"  Gemini como ref, HF como candidato — F1: {resultado['solo_gemini_referencia']['f1']:.4f}")
        if "solo_huggingface_referencia" in resultado:
            print(f"  HF como ref, Gemini como candidato — F1: {resultado['solo_huggingface_referencia']['f1']:.4f}")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"\nBERTScore guardado en: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
