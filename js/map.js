/* ================================================================
map.js — 실제 수원시 44개 행정동 GeoJSON + 수원화성 경계 오버레이
================================================================ */
'use strict';

async function initMap() {
  const [dongRes, statsRes, fortressRes] = await Promise.all([
    fetch('./data/suwon_dong_data.geojson'),
    fetch('./data/stats.json'),
    fetch('./data/fortress_boundary.geojson')
  ]);
  const dongGJ    = await dongRes.json();
  const stats     = await statsRes.json();
  const fortressGJ = await fortressRes.json();
  
  const map = L.map('map', {
    scrollWheelZoom: false,
    zoomControl: true
  }).setView([37.2636, 127.0286], 12);
  
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    { subdomains: 'abcd', maxZoom: 19, attribution: '© OpenStreetMap & CARTO' }
  ).addTo(map);
  
  /* 색상 스케일 */
  function getColor(val, key) {
    if (key === 'support') {
      // 지원 도달률: 높을수록 좋음 → 색 반전
      return val > 75 ? '#8aa8b3' :
      val > 60 ? '#f5c9a8' :
      val > 45 ? '#e89060' :
      val > 35 ? '#c14a2a' : '#8B1A1A';
    }
    return val > 80 ? '#8B1A1A' :
    val > 65 ? '#c14a2a' :
    val > 50 ? '#e89060' :
    val > 30 ? '#f5c9a8' : '#dce8ec';
  }
  
  const layerKeys = {
    blind_spot: 'blind_spot',
    old_housing: 'old_score',
    vulnerable: 'vuln_score',
    support: 'support'
  };
  
  let dongLayer = null;
  let fortressLayer = null;
  
  /* 수원화성 경계 레이어 (항상 표시) */
  fortressLayer = L.geoJSON(fortressGJ, {
    style: {
      color: '#c14a2a',
      weight: 2.5,
      dashArray: '6 4',
      fillColor: 'transparent',
      fillOpacity: 0,
      interactive: false
    }
  }).addTo(map);
  
  // 화성 경계 레이블
  const fortressBounds = fortressLayer.getBounds();
  L.marker(fortressBounds.getCenter(), {
    icon: L.divIcon({
      className: '',
      html: `<div style="font-family:var(--font-mono,monospace);font-size:0.6rem;
                   letter-spacing:0.1em;color:#c14a2a;white-space:nowrap;
                   text-transform:uppercase;font-weight:500;">
                   ── 수원화성 보존지역 ──</div>`,
      iconAnchor: [60, 0]
    })
  }).addTo(map);
  
  /* 동 레이어 그리기 */
  function drawLayer(layerKey) {
    if (dongLayer) map.removeLayer(dongLayer);
    const dataKey = layerKeys[layerKey];
    
    dongLayer = L.geoJSON(dongGJ, {
      style: feature => {
        const val = feature.properties[dataKey] || 0;
        return {
          fillColor: getColor(val, layerKey),
          color: '#1a1815',
          weight: 0.6,
          fillOpacity: 0.72
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const fortress = p.is_fortress
        ? `<div style="color:#c14a2a;font-size:0.75rem;margin-top:0.25rem;">★ 화성 보존지역</div>`
        : '';
        layer.bindPopup(`
                    <b>${p.dong}</b> (${p.gu})
                    ${fortress}
                    사각지대 점수: <strong>${p.blind_spot}</strong><br>
                    노후도: ${p.old_score} &nbsp;|&nbsp; 취약계층: ${p.vuln_score}<br>
                    지원 도달률: ${p.support}
                `);
          layer.on('mouseover', function() {
            this.setStyle({ weight: 2, color: '#1a1815', fillOpacity: 0.85 });
          });
          layer.on('mouseout', function() {
            dongLayer.resetStyle(this);
          });
        }
      }).addTo(map);
      
      // 화성 경계를 항상 위에
      fortressLayer.bringToFront();
    }
    
    drawLayer('blind_spot');
    
    /* 레이어 토글 */
    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawLayer(btn.dataset.layer);
      });
    });
    
    /* 범례 */
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.style.cssText = `background:#f5f1ea;padding:0.75rem 1rem;
            font-family:monospace;font-size:0.68rem;line-height:1.8;
            border:1px solid rgba(26,24,21,0.15);`;
      div.innerHTML = `
            <div style="font-weight:700;margin-bottom:0.4rem;letter-spacing:0.1em;text-transform:uppercase;">사각지대 점수</div>
            <div><span style="display:inline-block;width:12px;height:12px;background:#8B1A1A;margin-right:6px;"></span>80+ 심각</div>
            <div><span style="display:inline-block;width:12px;height:12px;background:#c14a2a;margin-right:6px;"></span>65–80 위험</div>
            <div><span style="display:inline-block;width:12px;height:12px;background:#e89060;margin-right:6px;"></span>50–65 주의</div>
            <div><span style="display:inline-block;width:12px;height:12px;background:#f5c9a8;margin-right:6px;"></span>30–50 관찰</div>
            <div><span style="display:inline-block;width:12px;height:12px;background:#dce8ec;margin-right:6px;"></span>–30 양호</div>
            <div style="margin-top:0.4rem;border-top:1px solid rgba(0,0,0,0.1);padding-top:0.4rem;">
                <span style="display:inline-block;width:12px;height:2px;background:#c14a2a;
                border-top:2px dashed #c14a2a;margin-right:6px;vertical-align:middle;"></span>화성 보존지역
            </div>`;
      return div;
    };
    legend.addTo(map);
  }
  
  document.addEventListener('DOMContentLoaded', initMap);
