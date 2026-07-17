import { useSnapshot } from 'valtio';
import store from '../Store';

export function setScale() {
	const gc = gcd()
	let initial_scale = 1
	const { w, h } = { w: 16, h: 9 };

	if ((gc * window.innerWidth) / (gc * window.innerHeight) > w / h) {
		initial_scale = vh(27) / 150;
	} else {
		initial_scale = ( h * vw(27) / w) / 150;
	}

	store.scale = Math.min(1, initial_scale);
}

function vh(v: number) {
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  return (v * h) / 100;
}
function vw(v: number) {
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  return (v * w) / 100;
}
function gcd(a = window.innerWidth, b = window.innerHeight): number {
  return (b == 0) ? a : gcd (b, a % b);
}


const FIT = { gutterX: 10, gapTop: 10, gapBottom: 10, maxScale: 1, minScale: 0.25 };

const rectOf = (sel: string) => {
	const el = document.querySelector(sel) as HTMLElement | null;
	if (!el) return null;
	const r = el.getBoundingClientRect();
	return r.height > 0 && r.width > 0 ? r : null;
};

export function fitMobileMenu() {
	const root = document.documentElement;
	const holder = document.getElementById('menuCardHolder');
	const mobile = document.body.classList.contains('sb-mobile');
	if (!mobile || (holder && holder.classList.contains('small-iframe'))) {
		root.style.removeProperty('--menu-fit-scale');
		root.style.removeProperty('--menu-fit-ty');
		return;
	}
	if (!holder) return;
	const w = (holder as HTMLElement).offsetWidth;
	const h = (holder as HTMLElement).offsetHeight;
	if (!w || !h) return;

	const portrait = document.body.classList.contains('sb-portrait');
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	let bandTop = 0;
	const topRails = portrait ? ['.game-buttons', '.auth-buttons'] : ['.title-img'];
	for (const sel of topRails) {
		const r = rectOf(sel);
		if (r) bandTop = Math.max(bandTop, r.bottom);
	}
	let bandBottom = vh;
	{
		const el = document.querySelector('.bottom-left-buttons') as HTMLElement | null;
		if (el && !holder.contains(el)) {
			const r = el.getBoundingClientRect();
			if (r.height > 0 && r.width > 0) bandBottom = Math.min(bandBottom, r.top);
		}
		const fw = document.querySelector('#menuCardHolder .fullWidth') as HTMLElement | null;
		if (fw && getComputedStyle(fw).position === 'fixed') {
			const r = fw.getBoundingClientRect();
			if (r.height > 0 && r.width > 0) bandBottom = Math.min(bandBottom, r.top);
		}
	}

	const corridorTop = bandTop + FIT.gapTop;
	const corridorBottom = bandBottom - FIT.gapBottom;
	let availW = Math.max(40, vw - FIT.gutterX * 2);
	if (!portrait) {
		let halfW = vw / 2 - FIT.gutterX;
		for (const sel of ['.game-buttons', '.auth-buttons']) {
			const r = rectOf(sel);
			if (!r || r.bottom <= corridorTop || r.top >= corridorBottom) continue;
			if (r.left < vw / 2) halfW = Math.min(halfW, vw / 2 - r.right - FIT.gutterX);
			if (r.right > vw / 2) halfW = Math.min(halfW, r.left - vw / 2 - FIT.gutterX);
		}
		availW = Math.max(40, halfW * 2);
	}
	const availH = Math.max(40, corridorBottom - corridorTop);

	let designH = h;
	const hr = (holder as HTMLElement).getBoundingClientRect();
	if (hr.width > 1) {
		const ps = hr.width / w;
		const ad = document.getElementById('adBelow');
		const adWrap = ad ? (ad.parentElement as HTMLElement | null) : null;
		const adInFlow = ad && (!adWrap || getComputedStyle(adWrap).position !== 'fixed');
		const ar = adInFlow ? ad!.getBoundingClientRect() : null;
		const unionBottom = Math.max(hr.bottom, ar && ar.height > 0 ? ar.bottom : hr.bottom);
		designH = Math.max(h, (unionBottom - hr.top) / ps);
	}

	let fit = Math.max(FIT.minScale, Math.min(FIT.maxScale, Math.min(availW / w, availH / designH)));
	if (!portrait) fit = Math.min(FIT.maxScale, Math.max(fit, 0.58));
	const s = store.scale || 1;

	if (!portrait) {
		const fw = document.querySelector('#menuCardHolder .fullWidth') as HTMLElement | null;
		if (fw && getComputedStyle(fw).position === 'fixed') {
			const r = fw.getBoundingClientRect();
			if (r.height > 2) {
				const cur = parseFloat(root.style.getPropertyValue('--ad-ty')) || 0;
				const delta = (vh - 4 - r.bottom) / s;
				if (Math.abs(delta) > 1) root.style.setProperty('--ad-ty', (cur + delta) + 'px');
			}
		}
	} else {
		root.style.removeProperty('--ad-ty');
	}

	root.style.setProperty('--menu-fit-scale', String(fit / s));
	const centre = (corridorTop + corridorBottom) / 2 - ((designH - h) * fit) / 2;
	root.style.setProperty('--menu-fit-ty', ((centre - vh / 2) / s) + 'px');
}

export function fitMobileLeaderboard() {
	const root = document.documentElement;
	const lb = document.querySelector('.leaderboard') as HTMLElement | null;
	const active = document.body.classList.contains('sb-mobile')
		&& document.body.classList.contains('sb-landscape') && lb;
	if (!active) { root.style.removeProperty('--lb-fit'); return; }

	const nw = lb!.offsetWidth || 1;
	const nh = lb!.offsetHeight || 1;
	const cap = 0.72;
	let fit = cap;
	try {
		const g: any = (window as any).phaser_game;
		const sc = g && g.scene && g.scene.getMain && g.scene.getMain();
		const base = sc && sc.controls && sc.controls.aimJoystick && sc.controls.aimJoystick.base;
		const canvas = g && g.canvas;
		if (sc && base && canvas && base.y > 0) {
			const hs = (sc.hud && sc.hud.scale) || 1;
			const r = typeof sc.controls.stickRadius === 'function' ? sc.controls.stickRadius() : 130 * hs;
			const rect = canvas.getBoundingClientRect();
			const bw = (sc.scale && sc.scale.width) || rect.width;
			const bh = (sc.scale && sc.scale.height) || rect.height;
			const rx = rect.width / bw;
			const ry = rect.height / bh;
			const reach = Math.max(r, (128 + 55) * hs);
			const clusterTopCss = rect.top + (base.y - reach) * ry;
			const clusterLeftCss = rect.left + (base.x - reach) * rx;
			const lbTop = 12;
			const fitV = (clusterTopCss - 6 - lbTop) / nh;
			const clearsSideways = (window.innerWidth - 12 - nw * cap) >= (clusterLeftCss + 2 * reach * rx);
			fit = clearsSideways ? cap : Math.max(0.5, Math.min(cap, fitV));
		}
	} catch (e) { }
	root.style.setProperty('--lb-fit', String(fit));
}

function fitAll() { fitMobileMenu(); fitMobileLeaderboard(); }
function refit() { setScale(); requestAnimationFrame(fitAll); }

window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => { refit(); setTimeout(fitAll, 250); });
setInterval(fitAll, 500);
setScale();

export function useScale(translate?: boolean) {
	const scale = useSnapshot(store).scale;
	const style = {
		'--scale': scale,
		transform: `scale(${scale})`,
	};
	if (translate) {
		style.transform = `translate(-50%, -50%) scale(${scale})`;
	}
	return {styles: style, factor: scale};
}
