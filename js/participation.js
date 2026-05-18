/* ================================================================
   participation.js — Firebase 연동 완성본
   ★ 아래 firebaseConfig 값만 본인 것으로 교체하면 됨
   ================================================================ */

/* ── import는 반드시 파일 맨 위 ─────────────────────────────── */
import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase, ref, runTransaction,
    onValue, push, serverTimestamp, query, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ── ★ 여기만 교체 ──────────────────────────────────────────── */
const firebaseConfig = {
    apiKey:            "AIzaSyAKP2b_cT4PCY8Zqus6NGRG9vkGNcYPCH4",
    authDomain:        "suwon-housing-report.firebaseapp.com",
    databaseURL:       "https://suwon-housing-report-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "suwon-housing-report",
    storageBucket:     "suwon-housing-report.firebasestorage.app",
    messagingSenderId: "162387866253",
    appId:             "1:162387866253:web:519ad31b1b72d5cf34a8c4"
};

/* ── Firebase 초기화 ─────────────────────────────────────────── */
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

/* ── 전역 상태 ───────────────────────────────────────────────── */
let dongData  = null;
let userVoted = false;

/* ══════════════════════════════════════════════════════════════
   진입점
   ══════════════════════════════════════════════════════════════ */
async function initParticipation() {
    try {
        const res = await fetch('./data/suwon_dong_data.geojson');
        const gj  = await res.json();
        dongData  = gj.features.map(f => f.properties);
    } catch(e) {
        console.warn('GeoJSON 로드 실패:', e);
    }

    initSearch();
    initVote();
    initVoices();
    initShare();
}

/* ══════════════════════════════════════════════════════════════
   1. 내 동네 찾기
   ══════════════════════════════════════════════════════════════ */
function initSearch() {
    const input  = document.getElementById('dong-input');
    const btn    = document.getElementById('dong-search-btn');
    const result = document.getElementById('dong-result');
    if (!input || !btn || !result || !dongData) return;

    const datalist = document.getElementById('dong-list');
    if (datalist) {
        dongData.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.dong;
            datalist.appendChild(opt);
        });
    }

    function search() {
        const q = input.value.trim();
        if (!q) return;
        const found = dongData.find(d => d.dong === q || d.dong.includes(q));

        if (!found) {
            result.innerHTML = `<p style="color:rgba(245,241,234,.6)">
                "<strong>${q}</strong>"을 찾을 수 없습니다.<br>
                수원시 44개 행정동 이름을 정확히 입력해 주세요.</p>`;
            result.classList.add('visible');
            return;
        }

        const level =
            found.blind_spot > 80 ? { label: '매우 심각', color: '#8B1A1A' } :
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

/* ══════════════════════════════════════════════════════════════
   2. 투표 — Firebase 실시간
   ══════════════════════════════════════════════════════════════ */
function initVote() {
    const btns = document.querySelectorAll('.vote-btn');
    if (!btns.length) return;

    /* 실시간 집계 구독 */
    onValue(ref(db, 'votes'), snapshot => {
        const data  = snapshot.val() || {};
        const total = Object.values(data).reduce((s, v) => s + (v || 0), 0);
        if (!total) return;

        Object.entries(data).forEach(([key, val]) => {
            const bar = document.querySelector(`[data-bar="${key}"]`);
            const pct = document.querySelector(`[data-pct="${key}"]`);
            if (!bar || !pct) return;
            const p = Math.round((val || 0) / total * 100);
            bar.style.width = p + '%';
            pct.textContent = p + '%';
        });
    });

    /* 투표 버튼 클릭 */
    btns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (userVoted) return;
            const key = btn.dataset.vote;

            try {
                await runTransaction(ref(db, `votes/${key}`), v => (v || 0) + 1);
                userVoted = true;
                btns.forEach(b => {
                    b.disabled      = true;
                    b.style.opacity = b.dataset.vote === key ? '1' : '0.35';
                });
                const thanks = document.getElementById('vote-thanks');
                if (thanks) thanks.classList.add('visible');
            } catch(e) {
                console.error('투표 실패:', e);
                alert('투표 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            }
        });
    });
}

/* ══════════════════════════════════════════════════════════════
   3. 소리함
   ══════════════════════════════════════════════════════════════ */
function initVoices() {
    initVoiceInput();
    initFloatingVoices();
}

function initVoiceInput() {
    const form    = document.getElementById('voice-form');
    const input   = document.getElementById('voice-input');
    const counter = document.getElementById('voice-counter');
    const submit  = document.getElementById('voice-submit');
    const thanks  = document.getElementById('voice-thanks');
    if (!form || !input) return;

    const MAX = 60;

    input.addEventListener('input', () => {
        input.value = input.value.slice(0, MAX);
        if (counter) counter.textContent = `${input.value.length} / ${MAX}`;
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        submit.disabled    = true;
        submit.textContent = '전송 중…';

        try {
            await push(ref(db, 'voices'), {
                text,
                timestamp: serverTimestamp()
            });
            input.value = '';
            if (counter) counter.textContent = `0 / ${MAX}`;
            if (thanks) {
                thanks.classList.add('visible');
                setTimeout(() => thanks.classList.remove('visible'), 3000);
            }
        } catch(e) {
            console.error('소리함 저장 실패:', e);
            alert('전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            submit.disabled    = false;
            submit.textContent = '목소리 남기기';
        }
    });
}

function initFloatingVoices() {
    const stage = document.getElementById('voices-stage');
    if (!stage) return;

    const pool = [];

    onValue(query(ref(db, 'voices'), limitToLast(40)), snapshot => {
        const data = snapshot.val();

        /* 기존 말풍선 제거 */
        pool.forEach(el => el.remove());
        pool.length = 0;

        if (!data) return;

        const texts = Object.values(data)
            .map(v => v.text)
            .filter(Boolean)
            .reverse();

        texts.forEach((text, i) => {
            setTimeout(() => {
                const bubble = spawnBubble(stage, text);
                pool.push(bubble);
            }, i * 350);
        });
    });
}

function spawnBubble(stage, text) {
    const el = document.createElement('span');
    el.className   = 'voice-bubble';
    el.textContent = text;

    const x     = 5  + Math.random() * 85;
    const y     = 60 + Math.random() * 30;
    const scale = 0.7 + Math.random() * 0.6;
    const dur   = 20  + Math.random() * 15;
    const delay = Math.random() * 5;
    const drift = (Math.random() - 0.5) * 15;
    const op    = 0.35 + Math.random() * 0.45;

    el.style.cssText = `
        left: ${x}%; top: ${y}%;
        font-size: ${scale}rem;
        opacity: ${op};
        --drift: ${drift}px;
        animation: floatUp ${dur}s ${delay}s ease-in-out infinite;
    `;

    stage.appendChild(el);
    return el;
}

/* ══════════════════════════════════════════════════════════════
   4. 공유하기
   ══════════════════════════════════════════════════════════════ */
function initShare() {
    const btn = document.getElementById('share-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const data = {
            title: '보이지 않던 집 — 수원 노후주택 사각지대',
            text:  '수원화성이 세계문화유산이 되는 동안, 성곽 아래 마을은 시간이 멈췄습니다.',
            url:   window.location.href
        };
        if (navigator.share) {
            try { await navigator.share(data); } catch(e) {}
        } else {
            await navigator.clipboard.writeText(window.location.href);
            btn.textContent = '링크 복사됨 ✓';
            setTimeout(() => { btn.textContent = '이 보고서 공유하기'; }, 2500);
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   실행
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', initParticipation);