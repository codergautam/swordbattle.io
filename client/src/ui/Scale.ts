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


window.addEventListener('resize', setScale);
window.addEventListener('orientationchange', setScale);
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
