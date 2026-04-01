'use client';

import { useEffect, useRef, useCallback } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';

// ── 상수 ──────────────────────────────────────────────

/** 보간 중단 임계값 (미터) */
const SNAP_THRESHOLD_METERS = 0.5;
/** 이 거리 이상 점프하면 보간 없이 즉시 스냅 (미터) */
const SNAP_DISTANCE_METERS = 30;
/** 허용 공간 지연 (미터) — tau 계산의 기준 */
const LAG_BUDGET_METERS = 3;
/** 최소 tau (빠른 이동 시, ms) */
const MIN_TAU_MS = 150;
/** 최대 tau (느린 이동/정지 시, ms) */
const MAX_TAU_MS = 600;
/** 속도 fallback (정지 상태, m/s) */
const MIN_SPEED_MPS = 0.5;
/** deltaTime 상한 — 탭 백그라운드 복귀 대비 (ms) */
const MAX_DT_MS = 100;

// ── 유틸리티 ──────────────────────────────────────────

interface LatLng {
  lat: number;
  lng: number;
}

/** 두 좌표 간 거리 (미터, equirectangular 근사 — 짧은 거리에 충분) */
function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180) * Math.cos(a.lat * (Math.PI / 180));
  return R * Math.sqrt(dLat * dLat + dLng * dLng);
}

/** 속도에 따라 tau(시간 상수)를 계산 — 빠를수록 작은 tau(빠르게 따라감) */
function computeTauMs(speedMps: number | null): number {
  const s = Math.max(speedMps ?? MIN_SPEED_MPS, MIN_SPEED_MPS);
  return Math.min(Math.max((LAG_BUDGET_METERS / s) * 1000, MIN_TAU_MS), MAX_TAU_MS);
}

/** 큰 점프(텔레포트)면 보간 스킵하고 즉시 이동 */
function shouldSnap(dist: number): boolean {
  return dist > SNAP_DISTANCE_METERS;
}

// ── 컴포넌트 ─────────────────────────────────────────

/** 지도 위 유저 현재 위치를 파란 점으로 표시하며, 좌표 변경 시 부드럽게 보간 이동 */
export function UserLocationDot({
  position,
  speed,
  accuracy,
}: {
  position: LatLng;
  speed?: number | null;
  accuracy?: number | null;
}) {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const targetRef = useRef<LatLng>(position);
  const currentRef = useRef<LatLng>(position);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(performance.now());
  const tauRef = useRef(computeTauMs(speed ?? null));
  /** AdvancedMarker prop에는 초기 위치만 전달 — 이후 업데이트는 ref로 직접 제어 */
  const initialPositionRef = useRef<LatLng>(position);

  /** 시간 기반 exponential decay 애니메이션 */
  const animate = useCallback((now: number) => {
    const dtMs = Math.min(now - lastFrameRef.current, MAX_DT_MS);
    lastFrameRef.current = now;

    const target = targetRef.current;
    const current = currentRef.current;
    const dist = distanceMeters(current, target);

    // 큰 점프(30m+) → 즉시 스냅
    if (shouldSnap(dist)) {
      currentRef.current = { lat: target.lat, lng: target.lng };
      if (markerRef.current) markerRef.current.position = currentRef.current;
      rafRef.current = null;
      return;
    }

    // 충분히 가까우면 스냅하고 중지
    if (dist < SNAP_THRESHOLD_METERS) {
      currentRef.current = { lat: target.lat, lng: target.lng };
      if (markerRef.current) markerRef.current.position = currentRef.current;
      rafRef.current = null;
      return;
    }

    // 시간 기반 exponential decay: alpha = 1 - e^(-dt/tau)
    const alpha = 1 - Math.exp(-dtMs / tauRef.current);

    currentRef.current = {
      lat: current.lat + (target.lat - current.lat) * alpha,
      lng: current.lng + (target.lng - current.lng) * alpha,
    };

    if (markerRef.current) markerRef.current.position = currentRef.current;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  /** position prop이 바뀌면 새 목표 설정 → 애니메이션 시작 (노이즈 필터링 포함) */
  useEffect(() => {
    // 정확도가 25m보다 나쁘면 신뢰할 수 없으므로 무시
    if (accuracy && accuracy > 25) return;

    // 이동 거리가 오차 범위 안이면 GPS 노이즈로 판단하고 무시
    const dist = distanceMeters(currentRef.current, position);
    const deadband = Math.max((accuracy ?? 15) * 0.3, 3);
    if (dist < deadband) return;

    targetRef.current = position;
    lastFrameRef.current = performance.now();

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [position.lat, position.lng, accuracy, animate]);

  /** speed가 바뀌면 tau 재계산 */
  useEffect(() => {
    tauRef.current = computeTauMs(speed ?? null);
  }, [speed]);

  /** 언마운트 시 rAF 정리 */
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  /** 마커 인스턴스가 (재)생성될 때 현재 보간 좌표로 즉시 동기화 */
  const handleRef = useCallback((marker: google.maps.marker.AdvancedMarkerElement | null) => {
    markerRef.current = marker;
    if (marker) {
      marker.position = currentRef.current;
    }
  }, []);

  return (
    <AdvancedMarker ref={handleRef} position={initialPositionRef.current} title="My Location">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-6 animate-ping rounded-full bg-blue-400/30" />
        <span className="relative size-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
      </div>
    </AdvancedMarker>
  );
}
