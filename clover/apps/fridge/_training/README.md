# fridge assistant QLoRA 파인튜닝

`_datasets/fridge_sft_all.jsonl`로 EXAONE-3.5-7.8B-Instruct을 QLoRA(4bit NF4 + LoRA)로 파인튜닝한다.

## 왜 원본 bf16 체크포인트인가

저장소 루트의 `EXAONE-3.5-7.8B-Instruct-AWQ/`는 AutoAWQ로 이미 4bit 양자화된
**추론 전용** 체크포인트다. AutoAWQ 커널은 backward를 지원하지 않아 이 위에 LoRA
어댑터를 붙여도 그래디언트가 흐르지 않는다(학습 불가).

QLoRA(Dettmers et al.)는 bitsandbytes NF4 양자화를 전제로 하므로, 이 스크립트는
**원본 bf16 체크포인트**(`LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct`, HF hub)를 받아
`BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4")`로 즉석 양자화한다.
AWQ 폴더는 학습 후 llama.cpp/Ollama 등 추론 서빙에만 계속 사용한다.

## 사용법

```bash
cd clover/apps/fridge/_training
python train_qlora.py
```

주요 옵션: `--base_model`, `--dataset`, `--output_dir`, `--epochs`, `--lora_r` 등 (`-h` 참고).
출력은 LoRA 어댑터만 저장한다 (`output/`, 베이스 가중치 미포함).

## 환경 확인 필요 사항

- **CUDA**: 이 저장소 `.venv`의 torch(cu130 빌드) 기준으로 확인했을 때 로컬 GPU 드라이버가
  구버전이라 `torch.cuda.is_available()`이 `False`였다. 학습을 돌리려면 드라이버 업데이트
  또는 설치된 CUDA 빌드에 맞는 드라이버가 있는 머신(클라우드 GPU 등)이 필요하다.
- **VRAM**: 로컬 GPU는 RTX 3050 8GB — 7.8B 모델 4bit 기준으로는 빠듯하다.
  `--per_device_batch_size 1` + `--grad_accum`으로 유효 배치를 늘리고,
  `--max_length`를 줄여서 맞춰야 할 수 있다.
