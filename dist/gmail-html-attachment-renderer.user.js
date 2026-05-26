// ==UserScript==
// @name         Gmail HTML Attachment Renderer
// @namespace    https://github.com/yuuchilyann
// @version      0.0.1
// @author       AYUCode
// @description  在 Gmail HTML 附件預覽中渲染內容(Shadow DOM + Trusted Types)
// @homepageURL  https://github.com/yuuchilyann/Gmail_HTML_Attachment_Renderer
// @supportURL   https://github.com/yuuchilyann/Gmail_HTML_Attachment_Renderer/issues
// @downloadURL  https://raw.githubusercontent.com/yuuchilyann/Gmail_HTML_Attachment_Renderer/main/dist/gmail-html-attachment-renderer.user.js
// @updateURL    https://raw.githubusercontent.com/yuuchilyann/Gmail_HTML_Attachment_Renderer/main/dist/gmail-html-attachment-renderer.user.js
// @match        https://mail.google.com/*
// @require      https://cdn.jsdelivr.net/npm/dompurify@3.4.5/dist/purify.min.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function(dompurify) {
  'use strict';
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	dompurify = __toESM(dompurify);
	var STYLE = "background:#1a73e8;color:white;padding:2px 6px;border-radius:3px;";
	var log = (...args) => {
		console.log("%c[HTMLRenderer]", STYLE, ...args);
	};
	var ttPolicy = null;
	if (window.trustedTypes?.createPolicy) try {
		ttPolicy = window.trustedTypes.createPolicy("html-attachment-renderer", { createHTML: (s) => s });
		log("Trusted Types policy 已建立");
	} catch (e) {
		log("TT policy 建立失敗:", e.message);
	}
	var setHTML = (el, html) => {
		el.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html;
	};
	var FORBID_TAGS = [
		"script",
		"iframe",
		"frame",
		"frameset",
		"object",
		"embed",
		"form",
		"input",
		"button",
		"textarea",
		"select",
		"option",
		"meta",
		"link",
		"base",
		"applet"
	];
	var FORBID_ATTR = [
		"onerror",
		"onload",
		"onclick",
		"onmouseover",
		"onmouseout",
		"onfocus",
		"onblur",
		"onchange",
		"onsubmit",
		"onreset",
		"onkeydown",
		"onkeyup",
		"onkeypress",
		"formaction",
		"srcset",
		"ping"
	];
	dompurify.default.addHook("uponSanitizeAttribute", (node, data) => {
		const el = node;
		if (el.tagName === "IMG" && data.attrName === "src") {
			const src = data.attrValue || "";
			if (src && !src.startsWith("data:") && !src.startsWith("cid:")) {
				el.setAttribute("data-original-src", src);
				el.setAttribute("alt", `[圖片已封鎖] ${(el.getAttribute("alt") || src).slice(0, 60)}`);
				el.setAttribute("style", "border:1px dashed #c66;padding:4px;color:#c66;font-size:12px;display:inline-block;min-width:60px;min-height:20px;");
				data.keepAttr = false;
			}
		}
		if (el.tagName === "A" && data.attrName === "href") {
			const href = data.attrValue || "";
			if (/^javascript:/i.test(href)) data.keepAttr = false;
			else if (/^https?:/i.test(href)) {
				el.setAttribute("rel", "noopener noreferrer");
				el.setAttribute("target", "_blank");
			}
		}
	});
	var sanitize = (rawHtml) => dompurify.default.sanitize(rawHtml, {
		FORBID_TAGS,
		FORBID_ATTR,
		ALLOW_DATA_ATTR: false,
		WHOLE_DOCUMENT: false
	});
	var fixCss = (html) => html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
		const lower = css.replace(/\b([A-Z][A-Z\-]+)(\s*:)/g, (_m, prop, colon) => prop.toLowerCase() + colon);
		return match.replace(css, lower);
	}).replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
		const fixed = css.replace(/(border(?:-(?:top|bottom|left|right))?:\s*[\d.]+px\s+solid)\s*;/gi, "$1 #666666;");
		return match.replace(css, fixed);
	});
	var shadowTemplate = `
  <style>
    :host { all: initial; display: flex; flex-direction: column; }
    .toolbar {
      flex: 0 0 auto;
      background:#202124;color:#e8eaed;
      font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;
      padding:6px 12px;display:flex;gap:12px;align-items:center;
      border-bottom:1px solid #3c4043;
    }
    .toolbar button {
      background:transparent;border:1px solid #5f6368;color:#e8eaed;
      padding:2px 10px;border-radius:4px;cursor:pointer;font-size:12px;
    }
    .toolbar button:hover { background:#3c4043; }
    .toolbar span { opacity:.7; flex:1; }
    .content {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding:16px;background:white;color:black;
      font-family: "新細明體", "PingFang TC", sans-serif;
    }
  </style>
  <div class="toolbar">
    <span>已渲染 HTML 附件 · JS 與外連已封鎖</span>
    <button class="toggle">顯示原始碼</button>
    <button class="images">載入圖片</button>
    <button class="download">下載</button>
  </div>
  <div class="content"></div>
`;
	var MARKER_ATTR = "data-html-rendered-v5";
	function findRenderTargets() {
		const targets = [];
		document.querySelectorAll("pre").forEach((pre) => {
			const container = pre.closest("div[role=\"document\"]") ?? pre.parentElement;
			if (!container || container.hasAttribute("data-html-rendered-v5")) return;
			const text = pre.textContent ?? "";
			if (!/<\s*(html|body|div|table|p|h[1-6])\b/i.test(text)) return;
			if (text.length < 100) return;
			targets.push({
				container,
				pre,
				text
			});
		});
		return targets;
	}
	function renderTarget({ container, pre, text: rawHtml }) {
		log("渲染附件,原始長度", rawHtml.length);
		container.setAttribute(MARKER_ATTR, "1");
		const cleanHtml = sanitize(rawHtml);
		log("消毒後長度", cleanHtml.length, "前 100 字:", cleanHtml.slice(0, 100));
		const fixedHtml = fixCss(cleanHtml);
		const host = document.createElement("div");
		host.style.cssText = "all:initial;display:flex;flex-direction:column;width:100%;background:white;color:black;";
		const shadow = host.attachShadow({ mode: "open" });
		bindHostHeightToContainer(host, container);
		setHTML(shadow, shadowTemplate);
		const contentDiv = shadow.querySelector(".content");
		if (!contentDiv) return;
		setHTML(contentDiv, fixedHtml);
		log("Shadow DOM 內容子元素數:", contentDiv.children.length);
		pre.style.display = "none";
		pre.parentNode?.insertBefore(host, pre);
		const zoom = findZoomControl(pre);
		setZoomHidden(zoom, true);
		wireToggle(shadow, pre, contentDiv, zoom, container);
		wireLoadImages(shadow, contentDiv);
		wireDownload(shadow, container, rawHtml);
	}
	function bindHostHeightToContainer(host, container) {
		host.style.visibility = "hidden";
		let revealed = false;
		const reveal = () => {
			if (revealed) return;
			revealed = true;
			host.style.visibility = "";
		};
		const setMaxHeight = () => {
			const h = container.clientHeight || Math.min(window.innerHeight - 200, 600);
			host.style.maxHeight = `${h}px`;
		};
		setMaxHeight();
		if (typeof ResizeObserver !== "undefined") new ResizeObserver(setMaxHeight).observe(container);
		requestAnimationFrame(() => {
			window.dispatchEvent(new Event("resize"));
			requestAnimationFrame(() => {
				setMaxHeight();
				reveal();
			});
			setTimeout(setMaxHeight, 300);
			setTimeout(reveal, 500);
		});
	}
	function findZoomControl(pre) {
		let node = pre.parentElement;
		while (node && node !== document.body) {
			const zoom = node.querySelector(".aLF-aPX-bhN");
			if (zoom) return zoom;
			node = node.parentElement;
		}
		return null;
	}
	function setZoomHidden(zoom, hidden) {
		if (!zoom) return;
		if (hidden) zoom.style.display = "none";
		else zoom.style.removeProperty("display");
	}
	function wireToggle(shadow, pre, contentDiv, zoom, container) {
		let renderModeHeight = "";
		shadow.querySelector(".toggle")?.addEventListener("click", (e) => {
			const target = e.currentTarget;
			const switchingToSource = pre.style.display === "none";
			if (switchingToSource) {
				const h = container.style.height;
				if (h) renderModeHeight = h;
				pre.style.display = "";
				contentDiv.style.display = "none";
				setZoomHidden(zoom, false);
			} else {
				pre.style.display = "none";
				contentDiv.style.display = "";
				setZoomHidden(zoom, true);
				if (renderModeHeight) container.style.height = renderModeHeight;
			}
			target.textContent = switchingToSource ? "渲染 HTML" : "顯示原始碼";
		});
	}
	function wireLoadImages(shadow, contentDiv) {
		shadow.querySelector(".images")?.addEventListener("click", (e) => {
			if (!confirm("載入圖片可能會洩漏 IP 給寄件者(email tracker)。確定載入?")) return;
			contentDiv.querySelectorAll("img[data-original-src]").forEach((img) => {
				const src = img.dataset.originalSrc;
				if (src) img.setAttribute("src", src);
				img.removeAttribute("style");
				img.alt = "";
			});
			const target = e.currentTarget;
			target.disabled = true;
			target.style.opacity = ".5";
			target.textContent = "圖片已載入";
		});
	}
	function safeFilename(raw) {
		return raw.replace(/[\x00-\x1f\x7f]/g, "").replace(/[\\/:*?"<>|]/g, "_").replace(/\.{2,}/g, ".").replace(/^\.+/, "").trim().slice(0, 200) || "attachment.html";
	}
	function wireDownload(shadow, container, rawHtml) {
		shadow.querySelector(".download")?.addEventListener("click", () => {
			const match = (container.getAttribute("aria-label") ?? "").match(/「(.+?)」/);
			const filename = safeFilename(match ? match[1] : "attachment.html");
			const blob = new Blob([rawHtml], { type: "text/html;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1e3);
			log("已下載:", filename);
		});
	}
	var DEBOUNCE_MS = 150;
	function scan() {
		const targets = findRenderTargets();
		if (targets.length) log(`找到 ${targets.length} 個目標`);
		targets.forEach(renderTarget);
	}
	function createDebouncedScan() {
		let scheduled = false;
		const ric = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 0));
		return () => {
			if (scheduled) return;
			scheduled = true;
			window.setTimeout(() => {
				ric(() => {
					scheduled = false;
					scan();
				});
			}, DEBOUNCE_MS);
		};
	}
	function startObserver() {
		const debounced = createDebouncedScan();
		new MutationObserver(debounced).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	(function bootstrap() {
		"use strict";
		startObserver();
		scan();
		setTimeout(scan, 1e3);
		setTimeout(scan, 3e3);
		log("v0.0.1 已載入");
	})();
})(DOMPurify);
