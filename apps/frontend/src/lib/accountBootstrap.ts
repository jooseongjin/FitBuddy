// 앱 시작 시 가장 먼저 실행 (main.tsx에서 App보다 먼저 import)
// mock 서버·캐릭터 상태가 탭 데이터를 읽기 전에, 다른 계정의 데이터가 남아 있으면 지운다.
import { ensureTabDataOwner, watchBackForwardRestore } from './accountSession';

ensureTabDataOwner();
watchBackForwardRestore();
