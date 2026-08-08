/**
 * 서버에 닿지 못했을 때 사용자에게 보여 줄 문구.
 *
 * 브라우저가 "나 오프라인이다" 라고 확실히 말할 때만 네트워크를 언급한다.
 * 서버가 내려간 상황에서 네트워크를 확인하라고 하면, 연결이 멀쩡한 사용자는
 * 자기 탓인 줄 알고 엉뚱한 곳을 뒤지게 된다. 원인을 모를 때는 "닿지 않았다"
 * 는 사실만 말하고 책임을 넘기지 않는다.
 *
 * fetch 가 던지는 TypeError 만으로는 서버 다운·DNS·CORS·오프라인을 구분할 수
 * 없다. navigator.onLine 은 false 일 때만 믿을 만하므로 그때만 쓴다.
 */
export function connectionErrorMessage(): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "인터넷에 연결되어 있지 않습니다. 연결 상태를 확인해 주세요.";
  }
  return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
}
