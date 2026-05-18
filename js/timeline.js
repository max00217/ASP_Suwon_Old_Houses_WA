/* ================================================================
timeline.js — data/stats.json 에서 타임라인 데이터 불러와서 렌더
================================================================ */
'use strict';

async function initTimeline() {
	const container = document.getElementById('timeline');
	if (!container) return;
	
	const res  = await fetch('./data/stats.json');
	const data = await res.json();
	
	container.innerHTML = data.timeline.map(item => `
		<div class="timeline-item" style="transition-delay:0s">
			<div class="timeline-dot"></div>
			<div class="timeline-year">${item.year}</div>
			<div class="timeline-text">
				${item.event}
				<span class="timeline-tag timeline-tag--${item.type}">
					${{ regulation:'규제', support:'지원', heritage:'유산', research:'연구' }[item.type]}
				</span>
			</div>
		</div>
    `).join('');
		
		// 등장 Observer 연결
		const observer = new IntersectionObserver(entries => {
			entries.forEach((e, i) => {
				if (!e.isIntersecting) return;
				setTimeout(() => e.target.classList.add('visible'), i * 80);
			});
		}, { threshold: 0.15 });
		
		container.querySelectorAll('.timeline-item').forEach(el => observer.observe(el));
	}
	
	document.addEventListener('DOMContentLoaded', initTimeline);
