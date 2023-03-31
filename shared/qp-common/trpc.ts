import { initTRPC } from '@trpc/server'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

type Context = {
	zero: 0
}

export async function createContext(
	_opts: FetchCreateContextFnOptions,
): Promise<Context> {
	return {
		zero: 0,
	}
}

export const trpc = initTRPC.context<typeof createContext>().create()
