import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	TFile,
	PluginSettingTab,
	Setting,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	PluginManifest,
	MarkdownRenderer, TFolder
} from 'obsidian';
var alasql = require('alasql');
import { parse } from "yaml";




// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}


function extractMarkDownTable(content: String) {
	let rows = content.split("\n");
	let headRow = rows[0];
	let headCols = headRow.split("|");
	let results = [];
	for (let i = 2; i < rows.length; i++) {
		let row = rows[i];
		let cols = row.split("|");
		let obj = {};
		for (let j = 1; j < headCols.length - 1; j++) {
			let val = cols[j].trim();
			let numVal = Number(val);
			obj[headCols[j].trim()] = isNaN(numVal) ? val : numVal;
		}
		results.push(obj);
	}
	return results;
}

function listToMarkdownTableTxt(dataList: any): string {
	if (dataList) {
		let results = []
		const first = dataList[0]
		const headers: any = []
		for (let key in first) {
			headers.push(key)
		}

		results.push(formatHeaderLine(headers))
		dataList.map((data: any) => {
			results.push(formatDataLine(data, headers))
		});
		const txt = results.join("\n");
		return txt

	} else {
		return ""
	}
}

function formatHeaderLine(headers: any) {
	const size = headers.length;
	let line1 = ""
	let line2 = ""
	for (let i = 0; i < size; i++) {
		line1 += "|" + headers[i];
		line2 += "|" + "------";
	}

	line1 += "|"
	line2 += "|"
	return line1 + "\n" + line2
}

function formatDataLine(dataObj: any, headers: any) {
	let line = ""
	headers.map((key: any) => {
		line += "|" + dataObj[key];
	})

	line += "|"
	return line
}


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	ctx: MarkdownPostProcessorContext;

	postprocessor = async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		let path = ctx.sourcePath;
		await this.renderer.renderData(source, el, ctx);
	}

	javascriptProcessor = async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		let path = ctx.sourcePath;
		await this.runner.run(source, el, ctx);
	}

	renderer: SqlRender;
	runner: CodeRunner;
	async onload() {
		await this.loadSettings();
		this.renderer = new SqlRender(this);
		this.runner = new CodeRunner(this);
		this.registerMarkdownCodeBlockProcessor("table-sql", this.postprocessor);

	}

	onunload() { }

	reload() {
		this.onunload();
		this.onload();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SqlRender {
	plugin: MyPlugin;
	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}

	async renderData(source: any, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		this.plugin.app.workspace.onLayoutReady(() =>
			ctx.addChild(new SqlRenderChild(this, el, ctx.sourcePath, source))
		);
	}
}

class SqlRenderChild extends MarkdownRenderChild {

	renderer: SqlRender;
	ownPath: string;
	el: HTMLElement;
	source: string;

	constructor(renderer: SqlRender, el: HTMLElement, ownPath: string, source: string) {
		super(el);
		this.renderer = renderer;
		this.el = el;
		this.ownPath = ownPath;
		this.source = source;
		this.changeHandler = this.changeHandler.bind(this);
		this.reload = this.reload.bind(this);
	}

	async onload() {
		let curPath = this.renderer.plugin.app.vault.getAbstractFileByPath(
			this.ownPath
		);

		const yaml = parse(this.source);

		let tablePath;
		if (yaml.tablePath) {
			tablePath = this.renderer.plugin.app.vault.getAbstractFileByPath(
				yaml.tablePath
			);
		}

		let childPath: (TFile | null)[] = []
		if (tablePath && tablePath instanceof TFolder) {
			childPath = tablePath.children.map(item => {
				if (item instanceof TFile) {
					return item;
				} else {
					return null
				}
			}).filter(item => item != null);
		} else if (tablePath && tablePath instanceof TFile) {
			childPath.push(tablePath);
		}

		childPath.push((curPath as TFile))

		async function loadAllData(pathList: (TFile | null) [], app: App, result: {}[]) {
			pathList.map(async path => {
				if (path != null) {
					const pos = app.metadataCache
						.getFileCache(path)
						?.sections?.find((p) => p.id === tableId);
					if (pos) {
						const position = pos.position;
						app.vault.cachedRead(path as TFile)
							.then((value)=> {
								const tableString = value.substring(position.start.offset, position.end.offset)
								let list = extractMarkDownTable(tableString);
								list.forEach((data) => {
									if (data) {
										result.push(data)
									}
								})
							})
					}
				}
			});
		}
		const sqlList = yaml.sql;
		const tableId = yaml.table;

		const data: any[] = []
		await loadAllData(childPath, this.renderer.plugin.app, data)

		let dataList: any = []
		sqlList.forEach((sql: any) => {
			let tmp = alasql(sql, [data]);
			tmp.forEach((item: any) => {
				dataList.push(item)
			})
		})

		const txt = listToMarkdownTableTxt(dataList)
		const el = this.el.createEl("div")
		if(curPath) {
			await MarkdownRenderer.renderMarkdown(txt, el, curPath.path, this)
		}

		this.renderer.plugin.app.metadataCache.on("changed", this.changeHandler);
	}

	changeHandler(file: TFile) {
		this.reload();
	}

	reload() {
		this.onunload();
		this.onload();
	}

	onunload() {
		this.renderer.plugin.app.metadataCache.off("changed", this.changeHandler);
		this.el.empty();
	}
}

class CodeRunner {
	plugin: MyPlugin;
	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}

	async run(source: any, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		this.plugin.app.workspace.onLayoutReady(() =>
			ctx.addChild(new CodeRunnerChild(this, el, ctx.sourcePath, source))
		);
	}
}

class CodeRunnerChild extends MarkdownRenderChild {
	runner: CodeRunner;
	ownPath: string;
	el: HTMLElement;
	source: string;

	constructor(runner: CodeRunner, el: HTMLElement, ownPath: string, source: string) {
		super(el);
		this.runner = runner;
		this.el = el;
		this.ownPath = ownPath;
		this.source = source;
		this.changeHandler = this.changeHandler.bind(this);
		this.reload = this.reload.bind(this);
	}


	async onload() {
		// let result = eval(this.source);
		// this.el.createEl("p", { text: result })
		this.runner.plugin.app.metadataCache.on("changed", this.changeHandler);
	}


	changeHandler(file: TFile) {
		this.reload();
	}

	reload() {
		this.onunload();
		this.onload();
	}

	onunload() {
		this.runner.plugin.app.metadataCache.off("changed", this.changeHandler);
		this.el.empty();
	}
}
