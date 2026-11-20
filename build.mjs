#!/usr/bin/env node
/**
 * 把 src/ 下的源码拼成根目录的 xiaoce-map-fullscreen.user.js。
 *
 * 用法：node build.mjs
 * 只依赖 Node.js（>=16），不需要安装任何依赖。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outputFile = join(root, 'xiaoce-map-fullscreen.user.js');

// 顺序即最终脚本中的顺序；新增源码文件时记得加到这里。
const chunks = [
  '10-constants.js',
  '20-style.js',
  '30-utils.js',
  '40-scale.js',
  '50-mode-settings.js',
  '60-question.js',
  '70-fullscreen.js',
  '80-controls.js',
  '90-longpress.js',
  '100-events.js',
  '110-init.js',
];

const read = (name) => readFileSync(join(root, 'src', name), 'utf8').trimEnd();

const header = read('00-header.txt');
const body = chunks.map(read).join('\n\n');

const output = `${header}\n\n(function () {\n  'use strict';\n\n${body}\n})();\n`;

writeFileSync(outputFile, output, 'utf8');
console.log(`built ${outputFile} (${chunks.length} src files)`);
