// --- Hazard Presets ---
//
// Hazard 인스턴스 생성 시 시드 데이터로 사용. 보스 패턴/진화 무기 일부가 공통 사용한다.

export const HAZARD_PRESETS = {
  pixelBeamTile: {
    shape: 'rect',
    dps: 8,
    duration: 4.0,
    color: '#ff0099'
  },
  frameDashBlast: {
    shape: 'circle',
    delay: 1.0,
    radius: 70,
    blastDmg: 40,
    duration: 0.4,
    color: '#ffd700'
  },
  cageWall: {
    shape: 'rect',
    dps: 20,
    duration: 5.0,
    color: '#ff0055'
  }
};
