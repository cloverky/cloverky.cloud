"""EXAONE-3.5-7.8B-Instruct QLoRA 파인튜닝 (fridge assistant SFT).

원본 bf16 체크포인트를 bitsandbytes NF4로 4bit 양자화해 로드하고,
LoRA 어댑터만 학습한다 (Dettmers et al., QLoRA).

주의: 저장소 루트의 `EXAONE-3.5-7.8B-Instruct-AWQ/`는 AutoAWQ로 이미 양자화된
추론 전용 체크포인트라 backward가 막혀 있어 QLoRA 학습에 쓸 수 없다.
반드시 이 스크립트의 기본값인 원본 bf16 체크포인트(`--base_model`)를 사용한다.

사용법:
  python train_qlora.py
  python train_qlora.py --epochs 3 --output_dir ./output/exaone-fridge-qlora

출력: LoRA 어댑터(output_dir, 수십~수백MB) — 베이스 모델 가중치는 저장하지 않음.
"""

from __future__ import annotations

import argparse
import os

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(HERE, "..", "_datasets", "fridge_sft_all.jsonl")
DEFAULT_OUTPUT_DIR = os.path.join(HERE, "output", "exaone-fridge-qlora")

# EXAONE 어텐션/MLP 프로젝션 레이어명 (modeling_exaone.py 기준)
TARGET_MODULES = [
    "q_proj",
    "k_proj",
    "v_proj",
    "out_proj",
    "c_fc_0",
    "c_fc_1",
    "c_proj",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base_model",
        default="LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct",
        help="원본 bf16 체크포인트 (AWQ 아님). HF hub id 또는 로컬 경로.",
    )
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--output_dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--per_device_batch_size", type=int, default=1)
    parser.add_argument("--grad_accum", type=int, default=16)
    parser.add_argument("--max_length", type=int, default=1024)
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=TARGET_MODULES,
        bias="none",
        task_type="CAUSAL_LM",
    )

    train_dataset = load_dataset("json", data_files=args.dataset, split="train")

    sft_config = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.per_device_batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        max_length=args.max_length,
        packing=False,
        assistant_only_loss=True,
        gradient_checkpointing=True,
        bf16=True,
        optim="paged_adamw_8bit",
        logging_steps=10,
        save_strategy="epoch",
        report_to="none",
        trust_remote_code=True,
    )

    trainer = SFTTrainer(
        model=args.base_model,
        args=sft_config,
        train_dataset=train_dataset,
        quantization_config=bnb_config,
        peft_config=lora_config,
    )

    trainer.train()
    trainer.save_model(args.output_dir)


if __name__ == "__main__":
    main()
