#!/bin/bash
# EXAONE-3.5-7.8B-Instruct-AWQ 서빙. 모델은 C 여유 공간 때문에 D 드라이브에 둔다
# (/mnt/d 읽기가 느려 기동 시 적재가 1~3분 더 걸린다).
# RTX 3050 8GB에 가중치만 ~5.3GB라 컨텍스트·동시 요청을 최소로 잡는다.
# 되돌리기: start_exaone.qwen.sh 를 start_exaone.sh 로 복사 후 systemctl --user restart exaone
set -euo pipefail

MODEL=/mnt/d/models/EXAONE-3.5-7.8B-Instruct-AWQ

exec /home/hi/miniconda3/envs/vllm/bin/vllm serve "$MODEL" \
  --served-model-name exaone \
  --port 8001 \
  --max-model-len 2048 \
  --gpu-memory-utilization 0.95 \
  --max-num-seqs 2 \
  --max-num-batched-tokens 2048 \
  --swap-space 1 \
  --enforce-eager \
  --dtype float16
