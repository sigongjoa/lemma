-- NOTE: Cloudflare Pages 배포 시 bcrypt 대신 PBKDF2 해시를 사용합니다.
-- 관리자 계정은 앱 실행 후 API로 생성하거나,
-- 아래 스크립트(Node.js)로 해시를 생성해 직접 INSERT 하세요.

-- 해시 생성 방법 (로컬에서 한 번 실행):
-- node -e "
--   const { hashPin } = require('./lib/crypto');
--   hashPin('1234').then(h => console.log(h));
-- "
-- 출력된 해시값을 아래에 붙여넣기:

-- INSERT INTO users (name, pin_hash, role)
-- VALUES ('선생님이름', '<PBKDF2_HASH_HERE>', 'admin');

-- 또는 학생 추가 API를 통해 생성:
-- POST /api/students  { name, pin }  (admin 세션 필요)
