import * as path from 'std/path/mod.ts'
import { z } from 'zod'
import * as pluginServer from './pluginServer.ts'

import * as t from '../types.ts'
import { utilPlugin, utilResource } from './index.ts'
import * as util from './util.ts'

// utility
async function runHook<
	PluginFamilySingular extends t.PluginFamilySingular_t,
	PluginFamilyPlural extends t.PluginFamilyPlural_t,
>(
	pluginFamilySingular: PluginFamilySingular,
	pluginFamilyPlural: PluginFamilyPlural,
	hook: 'add' | 'remove',
	uuid: string,
): Promise<void> {
	if (
		pluginFamilyPlural === 'overviews' ||
		pluginFamilyPlural === 'themes' ||
		pluginFamilyPlural === 'packs'
	) {
		// TODO
		throw new TypeError(`'${pluginFamilyPlural}' value not supported`)
	}

	let resource
	const resourcesJson = await getResourcesJson(pluginFamilyPlural)
	for (const [uuidEntry, resourceEntry] of Object.entries(
		resourcesJson[pluginFamilyPlural],
	)) {
		if (uuid === uuidEntry) {
			resource = resourceEntry
			continue
		}
	}

	if (!resource) {
		throw new Error(
			`Resource not found with uuid '${uuid}' and familyPlural '${pluginFamilyPlural}'`,
		)
	}

	const settingsJson = await getSettingsJson()
	const pluginId = settingsJson?.podMimes?.[resource.format]
	if (!pluginId) {
		throw new Error(
			`pluginId could not be found for format '${resource.format}', uuid '${uuid}'`,
		)
	}

	const plugin = pluginServer.get<PluginFamilyPlural>(
		pluginFamilySingular,
		pluginId,
	)

	console.log('ad', pluginFamilyPlural, uuid)
	const dir = utilResource.getResourceDir(pluginFamilyPlural, uuid)
	if (!dir) {
		throw new Error(
			`dir is not defined for family ${pluginFamilyPlural}, ${uuid}`,
		)
	}

	if (hook === 'add') {
		if (plugin.hooks && plugin.hooks.makeState && plugin.hooks.onAdd) {
			const state = await plugin.hooks.makeState({
				dir,
				singular: resource,
			})
			await plugin.hooks.onAdd({ dir, state, singular: resource })
		}
	} else {
		if (plugin.hooks && plugin.hooks.makeState && plugin.hooks.onRemove) {
			const state = await plugin.hooks.makeState({
				dir,
				singular: resource,
			})
			await plugin.hooks.onRemove({ dir, state, singular: resource })
		}
	}
}

// generic
export async function resourceAdd(
	input: Record<string, unknown>,
	rJsonFile: string,
	rJsonFn: () => Promise<Record<string, any>>,
	key: string,
): Promise<string> {
	const uuid = crypto.randomUUID()

	const rJson = await rJsonFn()
	rJson[key][uuid] = input
	await Deno.writeTextFile(rJsonFile, util.jsonStringify(rJson))

	const dir = getPodDir(uuid)
	await Deno.mkdir(dir, { recursive: true })

	runHook('pod', 'pods', 'add', uuid)

	return uuid
}

export async function resourceRemove(
	input: { uuid: string },
	rJsonFile: string,
	rJsonFn: () => Promise<Record<string, any>>,
	key: string,
): Promise<void> {
	runHook('pod', 'pods', 'remove', input.uuid)

	const dir = getPodDir(input.uuid)
	await Deno.mkdir(dir, { recursive: true })

	const rJson = await rJsonFn()
	if (rJson[key][input.uuid]) {
		delete rJson[key][input.uuid]
	}
	await Deno.writeTextFile(rJsonFile, util.jsonStringify(rJson))
}

export async function resourceModify<Resource_t>(
	input: {
		uuid: string
		data: Record<string, unknown>
	},
	rJsonFile: string,
	rJsonFn: () => Promise<Record<string, any>>,
	key: string,
): Promise<Resource_t> {
	const rJson = await rJsonFn()

	if (!(input.uuid in rJson[key])) {
		throw new Error(`Failed to find uuid ${input.uuid}`)
	}

	rJson[key][input.uuid] = {
		...rJson[key][input.uuid],
		...input.data,
	}
	await Deno.writeTextFile(rJsonFile, util.jsonStringify(rJson))

	return {
		...rJson[key][input.uuid],
		uuid: input.uuid,
	}
}

export async function resourceModifyExtra<Resource_t>(
	input: {
		uuid: string
		field: string
		data: Record<string, unknown>
	},
	rJsonFile: string,
	rJsonFn: () => Promise<Record<string, any>>,
	key: string,
): Promise<Resource_t> {
	const rJson = await rJsonFn()

	if (!(input.uuid in rJson[key])) {
		throw new Error(`Failed to find uuid ${input.uuid}`)
	}

	if (!('extra' in rJson[key][input.uuid])) {
		rJson[key][input.uuid].extra = {}
	}

	if (!(input.field in rJson[key][input.uuid].extra)) {
		rJson[key][input.uuid].extra[input.field] = {}
	}

	rJson[key][input.uuid].extra[input.field] = {
		...rJson[key][input.uuid].extra[input.field],
		...input.data,
	}
	await Deno.writeTextFile(rJsonFile, util.jsonStringify(rJson))

	return {
		...rJson[key][input.uuid],
		uuid: input.uuid,
	}
}

export async function resourceList<Resource_t>(
	rJsonFn: () => Promise<Record<string, any>>,
	key: string,
): Promise<Resource_t[]> {
	const rJson = await rJsonFn()

	const resources = []
	for (const [uuid, obj] of Object.entries<Record<string, unknown>>(
		rJson[key],
	)) {
		resources.push({
			...obj,
			uuid,
		})
	}

	return resources as Resource_t[]
}

// dir
export function getResourcesDir(
	resourceName: t.PluginFamilyPluralHasFile_t,
): string {
	return path.join(util.getDataDir(), resourceName)
}

export function getOrbsDir(): string {
	return path.join(util.getDataDir(), 'orbs')
}

export function getLinksDir(): string {
	return path.join(util.getDataDir(), 'links')
}

export function getModelsDir(): string {
	return path.join(util.getDataDir(), 'models')
}

export function getPodsDir(): string {
	return path.join(util.getDataDir(), 'pods')
}

// dir (instance)
export function getResourceDir(
	resourceName: t.PluginFamilyPluralHasFile_t,
	uuid: string,
) {
	return path.join(
		getResourcesDir(resourceName),
		uuid.slice(0, 2),
		uuid.slice(2),
	)
}

export function getOrbDir(uuid: string): string {
	return path.join(getOrbsDir(), uuid.slice(0, 2), uuid.slice(2))
}

export function getLinkDir(uuid: string): string {
	return path.join(getLinksDir(), uuid.slice(0, 2), uuid.slice(2))
}

export function getModelDir(uuid: string): string {
	return path.join(getModelsDir(), uuid.slice(0, 2), uuid.slice(2))
}

export function getPodDir(uuid: string): string {
	return path.join(getPodsDir(), uuid.slice(0, 2), uuid.slice(2))
}

// file
export function getResourcesJsonFile(
	resourceName: t.PluginFamilyPluralHasFile_t,
) {
	return path.join(util.getDataDir(), resourceName + '.json')
}

export function getOrbsJsonFile(): string {
	return path.join(util.getDataDir(), 'orbs.json')
}

export function getLinksJsonFile(): string {
	return path.join(util.getDataDir(), 'links.json')
}

export function getModelsJsonFile(): string {
	return path.join(util.getDataDir(), 'models.json')
}

export function getPodsJsonFile(): string {
	return path.join(util.getDataDir(), 'pods.json')
}

export function getSettingsJsonFile(): string {
	return path.join(util.getDataDir(), 'settings.json')
}

export function getIndexJsonFile(): string {
	return path.join(util.getDataDir(), 'index.json')
}

// json
const table = {
	// TODO
	orbs: t.SchemaOrbsJson,
	links: t.SchemaLinksJson,
	models: t.SchemaModelsJson,
	pods: t.SchemaPodsJson,
}
export async function getResourcesJson<
	ResourceName extends t.PluginFamilyPluralHasFile_t,
>(resourceName: ResourceName) {
	const jsonFile = getResourcesJsonFile(resourceName)
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = `{ "${resourceName}": {} }`
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<(typeof table)[ResourceName]>(
		JSON.parse(content),
		{
			orbs: t.SchemaOrbsJson,
			links: t.SchemaLinksJson,
			models: t.SchemaModelsJson,
			pods: t.SchemaPodsJson,
		}[resourceName],
	)
}

export async function getOrbsJson(): Promise<t.SchemaOrbsJson_t> {
	const jsonFile = getOrbsJsonFile()
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = '{ "orbs": {} }'
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<typeof t.SchemaOrbsJson>(
		JSON.parse(content),
		t.SchemaOrbsJson,
	)
}

export async function getLinksJson(): Promise<t.SchemaLinksJson_t> {
	const jsonFile = getLinksJsonFile()
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = '{ "links": {} }'
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<typeof t.SchemaLinksJson>(
		JSON.parse(content),
		t.SchemaLinksJson,
	)
}

export async function getModelsJson(): Promise<t.SchemaModelsJson_t> {
	const jsonFile = getModelsJsonFile()
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = '{ "models": {} }'
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<typeof t.SchemaModelsJson>(
		JSON.parse(content),
		t.SchemaModelsJson,
	)
}

export async function getPodsJson(): Promise<t.SchemaPodsJson_t> {
	const jsonFile = getPodsJsonFile()
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = '{ "pods": {} }'
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<typeof t.SchemaPodsJson>(
		JSON.parse(content),
		t.SchemaPodsJson,
	)
}

export async function getSettingsJson(): Promise<t.SchemaSettingsJson_t> {
	const jsonFile = getSettingsJsonFile()
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = '{}'
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<typeof t.SchemaSettingsJson>(
		JSON.parse(content),
		t.SchemaSettingsJson,
	)
}

export async function getIndexJson(): Promise<t.SchemaIndexJson_t> {
	const jsonFile = getIndexJsonFile()
	let content
	try {
		content = await Deno.readTextFile(jsonFile)
	} catch (err: unknown) {
		if (err instanceof Deno.errors.NotFound) {
			content = '{ "formats": {} }'
			await Deno.writeTextFile(jsonFile, content)
		} else {
			throw err
		}
	}

	return util.validateSchema<typeof t.SchemaIndexJson>(
		JSON.parse(content),
		t.SchemaIndexJson,
	)
}
