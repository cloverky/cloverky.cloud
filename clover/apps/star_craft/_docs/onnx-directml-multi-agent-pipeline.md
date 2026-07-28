# 멀티에이전트 시스템 구성 지시서 (ONNX/DirectML, Iris Xe 대상)

> 이 문서는 CUDA 없는 통합 그래픽(Intel Iris Xe) 환경을 가정한 8개 비전/텍스트 에이전트 구성
> 계획서다. 개별 에이전트 프롬프트는 `_docs/` 아래 각 파일로 분리했다 — 목록은
> [에이전트 문서 목록](#에이전트-문서-목록) 참고.
>
> **주의**: `clover/requirements.txt`는 이미 `torch==2.12.0+cu126` (CUDA 빌드)를 고정하고
> 있어, 이 문서의 "CUDA 없음 → DirectML/OpenVINO" 전제와 현재 저장소의 실제 배포 환경이
> 상충한다. 이 문서는 계획/참고 자료로 저장하며, 실제 코드 구현은 별도 확인 후 진행한다.

---

## 하드웨어 제약 분석

| 항목 | 사양 | 영향 |
|------|------|------|
| GPU | Intel Iris Xe Graphics | CUDA 없음 → DirectML / OpenVINO |
| VRAM | 8GB (시스템 RAM 공유) | 모델 크기 엄격히 제한 |
| QLoRA | bitsandbytes CUDA 전용 | → quanto / ONNX + INT8 대체 |
| 가속 백엔드 | DirectML (Windows) / OpenVINO | CUDA 코드 전면 제거 필요 |

모든 모델은 ONNX INT8 또는 OpenVINO IR 포맷으로 변환해서 사용한다.

---

## 태스크별 모델 교체 전략

### 1. 이미지 분류 + 전이학습 (VGG 대체)

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | VGG-16 | MobileNetV3-Small |
| 이유 | VGG 138M params → 메모리 과다 | 2.5M params, INT8 친화적 |
| Fine-tuning | 일반 | quanto INT8 + LoRA (PEFT) |
| 추론 | - | ONNX Runtime DirectML |

```python
# 전이학습: timm + PEFT LoRA (CPU 동작)
from peft import LoraConfig, get_peft_model
import timm

base = timm.create_model("mobilenetv3_small_100", pretrained=True, num_classes=NUM_CLASSES)
lora_cfg = LoraConfig(target_modules=["fc1", "fc2"], r=8, lora_alpha=16)
model = get_peft_model(base, lora_cfg)
```

### 2. 물체 감지 (SSD 대체)

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | SSD-VGG | YOLOv8n (nano) |
| 이유 | SSD backbone=VGG → 메모리 과다 | 3.2M params, ONNX 공식 지원 |
| Fine-tuning | - | Ultralytics 내장 trainer (CPU) |
| 추론 | - | ONNX Runtime DirectML |

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")
model.train(data="dataset.yaml", epochs=50, imgsz=416, device="cpu", batch=8)
model.export(format="onnx", int8=True)
```

### 3. 시멘틱 분할 (PSPNet 대체)

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | PSPNet (ResNet backbone) | LiteSeg (MobileNetV2 backbone) |
| 이유 | ResNet50 기반 → 연산 과다 | 경량 encoder, 512x512 실용적 |
| 대안 | - | SegFormer-B0 (3.8M params) |
| 추론 | - | ONNX Runtime |

```python
# SegFormer-B0: Hugging Face transformers
from transformers import SegformerForSemanticSegmentation, SegformerConfig

config = SegformerConfig.from_pretrained("nvidia/segformer-b0-finetuned-ade-512-512")
model = SegformerForSemanticSegmentation.from_pretrained(
    "nvidia/segformer-b0-finetuned-ade-512-512"
)
# ONNX 변환 후 INT8 양자화
```

### 4. 자세 추정 (OpenPose 대체)

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | OpenPose (VGG backbone) | MoveNet Lightning |
| 이유 | OpenPose 메모리/연산 과다 | TFLite INT8, 1.9MB |
| 대안 | - | RTMPose-tiny (ONNX) |
| 추론 | - | ONNX Runtime 또는 TFLite |

```python
import onnxruntime as ort

# RTMPose-tiny ONNX 사용
session = ort.InferenceSession(
    "rtmpose-tiny.onnx",
    providers=["DmlExecutionProvider", "CPUExecutionProvider"]
)
```

### 5. GAN 이미지 생성 (DCGAN / Self-Attention GAN 대체)

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | DCGAN, SAGAN | Stable Diffusion 1.5 (INT8 + 해상도 축소) |
| 이유 | GAN 학습 불안정 + Xe에서 비효율 | Diffuser ONNX, DirectML 공식 지원 |
| 경량 대안 | - | TinyGAN 또는 FastGAN |
| 추론 해상도 | - | 256x256 권장 (VRAM 한계) |

```python
# ONNX DirectML로 Stable Diffusion 경량 실행
from optimum.onnxruntime import ORTStableDiffusionPipeline

pipe = ORTStableDiffusionPipeline.from_pretrained(
    "optimum/stable-diffusion-1-5-onnx",
    provider="DmlExecutionProvider"
)
image = pipe("a cat", height=256, width=256).images[0]
```

### 6. GAN 이상 탐지 (AnoGAN / EfficientGAN 대체)

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | AnoGAN, Efficient GAN-based AD | PatchCore (ResNet18 backbone) |
| 이유 | GAN 추론 반복 수렴 → 느림 | 메모리 뱅크 기반, 추론 1회 |
| 대안 | - | FastFlow (lite) |
| Fine-tuning | - | 정상 이미지만으로 학습 (Few-shot) |

```python
# anomalib 라이브러리 사용
from anomalib.models import Patchcore
from anomalib.engine import Engine

model = Patchcore(backbone="resnet18", layers=["layer2", "layer3"])
engine = Engine(accelerator="cpu", max_epochs=1)
engine.fit(model, datamodule=datamodule)
model.export(export_type="onnx")
```

### 7. 감정 분석 Transformer

| 항목 | 기존 | 교체/유지 모델 |
|------|------|----------------|
| 모델 | Transformer (커스텀) | DistilBERT (INT8) |
| 이유 | 원본 BERT 110M → 무거움 | DistilBERT 66M, INT8 → ~16MB |
| Fine-tuning | - | quanto INT8 QLoRA 대체 |
| 추론 | - | ONNX Runtime |

```python
from transformers import DistilBertForSequenceClassification
from optimum.quanto import quantize, qint8

model = DistilBertForSequenceClassification.from_pretrained("distilbert-base-uncased")
quantize(model, weights=qint8)  # bitsandbytes 없이 INT8
```

### 8. 동영상 분류 (3DCNN / ECO 대체) ← 핵심 교체

| 항목 | 기존 | 교체 모델 |
|------|------|-----------|
| 모델 | 3DCNN, ECO | MobileViT-XXS + 프레임 샘플링 |
| 이유 | 3D Conv → Xe에서 치명적 | 2D ViT로 프레임별 처리 후 집계 |
| QLoRA 대체 | bitsandbytes 불가 | quanto INT8 + PEFT LoRA |
| 추론 전략 | 전체 영상 | 8프레임 균등 샘플링 후 평균 |
| 대안 | - | VideoMAE-tiny (ONNX) |

```python
from transformers import VideoMAEForVideoClassification
from optimum.quanto import quantize, qint8
from peft import LoraConfig, get_peft_model

# 1. 모델 로드
model = VideoMAEForVideoClassification.from_pretrained(
    "MCG-NJU/videomae-tiny-finetuned-kinetics"
)

# 2. LoRA 적용 (QLoRA 대체)
lora_cfg = LoraConfig(
    target_modules=["query", "value"],
    r=4,
    lora_alpha=8,
    lora_dropout=0.1
)
model = get_peft_model(model, lora_cfg)

# 3. INT8 양자화 (bitsandbytes 대신 quanto)
quantize(model, weights=qint8)

# 4. 프레임 샘플링 유틸
import cv2, numpy as np

def sample_frames(video_path: str, num_frames: int = 8) -> np.ndarray:
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    indices = np.linspace(0, total - 1, num_frames, dtype=int)
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    cap.release()
    return np.array(frames)  # [T, H, W, C]
```

---

## 멀티에이전트 구성도

에이전트 이름은 star_craft 허브의 기존 네이밍 컨벤션(스타크래프트 유닛 테마 — 예:
`terran_vessel_gemini_gateway.py`)을 따라 붙였다.

```
Nexus (Supervisor Agent — FastAPI)
│
├── Overseer     ← 이미지 분류: MobileNetV3-Small + LoRA
├── Raven        ← 물체 감지: YOLOv8n (ONNX)
├── ScienceVessel← 시멘틱 분할: SegFormer-B0 (ONNX)
├── Ghost        ← 자세 추정: RTMPose-tiny (ONNX)
├── Reaver       ← 이미지 생성: SD-1.5 ONNX DirectML
├── Arbiter      ← 이상 탐지: PatchCore (ONNX)
├── Comsat       ← 감정 분석: DistilBERT INT8 (ONNX)
└── Battlecruiser← 동영상 분류: VideoMAE-tiny + LoRA (quanto)
```

## 에이전트 문서 목록

| 에이전트 | 태스크 | 문서 |
|----------|--------|------|
| Overseer | 이미지 분류 | [overseer-image-class-agent.md](./overseer-image-class-agent.md) |
| Raven | 물체 감지 | [raven-detection-agent.md](./raven-detection-agent.md) |
| ScienceVessel | 시멘틱 분할 | [science-vessel-segmentation-agent.md](./science-vessel-segmentation-agent.md) |
| Ghost | 자세 추정 | [ghost-pose-agent.md](./ghost-pose-agent.md) |
| Reaver | 이미지 생성 | [reaver-generation-agent.md](./reaver-generation-agent.md) |
| Arbiter | 이상 탐지 | [arbiter-anomaly-agent.md](./arbiter-anomaly-agent.md) |
| Comsat | 감정 분석 | [comsat-sentiment-agent.md](./comsat-sentiment-agent.md) |
| Battlecruiser | 동영상 분류 | [battlecruiser-video-agent.md](./battlecruiser-video-agent.md) |
| Nexus | Supervisor 라우팅 | [nexus-supervisor-agent.md](./nexus-supervisor-agent.md) |

---

## 공통 백엔드 설정

```python
# onnxruntime providers 우선순위 (Iris Xe)
PROVIDERS = ["DmlExecutionProvider", "CPUExecutionProvider"]

# 모든 세션에 공통 적용
import onnxruntime as ort
so = ort.SessionOptions()
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
so.intra_op_num_threads = 4  # Iris Xe 코어 수 맞게 조정
```

## requirements.txt (이 파이프라인 전용 — 기존 `clover/requirements.txt`와 별개 검토 필요)

```
# 추론 백엔드
onnxruntime-directml>=1.17.0
optimum[onnxruntime]>=1.18.0

# 모델
transformers>=4.40.0
timm>=0.9.12
ultralytics>=8.0.0
anomalib>=1.0.0

# 경량 양자화 (bitsandbytes 대체)
optimum-quanto>=0.2.0

# LoRA fine-tuning
peft>=0.10.0

# 에이전트
langgraph>=0.1.0
langchain-core>=0.2.0
fastapi>=0.110.0

# 영상 처리
opencv-python>=4.9.0
```

---

## 구현 체크리스트 (Claude Code용)

- [ ] ONNX Runtime DirectML 설치 확인 (`onnxruntime-directml`)
- [ ] 각 모델 ONNX 변환 스크립트 작성
- [ ] 공통 `BaseAgent` 추상 클래스 정의 (load/predict/export 인터페이스)
- [ ] `AgentRegistry`에 8개 에이전트 등록
- [ ] Supervisor FastAPI 라우터 구현
- [ ] Fake 구현체로 전 에이전트 단위 테스트
- [ ] 순차 큐 처리 미들웨어 구현 (동시 실행 방지)
- [ ] OOM 감지 → 자동 해상도 축소 핸들러
