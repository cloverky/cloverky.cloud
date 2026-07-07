# React Rules

- useState를 많이 사용하지 않습니다.
- 여러 입력 값을 관리할 때는 상태 객체(state object)로 묶어서 관리합니다.

## 커서 명령어 템플릿
다음 코드에서 cursor가 위치했을 때 아래 프롬프트를 사용하세요:

```ts
const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const formProps = Object.fromEntries(formData.entries());
  // 커서를 이 위치에 둡니다.
}
```

### 프롬프트
```
다음 코드를 참조하여, 여러 개의 상태를 useState 객체로 압축하는 코드로 변경해줘.
```

이 규칙을 매번 입력하지 않고 이 MD 파일에 저장해 두었습니다.