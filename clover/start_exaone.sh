#!/bin/bash
# Qwen2.5-1.5B-Instruct 를 EXAONE 이름으로 서빙 (실제 EXAONE 내려받기 전 임시 대체).
# RTX 3050 8GB: Windows 데스크탑이 ~1GB 상주하므로 util 0.95 + 짧은 컨텍스트로
# KV 캐시 공간을 확보한다. 값을 낮추면 "No available memory for the cache blocks" 로 죽는다.
# systemd user 유닛(exaone.service)에서 실행되므로 절대경로만 쓴다.
#
# 데스크탑 배치 위치: /home/hi/start_exaone.sh
set -euo pipefail

MODEL=/home/hi/.cache/huggingface/hub/models--Qwen--Qwen2.5-1.5B-Instruct/snapshots/989aa7980e4cf806f80c7fef2b1adb7bc71aa306

exec /home/hi/miniconda3/envs/vllm/bin/vllm serve "$MODEL" \
  --served-model-name exaone \
  --port 8001 \
  --max-model-len 2048 \
  --gpu-memory-utilization 0.95 \
  --max-num-seqs 4 \
  --max-num-batched-tokens 1024 \
  --swap-space 1 \
  --enforce-eager \
  --dtype float16
