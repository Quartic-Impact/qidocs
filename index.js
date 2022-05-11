#!/usr/bin/env node

const hb = require("handlebars");
const path = require("path");
const fs = require("fs");

const [, , ...args] = process.argv;

let files = {};

function resolveFilesRecursively(absPath) {
	let currentDir = fs.readdirSync(absPath, {
		withFileTypes: true
	});
	currentDir.forEach(ent => {
		if (ent.isFile())
			files[path.join(absPath, ent.name)] = [];
		else if (ent.isDirectory())
			resolveFiles(path.join(absPath, ent.name));
	});
}

function resolveFiles(absPath) {
	let currentDir = fs.readdirSync(absPath, {
		withFileTypes: true
	});
	currentDir.forEach(ent => {
		if (ent.isFile())
			files[path.join(absPath, ent.name)] = [];
	});
}

const definedOut = args.findIndex(_ => _ === "-o");
let outPath = path.join(process.cwd(), "qidoc");
if (definedOut !== -1 && args[definedOut + 1]) {
	outPath = path.join(process.cwd(), args[definedOut + 1]);
}

if (!fs.existsSync(outPath)) {
	fs.mkdirSync(outPath);
}

// Whether should recurse the provided directory
const recurse = args.findIndex(_ => _ === "-r") !== -1;

// Determine the path we wish to search for the files in
let where = args.find(_ => _.charAt(0) !== "-");

// Default to the cwd
if (where === undefined) {
	where = process.cwd();
} else if (where.charAt(1) !== ":") {
	where = path.join(process.cwd(), where);
}

// Poll for the files 
if (recurse) {
	resolveFilesRecursively(where);
} else {
	resolveFiles(where);
}


// Captures comment blocks
const COMMENT_BLOCKS = /\/\*\*((?:.)*?)\*\//gsi;
// Captures method names
const METHOD_NAMES = /\*\/(?:\n|\s)*([$_A-Za-z][$_A-Za-z0-9]*)\(/gsi;

const MODULE = /ig\.module\("(.*)"/gmi;

const EXTENDS = /(?:\s|\n)*([\n.a-z$_ ][ \n.a-z$_0-9]*)(?:\s|\n)*=(?:\s|\n)*([\n.a-z$_ ][ \n.a-z$_0-9]*)(?:\s|\n)*\.extend/gsi

Object.keys(files).forEach(file => {
	const contents = fs.readFileSync(file, "utf-8");

	const modules = [...contents.matchAll(MODULE)];
	const comment_blocks = [...contents.matchAll(COMMENT_BLOCKS)];
	const methods = [...contents.matchAll(METHOD_NAMES)];
	const extend = [...contents.matchAll(EXTENDS)];

	let all = [];
	all.push(
		...modules.map(_ => ({
			index: _.index,
			match: _[1],
			type: 0,
		})),
		...comment_blocks.map(_ => ({
			index: _.index,
			match: _[1],
			type: 1,
		})),
		...methods.map(_ => ({
			index: _.index,
			match: _[1],
			type: 2,
		})),
		...extend.map(_ => ({
			index: _.index,
			match: {
				class: _[1],
				ext: _[2]
			},
			type: 3,
		})),
	);

	all.sort((a, b) => a.index - b.index);
	files[file] = all;
});

let docTree = {}
Object.keys(files).forEach(file => {
	const fileName = path.parse(file).base + ".html";
	const matches = files[file];
	const relative = path.parse(path.relative(where, file)).dir;
	const rawOutPath = path.join(outPath, "raw", relative);

	if (!fs.existsSync(rawOutPath)) {
		fs.mkdirSync(rawOutPath);
	}

	fs.writeFileSync(path.join(rawOutPath, fileName), fs.readFileSync(file, "utf-8"));


	/**
	 * @type {
	 * 	file
	 * 		modules
	 * 			classes
	 * 				properties
	 * 				methods
	 * 
	 * }
	 */
	let currentModule = "";
	let modules = [];
	matches.forEach(match => {
		switch (match.type) {
			// module
			case 0: {
				currentModule = match.match;
				modules.push(match.match);
				break;
			}
			// methods
			case 1: {
				break;
			}
			// comment blocks
			case 2: {
				break;
			}
			// classes
			case 3: {
				break;
			}
			default: {
				throw new Error("Expected match type");
			}
		}
	});
});

console.log(files);