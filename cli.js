#!/usr/bin/env node

import cac from 'cac'
import { inject } from './src/inject.js'

const cli = cac('module_preload')

cli.option('--root <root>', 'Root')
cli.option('--no-fetch', 'No fetch')
cli.option('--w', 'Write')
cli.option('--o <out>', 'Out')

cli.command('inject [...files]', 'Inject files')
    .action(async (files, options) => {
        const { root, fetch: doFetch } = options
        files.forEach(async filePath => {
            const defaultOut = options.w ? filePath : null
            const out = options.o ? options.o : defaultOut
            await inject(filePath, { root, out, noFetch: !doFetch })
        })
    })

cli.help()
cli.parse()

