import { t } from '@quasipanacea/common/index.ts'
import { z } from 'zod'
import * as types from '@quasipanacea/common/types.ts'

export const metadata: t.ModelIsomorphicPlugin_t['metadata'] = {
	id: 'flat',
	family: 'model',
	format: 'x-multipart/x-flat',
}

export const Typings = z.object({
	description: z.string(),
	tags: z.array(t.String),
})
export type Typings_t = z.infer<typeof Typings>

export namespace Foo {
	export interface PodExtras {
		extendedKey: string
		'plugin-model-flat': Typings_t
	}
}
