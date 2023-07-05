import { pluginClient } from '@quasipanacea/common/client/index.js'

import { metadata } from './_isomorphic.ts'
import { default as component } from './PodPlaintext.vue'

export async function init() {
	pluginClient.register({
		metadata,
		component,
	})
}
