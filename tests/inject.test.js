import { link } from '../src/inject.js';
import test from 'node:test';

test('inject', async (t) => {
    const htmlUrl = new URL('./fixtures/index.html', import.meta.url)
    console.log(await link(htmlUrl, { noFetch: true }))
});
