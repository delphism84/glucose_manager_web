cd /lunar/empecs/cgms/cgms_be
docker compose build --no-cache be && docker compose up -d be



cd /lunar/empecs/cgms/cgms_be

# 이미지 다시 빌드 후 컨테이너만 교체
docker compose build --no-cache fe
docker compose up -d --force-recreate fe