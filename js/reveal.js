/* ================================================================
reveal.js — 스크롤 기반 요소 등장 + 카운트업
================================================================ */
'use strict';

/* 스크롤 진입 감지 */
const revealObserver = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (!entry.isIntersecting) return;
		entry.target.classList.add('revealed');
		
		// 숫자 카운트업
		entry.target.querySelectorAll('[data-count]').forEach(el => {
			if (el.dataset.counted) return;
			el.dataset.counted = 'true';
			countUp(el);
		});
		
		// 타임라인 아이템
		if (entry.target.classList.contains('timeline-item')) {
			entry.target.classList.add('visible');
		}
	});
}, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('[data-reveal], .timeline-item').forEach(el => {
	revealObserver.observe(el);
});

/* stat-grid 개별 아이템도 감지 */
const gridObserver = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (!entry.isIntersecting) return;
		entry.target.querySelectorAll('[data-count]').forEach((el, i) => {
			if (el.dataset.counted) return;
			setTimeout(() => {
				el.dataset.counted = 'true';
				countUp(el);
			}, i * 150);
		});
	});
}, { threshold: 0.3 });

document.querySelectorAll('.stat-grid').forEach(el => gridObserver.observe(el));

/* 카운트업 함수 */
function countUp(el) {
	const target   = parseFloat(el.dataset.count);
	const duration = 1600;
	const start    = performance.now();
	const unit     = el.querySelector('.unit, .mini');
	const unitHTML = unit ? unit.outerHTML : '';
	
	function tick(now) {
		const progress = Math.min((now - start) / duration, 1);
		// easeOutExpo
		const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
		const current = target * eased;
		
		let display;
		if (target % 1 !== 0)       display = current.toFixed(1);
		else if (target >= 10000)   display = Math.round(current).toLocaleString('ko-KR');
		else                        display = Math.round(current);
		
		el.innerHTML = display + unitHTML;
		if (progress < 1) requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);
}

/* 진행 바 */
const progressBar = document.getElementById('progress-bar');
if (progressBar) {
	window.addEventListener('scroll', () => {
		const h = document.documentElement;
		const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
		progressBar.style.width = pct + '%';
	}, { passive: true });
}
