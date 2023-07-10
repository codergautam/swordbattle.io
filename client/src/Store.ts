import { proxy } from 'valtio';

const store = proxy({
	scale: 1,
});

export default store;
