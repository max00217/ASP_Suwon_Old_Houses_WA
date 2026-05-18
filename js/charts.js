/* ================================================================
   charts.js — 실제 자료조사 데이터 기반 차트
   ================================================================ */
'use strict';

async function initCharts() {
    const res   = await fetch('./data/stats.json');
    const data  = await res.json();

    /* ── 경기도 타 도시 비교 가로 막대 ─────────────────────────── */
    observe('compChart', () => {
        const labels = data.comparisons.map(d => d.city);
        const values = data.comparisons.map(d => d.ratio);
        const colors = data.comparisons.map(d =>
            d.highlight ? '#c14a2a' : 'rgba(26,24,21,0.15)'
        );
        new Chart(get('compChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '노후주택 비율 (%)',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 0
                }]
            },
            options: {
                ...baseOpts('%'),
                indexAxis: 'y',
                plugins: {
                    ...baseOpts('%').plugins,
                    annotation: {}
                }
            }
        });
    });

    /* ── 구별 노후도 지수 ──────────────────────────────────────── */
    observe('districtChart', () => {
        new Chart(get('districtChart'), {
            type: 'bar',
            data: {
                labels: data.districts.map(d => d.name),
                datasets: [{
                    label: '노후도 종합 지수',
                    data: data.districts.map(d => d.old_index),
                    backgroundColor: data.districts.map(d => d.color),
                    borderRadius: 0
                }]
            },
            options: baseOpts('')
        });
    });

    /* ── 구별 고령인구 비율 ────────────────────────────────────── */
    observe('elderChart', () => {
        new Chart(get('elderChart'), {
            type: 'bar',
            data: {
                labels: data.districts.map(d => d.name),
                datasets: [{
                    label: '65세 이상 인구 비율 (%)',
                    data: data.districts.map(d => d.elder_ratio),
                    backgroundColor: data.districts.map(d => d.color),
                    borderRadius: 0
                }]
            },
            options: baseOpts('%')
        });
    });
}

function get(id) { return document.getElementById(id); }

function observe(id, cb) {
    const el = get(id);
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting || el._drawn) return;
        el._drawn = true;
        cb();
    }, { threshold: 0.3 });
    obs.observe(el);
}

function baseOpts(unit) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a1815',
                titleFont: { family: 'Pretendard Variable', size: 13, weight: '600' },
                bodyFont:  { family: 'IBM Plex Mono', size: 11 },
                padding: 12, cornerRadius: 0, displayColors: false,
                callbacks: { label: ctx => `  ${ctx.raw}${unit}` }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { family: 'Pretendard Variable', size: 12, weight: '500' }, color: '#1a1815' }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(26,24,21,0.06)' },
                ticks: {
                    font: { family: 'IBM Plex Mono', size: 11 },
                    color: '#8a8478',
                    callback: v => v + unit
                }
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', initCharts);
