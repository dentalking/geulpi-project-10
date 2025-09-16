#!/bin/bash

# Supabase 데이터베이스 백업 스크립트
# 실행 전 필요사항: supabase CLI 설치

echo "🔵 Supabase 데이터베이스 백업 시작..."
echo "================================="

# 환경 변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 백업 디렉토리 생성
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# 현재 날짜/시간 기반 백업 파일명
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "📁 백업 파일: $BACKUP_FILE"

# 방법 1: pg_dump 사용 (Direct URL 필요)
if [ ! -z "$DIRECT_DATABASE_URL" ]; then
    echo "📦 pg_dump를 사용하여 백업 중..."
    pg_dump "$DIRECT_DATABASE_URL" \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --clean \
        --if-exists \
        > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✅ 백업 성공: $BACKUP_FILE"

        # 백업 파일 압축
        gzip "$BACKUP_FILE"
        echo "🗜️ 압축 완료: ${BACKUP_FILE}.gz"

        # 백업 파일 크기 확인
        FILE_SIZE=$(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}')
        echo "📊 백업 크기: $FILE_SIZE"
    else
        echo "❌ 백업 실패"
        exit 1
    fi
else
    echo "⚠️ DIRECT_DATABASE_URL이 설정되지 않았습니다."
    echo "대안: Supabase Dashboard에서 백업하세요."
    echo ""
    echo "수동 백업 방법:"
    echo "1. https://app.supabase.com 로그인"
    echo "2. 프로젝트 선택"
    echo "3. Settings > Database > Backups"
    echo "4. 'Create backup' 클릭"
fi

echo ""
echo "================================="
echo "백업 완료 후 진행할 작업:"
echo "1. 백업 파일 안전한 곳에 보관"
echo "2. 개발 환경에서 테스트"
echo "3. 문제 발생 시 복원 가능 확인"