/* ================================================================
   participation.js — 시민 참여 기능
   1. 내 동네 찾기 (동 이름 검색 → 사각지대 점수 반환)
   2. 문제 인식 투표 (로컬스토리지 없이 세션 내 집계)
   3. 공유하기 (Web Share API)
   ================================================================ */
'use strict';

let dongData = null;

async function initParticipation() {
    const res = await fetch('./data/suwon_dong_data.geojson');
    const gj  = await res.json();
    dongData  = gj.features.map(f => f.properties);

    initSearch();
    initVote();
    initShare();
}

/* ── 1. 내 동네 찾기 ──────────────────────────────────────────── */
function initSearch() {
    const input  = document.getElementById('dong-input');
    const btn    = document.getElementById('dong-search-btn');
    const result = document.getElementById('dong-result');
    if (!input || !btn || !result) return;

    // 자동완성 후보
    const datalist = document.getElementById('dong-list');
    if (datalist) {
        dongData.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.dong;
            datalist.appendChild(opt);
        });
    }

    function search() {
        const query = input.value.trim();
        if (!query) return;

        const found = dongData.find(d =>
            d.dong === query || d.dong.includes(query)
        );

        if (!found) {
            result.innerHTML = `<p style="color:var(--fg-muted)">
                "<strong>${query}</strong>"을 찾을 수 없습니다.<br>
                수원시 44개 행정동 이름을 정확히 입력해 주세요.</p>`;
            result.classList.add('visible');
            return;
        }

        const level = found.blind_spot > 80 ? { label: '매우 심각', color: '#8B1A1A' } :
                      found.blind_spot > 65 ? { label: '위험',     color: '#c14a2a' } :
                      found.blind_spot > 50 ? { label: '주의',     color: '#e89060' } :
                      found.blind_spot > 30 ? { label: '관찰',     color: '#f5c9a8' } :
                                             { label: '양호',     color: '#8aa8b3' };

        const fortress = found.is_fortress
            ? `<div class="result-badge">★ 수원화성 역사문화환경보존지역</div>` : '';

        result.innerHTML = `
            <div class="result-header">
                <span class="result-dong">${found.gu} ${found.dong}</span>
                <span class="result-level" style="background:${level.color}">${level.label}</span>
            </div>
            ${fortress}
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-val" style="color:${level.color}">${found.blind_spot}</span>
                    <span class="result-key">사각지대 점수</span>
                </div>
                <div class="result-item">
                    <span class="result-val">${found.old_score}</span>
                    <span class="result-key">노후도</span>
                </div>
                <div class="result-item">
                    <span class="result-val">${found.vuln_score}</span>
                    <span class="result-key">취약계층 지수</span>
                </div>
                <div class="result-item">
                    <span class="result-val">${found.support}</span>
                    <span class="result-key">지원 도달률</span>
                </div>
            </div>
            <p class="result-note">
                ${found.blind_spot > 65
                    ? '이 지역은 집수리 지원이 시급하지만 제도권 밖에 있을 가능성이 높습니다.'
                    : found.blind_spot > 40
                    ? '일부 취약 가구가 지원에서 누락될 수 있는 지역입니다.'
                    : '상대적으로 지원이 잘 이루어지고 있는 지역입니다.'}
            </p>`;
        result.classList.add('visible');
    }

    btn.addEventListener('click', search);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
}

/* ── 2. 문제 인식 투표 ────────────────────────────────────────── */
const votes = { safety: 0, fire: 0, slum: 0, energy: 0 };
let totalVotes = 0;
let userVoted = false;

function initVote() {
    const btns = document.querySelectorAll('.vote-btn');
    if (!btns.length) return;

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (userVoted) return;
            const key = btn.dataset.vote;
            votes[key]++;
            totalVotes++;
            userVoted = true;
            updateVoteDisplay();
            btns.forEach(b => {
                b.disabled = true;
                b.style.opacity = b.dataset.vote === key ? '1' : '0.4';
            });
            document.getElementById('vote-thanks')?.classList.add('visible');
        });
    });
}

function updateVoteDisplay() {
    Object.entries(votes).forEach(([key, val]) => {
        const bar = document.querySelector(`[data-bar="${key}"]`);
        const pct = document.querySelector(`[data-pct="${key}"]`);
        if (!bar || !pct || !totalVotes) return;
        const p = Math.round(val / totalVotes * 100);
        bar.style.width = p + '%';
        pct.textContent = p + '%';
    });
}

/* ── 3. 공유하기 ──────────────────────────────────────────────── */
function initShare() {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: '보이지 않던 집 — 수원 노후주택 사각지대',
            text: '수원화성이 세계문화유산이 되는 동안, 성곽 아래 마을은 시간이 멈췄습니다. 데이터로 확인하는 수원 노후주택 사각지대 보고서.',
            url: window.location.href
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch(e) {}
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                shareBtn.textContent = '링크 복사됨 ✓';
                setTimeout(() => { shareBtn.textContent = '이 보고서 공유하기'; }, 2000);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', initParticipation);
