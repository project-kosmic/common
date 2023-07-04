import { pluginServer } from '@quasipanacea/common/server/index.ts'

import { metadata } from './_isomorphic.ts'
import * as exports from './podExcalidraw.ts'

export async function init() {
	pluginServer.register({
		metadata,
		...exports,
	})
}
