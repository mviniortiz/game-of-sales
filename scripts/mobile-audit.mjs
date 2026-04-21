import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const URL = process.argv[2] || "https://vyzon.com.br";
const outDir = path.resolve("./scripts/mobile-audit-out");
fs.mkdirSync(outDir, { recursive: true });

const events = [];
const consoleLogs = [];
const requests = [];
const failures = [];

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
        ...devices["iPhone 13"],
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
    });
    const page = await ctx.newPage();

    page.on("console", (msg) => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    page.on("pageerror", (err) => {
        failures.push({ kind: "pageerror", message: err.message });
    });
    page.on("requestfailed", (req) => {
        failures.push({
            kind: "requestfailed",
            url: req.url(),
            reason: req.failure()?.errorText,
        });
    });
    page.on("request", (req) => {
        const u = req.url();
        if (u.includes("google-analytics") || u.includes("googletagmanager") || u.includes("supabase") || u.includes("calendly")) {
            requests.push({ m: req.method(), u: u.slice(0, 160) });
        }
    });

    await page.addInitScript(() => {
        const origPush = window.dataLayer?.push;
        window.__events = [];
        window.gtag = function () {
            window.__events.push(["gtag", ...arguments]);
        };
    });

    console.log(`[load] ${URL}`);
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
    console.log(`[loaded] ${Date.now() - t0}ms`);

    await page.waitForTimeout(2500);

    const viewport = page.viewportSize();
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`[viewport] ${viewport.width}x${viewport.height} | scroll height: ${bodyHeight}`);

    await page.screenshot({ path: path.join(outDir, "01-hero.png"), fullPage: false });

    const hero = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const btns = Array.from(document.querySelectorAll("section button, section a")).slice(0, 10);
        return {
            h1: h1?.innerText.slice(0, 120),
            h1Rect: h1 ? h1.getBoundingClientRect() : null,
            firstBtns: btns.map((b) => ({
                text: (b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 60),
                rect: b.getBoundingClientRect(),
                visible: b.offsetParent !== null,
            })),
        };
    });
    console.log("[hero]", JSON.stringify(hero, null, 2).slice(0, 1200));

    const primaryCta = await page.$('button:has-text("Agendar"), button:has-text("demo"), a:has-text("Agendar")');
    if (primaryCta) {
        const box = await primaryCta.boundingBox();
        console.log(`[primary CTA box]`, box);
    }

    console.log("[scroll to #agendar-demo]");
    const scrolled = await page.evaluate(() => {
        const target = document.getElementById("agendar-demo");
        if (!target) return { found: false };
        target.scrollIntoView({ behavior: "instant", block: "start" });
        return {
            found: true,
            top: target.getBoundingClientRect().top,
            height: target.getBoundingClientRect().height,
        };
    });
    console.log("[scroll]", scrolled);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, "02-demo-section.png"), fullPage: false });

    const formFields = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("#agendar-demo input, #agendar-demo textarea"));
        return inputs.map((i) => ({
            name: i.name || i.id || i.placeholder?.slice(0, 40),
            type: i.type,
            rect: i.getBoundingClientRect(),
            visible: i.offsetParent !== null,
        }));
    });
    console.log("[form fields]", formFields);

    console.log("[fill form]");
    try {
        await page.fill('#agendar-demo input[type="text"], #agendar-demo input[name="name"], #agendar-demo input[placeholder*="nome" i]', "Teste Mobile");
        await page.fill('#agendar-demo input[type="email"]', "teste.mobile@vyzon.com.br");
        const phoneInput = await page.$('#agendar-demo input[type="tel"], #agendar-demo input[placeholder*="WhatsApp" i], #agendar-demo input[placeholder*="11" i]');
        if (phoneInput) {
            await phoneInput.fill("11999887766");
        }
        const company = await page.$('#agendar-demo input[placeholder*="empresa" i], #agendar-demo input[name="company"]');
        if (company) await company.fill("Vyzon QA");
        await page.screenshot({ path: path.join(outDir, "03-form-filled.png"), fullPage: false });
    } catch (e) {
        console.log("[fill error]", e.message);
    }

    const fullPageScreenshot = path.join(outDir, "04-full-page.png");
    await page.screenshot({ path: fullPageScreenshot, fullPage: true });
    console.log(`[full screenshot] ${fullPageScreenshot}`);

    console.log("\n===== CONSOLE =====");
    consoleLogs.slice(-25).forEach((l) => console.log(`  [${l.type}]`, l.text.slice(0, 200)));
    console.log("\n===== FAILURES =====");
    failures.forEach((f) => console.log("  ", JSON.stringify(f).slice(0, 250)));
    console.log("\n===== TRACKING REQUESTS =====");
    requests.forEach((r) => console.log(`  ${r.m} ${r.u}`));

    fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({
        url: URL,
        viewport,
        bodyHeight,
        hero,
        scrolled,
        formFields,
        consoleLogs,
        failures,
        requests,
    }, null, 2));

    await browser.close();
})();
