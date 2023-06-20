import { plugin } from '@quasipanacea/common/server/index.ts'

import { metadata } from './_isomorphic.ts'
import * as exports from './podLatex.ts'

export async function init() {
	await plugin.register({
		metadata,
		...exports,
	})
}