import { link } from '../src/inject.js';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert';

describe('link', () => {
    it('injects dependencies into HTML', async () => {
        const htmlUrl = new URL('./fixtures/link/index.html', import.meta.url)
        const result = await link(htmlUrl, { noFetch: true })
        const expected = await fs.promises.readFile(new URL('./snapshots/link/index.snapshot.html', import.meta.url), 'utf8')
        assert.strictEqual(result, expected)
    })
    it('injects dependencies to top of <html> if there is no <head> tag', async () => {
        const htmlUrl = new URL('./fixtures/link/no-head.html', import.meta.url)
        const result = await link(htmlUrl, { noFetch: true })
        const expected = await fs.promises.readFile(new URL('./snapshots/link/no-head.snapshot.html', import.meta.url), 'utf8')
        assert.strictEqual(result, expected)
    });
})
