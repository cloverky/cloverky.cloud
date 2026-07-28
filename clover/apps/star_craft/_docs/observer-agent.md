# EfficientNetV2-S 이미지 분류 에이전트 구현 지시서

## 역할

너는 **하네스 엔지니어링 방식**으로 EfficientNetV2-S 기반 이미지 분류 에이전트를 구현하는 시니어 ML 엔지니어야.
모든 컴포넌트는 **테스트 가능하고**, **교체 가능하며**, **독립적으로 검증 가능**하게 설계해야 해.

---

## 하네스 엔지니어링 원칙

1. **각 컴포넌트는 독립적으로 테스트 가능**해야 함
2. **Mock/Stub으로 외부 의존성을 격리**해서 단위 테스트 작성
3. **실제 모델 없이도 전체 파이프라인이 검증 가능**하도록 Fake 구현체 제공
4. **각 단계마다 입출력 계약(contract)을 명시**하고 검증
5. **점진적으로 실제 구현체로 교체** (Fake → Stub → Real)

---

## 프로젝트 구조

아래 구조를 정확히 따라 생성해:

```
efficientnetv2s_agent/
├── CLAUDE.md                    # 이 파일
│
├── src/
│   ├── __init__.py
│   ├── model/
│   │   ├── __init__.py
│   │   ├── loader.py            # 모델 로딩 (interface + real impl)
│   │   └── classifier.py        # 추론 로직 (interface + real impl)
│   ├── preprocessing/
│   │   ├── __init__.py
│   │   └── pipeline.py          # 전처리 파이프라인
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── load_model_tool.py   # LangGraph Tool: load_model
│   │   ├── preprocess_tool.py   # LangGraph Tool: preprocess_image
│   │   └── classify_tool.py     # LangGraph Tool: classify_image
│   ├── skills/
│   │   ├── __init__.py
│   │   └── classification_skill.py  # 도메인 지식 스킬
│   ├── agent/
│   │   ├── __init__.py
│   │   └── graph.py             # LangGraph agent 그래프
│   └── training/
│       ├── __init__.py
│       ├── dataset.py           # 데이터셋 구성
│       └── trainer.py           # 2단계 fine-tuning 루프
│
├── tests/
│   ├── __init__.py
│   ├── fakes/
│   │   ├── __init__.py
│   │   ├── fake_model.py        # Fake 모델 구현체
│   │   └── fake_image.py        # Fake 이미지 생성기
│   ├── unit/
│   │   ├── test_preprocessing.py
│   │   ├── test_classifier.py
│   │   ├── test_tools.py
│   │   └── test_skill.py
│   └── integration/
│       └── test_agent_pipeline.py
│
├── configs/
│   └── default.yaml             # 하이퍼파라미터 설정
│
└── requirements.txt
```

---

## 구현 순서 (이 순서를 반드시 지켜)

### Step 1: Interface 정의 (ABC)

`src/model/loader.py`에 먼저 추상 인터페이스를 정의해:

```python
from abc import ABC, abstractmethod
import torch.nn as nn

class ModelLoader(ABC):
    @abstractmethod
    def load(self, num_classes: int, weights_path: str | None) -> nn.Module:
        """모델을 로드하고 반환. weights_path=None이면 pretrained 사용."""
        ...

class EfficientNetV2SLoader(ModelLoader):
    """Real 구현체 - timm 사용"""
    def load(self, num_classes: int, weights_path: str | None) -> nn.Module:
        import timm, torch
        model = timm.create_model(
            "tf_efficientnetv2_s",
            pretrained=(weights_path is None),
            num_classes=num_classes
        )
        if weights_path:
            model.load_state_dict(torch.load(weights_path, map_location="cpu"))
        return model.eval()
```

`src/model/classifier.py`에 추론 인터페이스:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class ClassificationResult:
    indices: list[int]
    scores: list[float]

class ImageClassifier(ABC):
    @abstractmethod
    def predict(self, tensor, top_k: int = 5) -> ClassificationResult:
        ...

class EfficientNetV2SClassifier(ImageClassifier):
    """Real 구현체"""
    def __init__(self, model):
        self.model = model

    def predict(self, tensor, top_k: int = 5) -> ClassificationResult:
        import torch
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=-1)
            top = torch.topk(probs, top_k)
        return ClassificationResult(
            indices=top.indices[0].tolist(),
            scores=top.values[0].tolist()
        )
```

---

### Step 2: Fake 구현체 작성 (테스트 하네스)

`tests/fakes/fake_model.py`:

```python
import torch
import torch.nn as nn
from src.model.loader import ModelLoader
from src.model.classifier import ImageClassifier, ClassificationResult

class FakeModelLoader(ModelLoader):
    """테스트용 - timm 없이 동작하는 더미 모델 반환"""
    def load(self, num_classes: int, weights_path: str | None) -> nn.Module:
        model = nn.Linear(3 * 384 * 384, num_classes)
        return model.eval()

class FakeClassifier(ImageClassifier):
    """테스트용 - 항상 고정된 결과 반환"""
    def __init__(self, num_classes: int = 10):
        self.num_classes = num_classes

    def predict(self, tensor, top_k: int = 5) -> ClassificationResult:
        return ClassificationResult(
            indices=list(range(top_k)),
            scores=[0.9, 0.05, 0.02, 0.02, 0.01][:top_k]
        )
```

`tests/fakes/fake_image.py`:

```python
from PIL import Image
import numpy as np
import tempfile, os

def create_fake_image(width: int = 400, height: int = 400) -> str:
    """임시 이미지 파일 생성 후 경로 반환"""
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    img.save(tmp.name)
    return tmp.name
```

---

### Step 3: 전처리 파이프라인

`src/preprocessing/pipeline.py`:

```python
import torch
from torchvision import transforms
from PIL import Image

# 계약: 입력=이미지 경로(str), 출력=Tensor[1, 3, H, W]
TRAIN_TRANSFORM = transforms.Compose([
    transforms.RandomResizedCrop(300),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((384, 384)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def preprocess_for_inference(image_path: str) -> torch.Tensor:
    img = Image.open(image_path).convert("RGB")
    return INFERENCE_TRANSFORM(img).unsqueeze(0)
```

---

### Step 4: Tool 구현 (LangGraph)

각 Tool은 **단일 책임**만 가짐. `src/tools/classify_tool.py` 예시:

```python
from langchain_core.tools import tool
from src.model.classifier import ImageClassifier, ClassificationResult
from src.preprocessing.pipeline import preprocess_for_inference

# 의존성을 전역 레지스트리로 관리 (테스트 시 교체 가능)
_registry: dict = {}

def register_classifier(classifier: ImageClassifier):
    """테스트에서 Fake로 교체할 수 있도록 주입 포인트 제공"""
    _registry["classifier"] = classifier

@tool
def classify_image(image_path: str, top_k: int = 5) -> dict:
    """이미지를 분류하고 Top-K 결과를 반환한다."""
    classifier = _registry.get("classifier")
    if not classifier:
        raise RuntimeError("classifier가 등록되지 않음. register_classifier() 먼저 호출 필요.")
    tensor = preprocess_for_inference(image_path)
    result = classifier.predict(tensor, top_k=top_k)
    return {"indices": result.indices, "scores": result.scores}
```

`load_model_tool.py`, `preprocess_tool.py`도 동일 패턴으로 작성.

---

### Step 5: Skill 구현

`src/skills/classification_skill.py`:

```python
from dataclasses import dataclass

@dataclass
class InterpretedResult:
    label: str
    confidence: float
    reliable: bool
    alternatives: list[dict]

class ImageClassificationSkill:
    """
    도메인 지식 스킬:
    - 클래스 레이블 매핑
    - 신뢰도 임계값 정책
    - 후처리 규칙
    """
    def __init__(self, label_map: dict[int, str], confidence_threshold: float = 0.7):
        self.label_map = label_map
        self.threshold = confidence_threshold

    def interpret(self, raw: dict) -> InterpretedResult:
        top_idx = raw["indices"][0]
        top_score = raw["scores"][0]
        return InterpretedResult(
            label=self.label_map.get(top_idx, "unknown"),
            confidence=round(top_score, 4),
            reliable=top_score >= self.threshold,
            alternatives=[
                {"label": self.label_map.get(i, "unknown"), "score": round(s, 4)}
                for i, s in zip(raw["indices"][1:], raw["scores"][1:])
            ]
        )
```

---

### Step 6: Fine-tuning Trainer

`src/training/trainer.py` - 2단계 학습 구현:

```python
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader

class TwoStageTrainer:
    """
    Stage 1: classifier head만 학습 (backbone 동결)
    Stage 2: 전체 unfreeze 후 discriminative LR로 fine-tuning
    """
    def __init__(self, model: nn.Module, device: str = "cuda"):
        self.model = model.to(device)
        self.device = device
        self.criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    def _freeze_backbone(self):
        for name, param in self.model.named_parameters():
            param.requires_grad = "classifier" in name

    def _unfreeze_all(self):
        for param in self.model.parameters():
            param.requires_grad = True

    def _train_epoch(self, loader: DataLoader, optimizer) -> tuple[float, float]:
        self.model.train()
        total_loss, correct = 0.0, 0
        for images, labels in loader:
            images, labels = images.to(self.device), labels.to(self.device)
            optimizer.zero_grad()
            loss = self.criterion(self.model(images), labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            correct += (self.model(images).argmax(1) == labels).sum().item()
        return total_loss / len(loader), correct / len(loader.dataset)

    @torch.no_grad()
    def _validate(self, loader: DataLoader) -> float:
        self.model.eval()
        correct = sum(
            (self.model(images.to(self.device)).argmax(1) == labels.to(self.device)).sum().item()
            for images, labels in loader
        )
        return correct / len(loader.dataset)

    def run(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        stage1_epochs: int = 5,
        stage2_epochs: int = 20,
        save_path: str = "best_efficientnetv2s.pth"
    ):
        # Stage 1
        self._freeze_backbone()
        opt1 = AdamW(filter(lambda p: p.requires_grad, self.model.parameters()), lr=1e-3)
        sch1 = CosineAnnealingLR(opt1, T_max=stage1_epochs)
        print("=== Stage 1: Head 학습 ===")
        for ep in range(stage1_epochs):
            loss, acc = self._train_epoch(train_loader, opt1)
            sch1.step()
            print(f"  Epoch {ep+1}/{stage1_epochs} | loss: {loss:.4f} | acc: {acc:.4f}")

        # Stage 2
        self._unfreeze_all()
        opt2 = AdamW([
            {"params": self.model.features.parameters(), "lr": 1e-5},
            {"params": self.model.classifier.parameters(), "lr": 1e-4}
        ])
        sch2 = CosineAnnealingLR(opt2, T_max=stage2_epochs)
        best_val = 0.0
        print("=== Stage 2: 전체 Fine-tuning ===")
        for ep in range(stage2_epochs):
            loss, acc = self._train_epoch(train_loader, opt2)
            val_acc = self._validate(val_loader)
            sch2.step()
            print(f"  Epoch {ep+1}/{stage2_epochs} | loss: {loss:.4f} | train: {acc:.4f} | val: {val_acc:.4f}")
            if val_acc > best_val:
                best_val = val_acc
                torch.save(self.model.state_dict(), save_path)
                print(f"  ✓ Best model saved (val_acc: {best_val:.4f})")
```

---

### Step 7: Agent 그래프

`src/agent/graph.py`:

```python
from langgraph.prebuilt import create_react_agent
from src.tools.load_model_tool import load_model
from src.tools.preprocess_tool import preprocess_image
from src.tools.classify_tool import classify_image
from src.skills.classification_skill import ImageClassificationSkill

def build_agent(llm, label_map: dict, confidence_threshold: float = 0.7):
    skill = ImageClassificationSkill(label_map, confidence_threshold)
    tools = [load_model, preprocess_image, classify_image]

    system_prompt = f"""
너는 EfficientNetV2-S 기반 이미지 분류 에이전트야.

실행 순서:
1. load_model → 모델 등록
2. classify_image → Top-K 추론
3. 신뢰도 {confidence_threshold} 미만이면 "불확실" 응답 후 대안 클래스 제시

클래스 수: {len(label_map)}
레이블 맵: {label_map}
"""
    return create_react_agent(llm, tools, prompt=system_prompt), skill
```

---

### Step 8: 단위 테스트 작성

모든 테스트는 **Fake 구현체만 사용** (GPU/실제 모델 불필요):

`tests/unit/test_tools.py` 예시:

```python
import pytest
from tests.fakes.fake_model import FakeClassifier
from tests.fakes.fake_image import create_fake_image
from src.tools.classify_tool import classify_image, register_classifier

@pytest.fixture(autouse=True)
def inject_fake(tmp_path):
    register_classifier(FakeClassifier(num_classes=10))
    yield

def test_classify_image_returns_top5():
    img_path = create_fake_image()
    result = classify_image.invoke({"image_path": img_path, "top_k": 5})
    assert len(result["indices"]) == 5
    assert len(result["scores"]) == 5
    assert all(0 <= s <= 1 for s in result["scores"])

def test_classify_image_no_classifier_raises():
    from src.tools import classify_tool
    classify_tool._registry.clear()
    with pytest.raises(RuntimeError, match="classifier가 등록되지 않음"):
        classify_image.invoke({"image_path": "dummy.jpg"})
```

---

### Step 9: Integration 테스트

`tests/integration/test_agent_pipeline.py`:

```python
"""
실제 LLM 없이 전체 파이프라인 검증.
- Fake 모델 + 실제 Tool + 실제 Skill로 end-to-end 확인
"""
from tests.fakes.fake_model import FakeClassifier
from tests.fakes.fake_image import create_fake_image
from src.tools.classify_tool import classify_image, register_classifier
from src.skills.classification_skill import ImageClassificationSkill

LABEL_MAP = {i: f"class_{i}" for i in range(10)}

def test_full_pipeline():
    register_classifier(FakeClassifier(num_classes=10))
    img_path = create_fake_image()

    raw = classify_image.invoke({"image_path": img_path, "top_k": 5})
    skill = ImageClassificationSkill(LABEL_MAP, confidence_threshold=0.7)
    interpreted = skill.interpret(raw)

    assert interpreted.label == "class_0"
    assert interpreted.reliable is True          # score=0.9 > 0.7
    assert len(interpreted.alternatives) == 4
```

---

## configs/default.yaml

```yaml
model:
  name: tf_efficientnetv2_s
  num_classes: 10
  weights_path: null  # null이면 pretrained

training:
  stage1_epochs: 5
  stage2_epochs: 20
  batch_size: 32
  stage1_lr: 1.0e-3
  backbone_lr: 1.0e-5
  head_lr: 1.0e-4
  label_smoothing: 0.1

preprocessing:
  train_size: 300
  inference_size: 384
  mean: [0.485, 0.456, 0.406]
  std: [0.229, 0.224, 0.225]

agent:
  confidence_threshold: 0.7
  top_k: 5
```

---

## requirements.txt

```
torch>=2.2.0
torchvision>=0.17.0
timm>=0.9.12
langchain-core>=0.2.0
langgraph>=0.1.0
pillow>=10.0.0
pyyaml>=6.0
pytest>=8.0.0
numpy>=1.26.0
```

---

## 구현 완료 체크리스트

Claude Code는 각 단계를 완료할 때마다 아래 항목을 체크해:

- [ ] Step 1: ABC 인터페이스 정의 완료
- [ ] Step 2: Fake 구현체 작성 완료
- [ ] Step 3: 전처리 파이프라인 완료
- [ ] Step 4: Tool 3개 구현 완료 (의존성 주입 포인트 포함)
- [ ] Step 5: Skill 구현 완료
- [ ] Step 6: TwoStageTrainer 구현 완료
- [ ] Step 7: Agent 그래프 구현 완료
- [ ] Step 8: 단위 테스트 통과 (`pytest tests/unit/`)
- [ ] Step 9: Integration 테스트 통과 (`pytest tests/integration/`)

**모든 단위 테스트는 GPU 없이 통과해야 함.**
